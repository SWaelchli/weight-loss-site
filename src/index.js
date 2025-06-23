import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, addDoc, getDocs, onSnapshot, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

// --- Firebase Initialization ---
// Firebase configuration - API Key is now loaded from Netlify Environment Variables.
// This ensures the key is not hardcoded in the public repository for security.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY, // This value will be injected by Netlify during build
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
const Dashboard = () => {
    const { currentUser, loadingAuth, auth } = useContext(AuthContext);
    const [date, setDate] = useState('');
    const [weight, setWeight] = useState('');
    const [notes, setNotes] = useState('');
    const [weightData, setWeightData] = useState([]);
    const [loadingWeightData, setLoadingWeightData] = useState(true);
    const [loadingUserProfile, setLoadingUserProfile] = useState(true);
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

        const q = query(collection(db, `artifacts/${appId}/users/${userId}/weightEntries`));
        const unsubscribeWeight = onSnapshot(q, (snapshot) => {
            const fetchedData = [];
            snapshot.forEach((doc) => {
                fetchedData.push({ id: doc.id, ...doc.data() });
            });
            fetchedData.sort((a, b) => new Date(a.date) - new Date(b.date));
            setWeightData(fetchedData);
            setLoadingWeightData(false);
        }, (err) => {
            console.error("Error fetching weight data:", err);
            setError("Failed to load weight data. Please try again.");
            setLoadingWeightData(false);
        });

        const fetchUserProfile = async () => {
            if (userProfileDocRef) {
                try {
                    const docSnap = await getDoc(userProfileDocRef);
                    if (docSnap.exists()) {
                        // Data loaded, but not set to state for this version
                    }
                } catch (err) {
                    console.error("Error loading user profile:", err);
                    setError("Failed to load user profile data.");
                } finally {
                    setLoadingUserProfile(false);
                }
            } else {
                setLoadingUserProfile(false);
            }
        };
        fetchUserProfile();

        return () => {
            unsubscribeWeight();
        };
    }, [userId, userProfileDocRef]);


    useEffect(() => {
        const Chart = window.Chart;

        if (chartRef.current && weightData.length > 0) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
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
        } else if (chartRef.current && weightData.length === 0) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        }
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
            </header>

            <main className="flex-grow max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg my-8">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

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
    // Removed currentPage state as navigation is no longer present.

    // Overall loading state for the entire application
    const isAppLoading = loadingAuth;

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

    // Directly render Dashboard as there are no other pages in this version
    return <Dashboard />;
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
