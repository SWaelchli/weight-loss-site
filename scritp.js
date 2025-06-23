document.addEventListener('DOMContentLoaded', () => {
    const addWeightForm = document.getElementById('addWeightForm');
    const dateInput = document.getElementById('date');
    const weightInput = document.getElementById('weight');
    const notesInput = document.getElementById('notes');
    const weightTableBody = document.querySelector('#weightTable tbody');
    const weightChartCanvas = document.getElementById('weightChart');
    const noDataMessage = document.getElementById('no-data-message');

    let weightData = []; // Array to store weight entries
    let weightChart; // Variable to hold the Chart.js instance

    // Function to load data from local storage
    function loadWeightData() {
        const storedData = localStorage.getItem('weightTrackerData');
        if (storedData) {
            weightData = JSON.parse(storedData);
            // Sort data by date to ensure chart and table are chronological
            weightData.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    }

    // Function to save data to local storage
    function saveWeightData() {
        localStorage.setItem('weightTrackerData', JSON.stringify(weightData));
    }

    // Function to render the weight table
    function renderWeightTable() {
        weightTableBody.innerHTML = ''; // Clear existing entries
        if (weightData.length === 0) {
            return;
        }

        weightData.forEach((entry, index) => {
            const row = weightTableBody.insertRow();
            row.insertCell(0).textContent = entry.date;
            row.insertCell(1).textContent = entry.weight.toFixed(1); // Format to one decimal place
            row.insertCell(2).textContent = entry.notes || ''; // Display notes or empty string

            const actionCell = row.insertCell(3);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteEntry(index);
            actionCell.appendChild(deleteButton);
        });
    }

    // Function to render the progress chart
    function renderWeightChart() {
        if (weightChart) {
            weightChart.destroy(); // Destroy previous chart instance
        }

        if (weightData.length === 0) {
            weightChartCanvas.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        } else {
            weightChartCanvas.style.display = 'block';
            noDataMessage.style.display = 'none';
        }

        const dates = weightData.map(entry => entry.date);
        const weights = weightData.map(entry => entry.weight);

        const ctx = weightChartCanvas.getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM D, YYYY',
                            displayFormats: {
                                day: 'MMM D'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Weight (lbs)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label; // Show date
                            },
                            label: function(context) {
                                return 'Weight: ' + context.parsed.y + ' lbs';
                            }
                        }
                    }
                }
            }
        });
    }

    // Function to add a new weight entry
    addWeightForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const date = dateInput.value;
        const weight = parseFloat(weightInput.value);
        const notes = notesInput.value.trim();

        if (date && !isNaN(weight)) {
            // Check if an entry for this date already exists
            const existingIndex = weightData.findIndex(entry => entry.date === date);

            if (existingIndex !== -1) {
                // Update existing entry
                weightData[existingIndex] = { date, weight, notes };
            } else {
                // Add new entry
                weightData.push({ date, weight, notes });
            }

            // Sort data by date after adding/updating
            weightData.sort((a, b) => new Date(a.date) - new Date(b.date));

            saveWeightData();
            renderWeightTable();
            renderWeightChart();

            // Clear form fields
            dateInput.value = '';
            weightInput.value = '';
            notesInput.value = '';
            dateInput.focus(); // Keep focus on date for quick entry
        } else {
            alert('Please enter a valid date and weight.');
        }
    });

    // Function to delete an entry
    function deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            weightData.splice(index, 1); // Remove the entry
            saveWeightData();
            renderWeightTable();
            renderWeightChart();
        }
    }

    // Initial load and render
    loadWeightData();
    renderWeightTable();
    renderWeightChart();

    // Set today's date as default for the date input
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
});