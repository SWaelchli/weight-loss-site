import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, addDoc, getDocs, onSnapshot, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

// --- Firebase Initialization ---
// The actual Firebase configuration for your project is now hardcoded here.
const firebaseConfig = {
  apiKey: "AIzaSyBstQSGGPn9O5i91lOHqpykQuBqqt9yQhY",
  authDomain: "weight-loss-tracker-app-ff93a.firebaseapp.com",
  projectId: "weight-loss-tracker-app-ff93a",
  storageBucket: "weight-loss-tracker-app-ff93a.firebasestorage.app",
  messagingSenderId: "419438071189",
  appId: "1:419438071189:web:6723d25c037ce03e63fa9c"
};

const appId = firebaseConfig.projectId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Auth Context for User Management ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
            }
            setLoadingAuth(false);
        });

        const signInWithCanvasToken = async () => {
            if (initialAuthToken && !currentUser) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                } catch (error) {
                    console.error("Error signing in with custom token (Canvas):", error);
                }
            }
        };

        if (loadingAuth) {
             signInWithCanvasToken();
        }

        return () => unsubscribe();
    }, [initialAuthToken, currentUser, loadingAuth]);

    return (
        <AuthContext.Provider value={{ currentUser, loadingAuth, auth }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Custom Message/Confirm Box Functions (replaces alert/confirm) ---
const showCustomMessage = (message, type) => {
    const messageBox = document.createElement('div');
    messageBox.className = `fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    setTimeout(() => {
        messageBox.remove();
    }, 3000);
};

const showCustomConfirm = (message, onConfirm) => {
    const confirmBox = document.createElement('div');
    confirmBox.className = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg shadow-xl z-50 text-center";
    confirmBox.innerHTML = `
        <p class="text-lg font-semibold mb-4">${message}</p>
        <div class="flex justify-center space-x-4">
            <button id="confirmYes" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Yes</button>
            <button id="confirmNo" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">No</button>
        </div>
    `;
    document.body.appendChild(confirmBox);

    document.getElementById('confirmYes').onclick = () => {
        onConfirm(true);
        confirmBox.remove();
    };
    document.getElementById('confirmNo').onclick = () => {
        onConfirm(false);
        confirmBox.remove();
    };
};

// --- Login Page Component ---
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { auth } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
                    Login to Your Weight Loss Journey
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                            Email:
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                            Password:
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="********"
                            required
                        />
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm italic text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-105"
                    >
                        Login
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-600 text-sm">
                    Accounts are managed by the administrator.
                </p>
            </div>
        </div>
    );
};

// --- Dashboard Component (Main App Content) ---
const Dashboard = ({ navigateTo }) => {
    const { currentUser, loadingAuth, auth } = useContext(AuthContext);
    const [date, setDate] = useState('');
    const [weight, setWeight] = useState('');
    const [notes, setNotes] = useState('');
    const [targetCalories, setTargetCalories] = useState('');
    const [weightData, setWeightData] = useState([]);
    const [loadingWeightData, setLoadingWeightData] = useState(true); // Specific loading for weight
    const [loadingUserProfile, setLoadingUserProfile] = useState(true); // Specific loading for profile
    const [error, setError] = useState('');
    const chartRef = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    const userId = currentUser?.uid;
    const userProfileDocRef = userId ? doc(db, `artifacts/${appId}/users/${userId}/profile/userProfile`) : null;


    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
    }, []);

    // Effect for fetching ALL user-specific data (weight entries & user profile)
    useEffect(() => {
        if (!userId) {
            setWeightData([]);
            setLoadingWeightData(false);
            setLoadingUserProfile(false);
            return;
        }

        setLoadingWeightData(true);
        setLoadingUserProfile(true);
        setError('');

        // Fetch weight data using onSnapshot (real-time listener)
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/weightEntries`));
        const unsubscribeWeight = onSnapshot(q, (snapshot) => {
            const fetchedData = [];
            snapshot.forEach((doc) => {
                fetchedData.push({ id: doc.id, ...doc.data() });
            });
            fetchedData.sort((a, b) => new Date(a.date) - new Date(b.date));
            setWeightData(fetchedData);
            setLoadingWeightData(false); // Set weight data loading to false
        }, (err) => {
            console.error("Error fetching weight data:", err);
            setError("Failed to load weight data. Please try again.");
            setLoadingWeightData(false); // Set to false even on error
        });

        // Fetch user profile data using getDoc (one-time fetch)
        const fetchUserProfile = async () => {
            if (userProfileDocRef) {
                try {
                    const docSnap = await getDoc(userProfileDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setTargetCalories(data.targetCalories || '');
                        // Also ensure height is loaded for BMI component if needed later
                        // This Dashboard doesn't use height, but it's good practice for profile
                    } else {
                        // Profile document doesn't exist yet, which is fine for new users
                        setTargetCalories('');
                    }
                } catch (err) {
                    console.error("Error loading user profile:", err);
                    setError("Failed to load user profile data.");
                } finally {
                    setLoadingUserProfile(false); // Always set profile loading to false
                }
            } else {
                setLoadingUserProfile(false); // No userProfileDocRef (e.g., userId is null), so stop loading profile
            }
        };
        fetchUserProfile();


        // Cleanup function for useEffect
        return () => {
            unsubscribeWeight(); // Unsubscribe from the real-time weight listener
            // No explicit cleanup needed for getDoc, as it's a one-time fetch
        };
    }, [userId, userProfileDocRef]); // Dependencies: userId and userProfileDocRef


    useEffect(() => {
        const Chart = window.Chart;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        if (weightData.length === 0) {
            return;
        }

        const dates = weightData.map(entry => entry.date);
        const weights = weightData.map(entry => entry.weight);

        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false,
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointBorderColor: 'rgb(75, 192, 192)',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM d,yyyy',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#555',
                            font: { size: 14 }
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Weight (lbs)',
                            color: '#555',
                            font: { size: 14 }
                        },
                        ticks: {
                            color: '#666'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return 'Weight: ' + context.parsed.y + ' lbs';
                            },
                            afterBody: function(context) {
                                const entry = weightData.find(d => d.date === context[0].label);
                                return entry && entry.notes ? `Notes: ${entry.notes}` : '';
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 10,
                        cornerRadius: 8,
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }, [weightData]);

    const addWeightEntry = async (e) => {
        e.preventDefault();
        setError('');

        if (!userId) {
            setError("You must be logged in to add weight entries.");
            return;
        }

        const newDate = date;
        const newWeight = parseFloat(weight);
        const newNotes = notes.trim();

        if (newDate && !isNaN(newWeight)) {
            try {
                const q = query(
                    collection(db, `artifacts/${appId}/users/${userId}/weightEntries`),
                    where("date", "==", newDate)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docToUpdate = querySnapshot.docs[0];
                    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/weightEntries`, docToUpdate.id), {
                        date: newDate,
                        weight: newWeight,
                        notes: newNotes
                    }, { merge: true });
                    showCustomMessage('Entry updated successfully!', 'success');
                } else {
                    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/weightEntries`), {
                        date: newDate,
                        weight: newWeight,
                        notes: newNotes
                    });
                    showCustomMessage('Entry added successfully!', 'success');
                }

                setDate(
                    (today => {
                        const y = today.getFullYear();
                        const m = (today.getMonth() + 1).toString().padStart(2, '0');
                        const d = today.getDate().toString().padStart(2, '0');
                        return `${y}-${m}-${d}`;
                    })(new Date())
                );
                setWeight('');
                setNotes('');
                setError('');
            } catch (err) {
                console.error("Error adding/updating document:", err);
                setError("Failed to save entry. Please try again.");
            }
        } else {
            setError('Please enter a valid date and weight.');
        }
    };

    const deleteWeightEntry = async (id) => {
        if (!userId) {
            setError("You must be logged in to delete entries.");
            return;
        }
        showCustomConfirm('Are you sure you want to delete this entry?', async (confirmed) => {
            if (confirmed) {
                try {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/weightEntries`, id));
                    setError('');
                    showCustomMessage('Entry deleted successfully.', 'success');
                } catch (err) {
                    console.error("Error deleting document:", err);
                    setError("Failed to delete entry. Please try again.");
                }
            }
        });
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("User logged out");
            showCustomMessage('Logged out successfully.', 'success');
        } catch (err) {
            console.error("Error logging out:", err);
            setError("Failed to log out. Please try again.");
        }
    };

    const handleSaveTargetCalories = async () => {
        setError('');
        if (!userId) {
            setError("You must be logged in to save target calories.");
            return;
        }
        if (targetCalories === '' || isNaN(parseFloat(targetCalories)) || parseFloat(targetCalories) <= 0) {
            setError("Please enter a valid positive number for target calories.");
            return;
        }

        try {
            if (userProfileDocRef) {
                await setDoc(userProfileDocRef, { targetCalories: parseFloat(targetCalories) }, { merge: true });
                showCustomMessage('Target calories saved!', 'success');
            }
        } catch (err) {
            console.error("Error saving target calories:", err);
            setError("Failed to save target calories. Please try again.");
        }
    };

    // Combine all loading states for the Dashboard
    const isDashboardLoading = loadingAuth || loadingWeightData || loadingUserProfile;

    if (isDashboardLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    <p className="text-gray-700 text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-inter">
            <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">Our Weight Loss Journey</h1>
                    <div className="flex items-center space-x-4">
                        {currentUser && currentUser.uid !== 'default-user-id' && (
                            <span className="text-sm bg-blue-700 px-3 py-1 rounded-full opacity-80">
                                User ID: {userId}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="bg-white text-blue-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-gray-100 transition duration-300 ease-in-out"
                        >
                            Logout
                        </button>
                    </div>
                </div>
                {/* Navigation Bar */}
                <nav className="bg-blue-800 text-white mt-4 py-2 shadow-md">
                    <div className="max-w-4xl mx-auto flex justify-around items-center">
                        <button
                            onClick={() => navigateTo('dashboard')}
                            className="px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200 text-lg font-medium"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigateTo('bmiCalculator')}
                            className="px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200 text-lg font-medium"
                        >
                            BMI Calculator
                        </button>
                        {/* Future navigation items can go here */}
                    </div>
                </nav>
            </header>

            <main className="flex-grow max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg my-8">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

                {/* Target Calories Section */}
                <section className="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Your Daily Goals</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div>
                            <label htmlFor="targetCalories" className="block text-gray-700 text-sm font-semibold mb-2">
                                Target Daily Calories (kcal):
                            </label>
                            <input
                                type="number"
                                id="targetCalories"
                                value={targetCalories}
                                onChange={(e) => setTargetCalories(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                placeholder="e.g., 2000"
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <button
                                onClick={handleSaveTargetCalories}
                                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Save Target
                            </button>
                        </div>
                    </div>
                </section>


                {/* Add Weight Section */}
                <section className="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Add Your Weight</h2>
                    <form onSubmit={addWeightEntry} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="date" className="block text-gray-700 text-sm font-semibold mb-2">
                                Date:
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="weight" className="block text-gray-700 text-sm font-semibold mb-2">
                                Weight (lbs):
                            </label>
                            <input
                                type="number"
                                id="weight"
                                step="0.1"
                                placeholder="e.g., 180.5"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="notes" className="block text-gray-700 text-sm font-semibold mb-2">
                                Notes (optional):
                            </label>
                            <textarea
                                id="notes"
                                rows="3"
                                placeholder="How was your day? What did you eat?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-y"
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Add Entry
                            </button>
                        </div>
                    </form>
                </section>

                <section className="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Our Progress</h2>
                    {weightData.length > 0 ? (
                        <div className="relative h-80">
                            <canvas ref={chartRef}></canvas>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center italic mt-4">No data yet. Add your first weight entry!</p>
                    )}
                </section>

                <section className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Weight History</h2>
                    {weightData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                                        <th className="py-3 px-6 text-left">Date</th>
                                        <th className="py-3 px-6 text-left">Weight (lbs)</th>
                                        <th className="py-3 px-6 text-left">Notes</th>
                                        <th className="py-3 px-6 text-left">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 text-sm font-light">
                                    {weightData.map((entry) => (
                                        <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="py-3 px-6 text-left whitespace-nowrap">{entry.date}</td>
                                            <td className="py-3 px-6 text-left">{entry.weight.toFixed(1)}</td>
                                            <td className="py-3 px-6 text-left">{entry.notes || '-'}</td>
                                            <td className="py-3 px-6 text-left">
                                                <button
                                                    onClick={() => deleteWeightEntry(entry.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center italic mt-4">No entries to display.</p>
                    )}
                </section>
            </main>

            <footer>
                <p className="text-sm">&copy; 2025 Our Journey. All rights reserved.</p>
            </footer>
        </div>
    );
};

// --- BMI Calculator Component ---
const BMICalculator = ({ navigateTo }) => {
    const { currentUser } = useContext(AuthContext);
    const [heightFt, setHeightFt] = useState('');
    const [heightIn, setHeightIn] = useState('');
    const [bmi, setBmi] = useState(null);
    const [bmiCategory, setBmiCategory] = useState('');
    const [error, setError] = useState('');
    const [loadingHeight, setLoadingHeight] = useState(true);

    const userId = currentUser?.uid;
    const userProfileDocRef = userId ? doc(db, `artifacts/${appId}/users/${userId}/profile/userProfile`) : null;

    // Load height from Firestore
    useEffect(() => {
        if (!userProfileDocRef) {
            setLoadingHeight(false);
            return;
        }

        const fetchHeight = async () => {
            try {
                const docSnap = await getDoc(userProfileDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setHeightFt(data.heightFt || '');
                    setHeightIn(data.heightIn || '');
                }
            } catch (err) {
                console.error("Error loading height:", err);
                setError("Failed to load height. Please try again.");
            } finally {
                setLoadingHeight(false);
            }
        };
        fetchHeight();
    }, [userProfileDocRef]);

    const handleCalculateBMI = async () => {
        setError('');
        if (heightFt === '' || heightIn === '' || isNaN(parseFloat(heightFt)) || isNaN(parseFloat(heightIn))) {
            setError('Please enter valid height in feet and inches.');
            setBmi(null);
            setBmiCategory('');
            return;
        }

        const totalInches = (parseFloat(heightFt) * 12) + parseFloat(heightIn);
        let currentWeight;
        
        createInputPrompt("Please enter your current weight in pounds for BMI calculation:", (confirmed, weightValue) => {
            if (confirmed) {
                const parsedWeight = parseFloat(weightValue);

                if (isNaN(parsedWeight) || parsedWeight <= 0) {
                    setError("Current weight is required and must be a positive number for BMI calculation.");
                    setBmi(null);
                    setBmiCategory('');
                    return;
                }
                currentWeight = parsedWeight;

                if (totalInches <= 0 || currentWeight <= 0) {
                    setError('Height and weight must be positive values.');
                    setBmi(null);
                    setBmiCategory('');
                    return;
                }

                const heightMeters = totalInches * 0.0254;
                const weightKg = currentWeight * 0.453592;
                const calculatedBmi = weightKg / (heightMeters * heightMeters);
                setBmi(calculatedBmi);

                let category = '';
                if (calculatedBmi < 18.5) {
                    category = 'Underweight';
                } else if (calculatedBmi >= 18.5 && calculatedBmi < 24.9) {
                    category = 'Normal weight';
                } else if (calculatedBmi >= 25 && calculatedBmi < 29.9) {
                    category = 'Overweight';
                } else {
                    category = 'Obesity';
                }
                setBmiCategory(category);

                if (userProfileDocRef) {
                    setDoc(userProfileDocRef, { heightFt: parseFloat(heightFt), heightIn: parseFloat(heightIn) }, { merge: true })
                        .then(() => showCustomMessage('Height saved successfully!', 'success'))
                        .catch((err) => {
                            console.error("Error saving height:", err);
                            setError("Failed to save height. Please try again.");
                        });
                }
            } else {
                setError("BMI calculation cancelled. Current weight not provided.");
                setBmi(null);
                setBmiCategory('');
            }
        }, true);
    };

    const createInputPrompt = (message, onConfirmCallback, showInput = false) => {
        const promptBox = document.createElement('div');
        promptBox.className = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg shadow-xl z-50 text-center";
        promptBox.innerHTML = `
            <p class="text-lg font-semibold mb-4">${message}</p>
            ${showInput ? '<input type="number" id="bmiWeightInput" class="w-full p-2 border rounded mb-4" placeholder="Enter weight in lbs">' : ''}
            <div class="flex justify-center space-x-4">
                <button id="promptOk" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">OK</button>
                <button id="promptCancel" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
            </div>
        `;
        document.body.appendChild(promptBox);

        document.getElementById('promptOk').onclick = () => {
            const weightInput = document.getElementById('bmiWeightInput');
            onConfirmCallback(true, weightInput ? weightInput.value : null);
            promptBox.remove();
        };
        document.getElementById('promptCancel').onclick = () => {
            onConfirmCallback(false, null);
            promptBox.remove();
        };
    };


    if (loadingHeight) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    <p className="text-gray-700 text-lg">Loading BMI data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg">
            <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg mb-8 rounded-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">BMI Calculator</h1>
                    <button
                        onClick={() => navigateTo('dashboard')}
                        className="bg-white text-blue-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-gray-100 transition duration-300 ease-in-out"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </header>
            <main>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}
                <section className="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Calculate Your BMI</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="heightFt" className="block text-gray-700 text-sm font-semibold mb-2">
                                Height (Feet):
                            </label>
                            <input
                                type="number"
                                id="heightFt"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                placeholder="e.g., 5"
                            />
                        </div>
                        <div>
                            <label htmlFor="heightIn" className="block text-gray-700 text-sm font-semibold mb-2">
                                Height (Inches):
                            </label>
                            <input
                                type="number"
                                id="heightIn"
                                value={heightIn}
                                onChange={(e) => setHeightIn(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                placeholder="e.g., 8 (for 5'8'')"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                onClick={handleCalculateBMI}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Calculate BMI
                            </button>
                        </div>
                    </div>
                </section>

                {bmi && (
                    <section className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your BMI:</h2>
                        <p className="text-5xl font-extrabold text-blue-700 mb-2">
                            {bmi.toFixed(2)}
                        </p>
                        <p className="text-xl text-gray-700">
                            Category: <span className="font-semibold">{bmiCategory}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-4">
                            BMI Categories:
                            <br/>Underweight = {'<'}18.5
                            <br/>Normal weight = 18.5–24.9
                            <br/>Overweight = 25–29.9
                            <br/>Obesity = {'\u2265'}30
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

const AppContent = () => {
    const { currentUser, loadingAuth } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('dashboard');

    const navigateTo = (page) => {
        setCurrentPage(page);
    };

    // Overall loading state for the entire application
    const isAppLoading = loadingAuth; // Now AppContent only cares about auth loading

    if (isAppLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    <p className="text-gray-700 text-lg">Loading application...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginPage />;
    }

    let PageComponent;
    switch (currentPage) {
        case 'dashboard':
            PageComponent = <Dashboard navigateTo={navigateTo} />;
            break;
        case 'bmiCalculator':
            PageComponent = <BMICalculator navigateTo={navigateTo} />;
            break;
        default:
            PageComponent = <Dashboard navigateTo={navigateTo} />;
            break;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-inter">
            {PageComponent}
            <style>
                {/* Custom styles for loader */}
                {`
                .loader {
                    border-top-color: #3498db;
                    -webkit-animation: spinner 1.5s linear infinite;
                    animation: spinner 1.5s linear infinite;
                }

                @-webkit-keyframes spinner {
                    0% { -webkit-transform: rotate(0deg); }
                    100% { -webkit-transform: rotate(360deg); }
                }

                @keyframes spinner {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Root element with ID 'root' not found in the HTML.");
}
