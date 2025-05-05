// Global variables
let currentPlant = null;
let monitoringData = {};
let ecChart, phChart;
const API_URL = 'http://localhost:5000/api'; // Backend API URL

// DOM loaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initApp();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize the application
function initApp() {
    // Set today's date as default for entry form
    document.getElementById('entryDate').valueAsDate = new Date();
    
    // Initialize charts
    initCharts();
    
    // Check if there's a saved plant in local storage
    const savedPlant = localStorage.getItem('currentPlant');
    if (savedPlant) {
        currentPlant = savedPlant;
        selectPlant(currentPlant, false);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('homeLink').addEventListener('click', showLandingPage);
    document.getElementById('dashboardLink').addEventListener('click', function() {
        if (currentPlant) {
            showMonitoringPage();
        } else {
            showLandingPage();
        }
    });
    document.getElementById('backToHomeBtn').addEventListener('click', showLandingPage);
    
    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);
    
    // Plant selection
    const plantButtons = document.querySelectorAll('.select-plant-btn');
    plantButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const plantCard = this.closest('.plant-card');
            selectPlant(plantCard.dataset.plant, true);
        });
    });
    
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Form submission
    document.getElementById('monitoringForm').addEventListener('submit', handleFormSubmit);
    
    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoUpload');
    
    uploadArea.addEventListener('click', function() {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', handleImageUpload);
    
    // Filter button
    document.getElementById('applyFilterBtn').addEventListener('click', applyDateFilter);
    
    // Handle drag and drop for the upload area
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById('imagePreview');
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Add event listener for the about page
    document.getElementById('aboutLink').addEventListener('click', function() {
        // Show about information
        alert('HydroMonitor v1.0\nA simple tool for tracking your hydroponic plant growth and health parameters.\n\n© 2025 HydroMonitor');
    });
    
    // Add window event listener to handle mobile menu close on resize
    window.addEventListener('resize', function() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (window.innerWidth > 600 && mobileMenu.classList.contains('show')) {
            mobileMenu.classList.remove('show');
        }
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

// Show landing page
function showLandingPage() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('monitoringPage').style.display = 'none';
}

// Show monitoring page
function showMonitoringPage() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('monitoringPage').style.display = 'block';
    
    // Reset to first tab
    switchTab('entryForm');
    
    // Fetch and update data
    fetchMonitoringData();
}

// Select a plant
function selectPlant(plantType, showMonitoring = true) {
    currentPlant = plantType;
    localStorage.setItem('currentPlant', plantType);
    
    // Update plant title and description
    const plantTitle = document.getElementById('plantTitle');
    const plantDescription = document.getElementById('plantDescription');
    
    switch(plantType) {
        case 'water spinach':
            plantTitle.textContent = 'water spinach Monitoring';
            plantDescription.textContent = 'Track your hydroponic water spinach growth and health parameters';
            break;
        case 'sage':
            plantTitle.textContent = 'sage Monitoring';
            plantDescription.textContent = 'Monitor your hydroponic sage growth and health parameters';
            break;
        case 'chili':
            plantTitle.textContent = 'chili Monitoring';
            plantDescription.textContent = 'Track your hydroponic chili growth and health parameters';
            break;
    }
    
    // Show monitoring page if needed
    if (showMonitoring) {
        showMonitoringPage();
    }
}

// Switch between tabs
function switchTab(tabId) {
    // Update active tab
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Show active content
    const contents = document.querySelectorAll('.monitoring-content');
    contents.forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // If switching to analytics tab, fetch and update analytics
    if (tabId === 'analytics') {
        fetchAnalyticsData();
    }
    
    // If switching to view data tab, update table
    if (tabId === 'viewData') {
        updateDataTable();
    }
}

// Fetch monitoring data from the API
// Fetch monitoring data from the API
async function fetchMonitoringData() {
    if (!currentPlant) return;
    try {
        console.log(`Fetching data from: ${API_URL}/entries/${currentPlant}`);
        const response = await fetch(`${API_URL}/entries/${currentPlant}`);
        console.log('Response status:', response.status);
        if (!response.ok) {
            console.log('Response not OK:', await response.text());
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched data:', data);
        monitoringData[currentPlant] = data;
        updateDataTable();
        updateCharts();
        updateSummaryStats();
    } catch (error) {
        console.error('Error fetching monitoring data:', error.message);
        alert('Failed to load data. Please try again later.');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (!currentPlant) {
        alert('Please select a plant first');
        return;
    }
    const date = document.getElementById('entryDate').value;
    const ecValue = parseFloat(document.getElementById('ecValue').value);
    const phValue = parseFloat(document.getElementById('phValue').value);
    const notes = document.getElementById('notes').value;
    const imagePreview = document.getElementById('imagePreview');
    const formData = new FormData();
    formData.append('plantType', currentPlant);
    formData.append('date', date);
    formData.append('ec', ecValue);
    formData.append('ph', phValue);
    formData.append('notes', notes);
    const photoInput = document.getElementById('photoUpload');
    if (photoInput.files.length > 0) {
        formData.append('photo', photoInput.files[0]);
    } else if (imagePreview.src && imagePreview.style.display !== 'none' && imagePreview.src.startsWith('data:image')) {
        formData.append('photoData', imagePreview.src);
    }
    try {
        const submitBtn = document.querySelector('#monitoringForm button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        console.log('Submitting data to:', `${API_URL}/entries`);
        const response = await fetch(`${API_URL}/entries`, {
            method: 'POST',
            body: formData
        });
        console.log('Response status:', response.status);
        if (!response.ok) {
            console.log('Response not OK:', await response.text());
            throw new Error('Failed to save entry');
        }
        document.getElementById('monitoringForm').reset();
        document.getElementById('entryDate').valueAsDate = new Date();
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        await fetchMonitoringData();
        alert('Entry saved successfully!');
        switchTab('viewData');
    } catch (error) {
        console.error('Error saving entry:', error.message);
        alert('Failed to save entry. Please try again.');
    } finally {
        const submitBtn = document.querySelector('#monitoringForm button[type="submit"]');
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
}

async function fetchAnalyticsData() {
    if (!currentPlant) return;
    try {
        console.log(`Fetching analytics from: ${API_URL}/analytics/${currentPlant}`);
        const response = await fetch(`${API_URL}/analytics/${currentPlant}`);
        console.log('Response status:', response.status);
        if (!response.ok) {
            console.log('Response not OK:', await response.text());
            throw new Error('Failed to fetch analytics data');
        }
        const analytics = await response.json();
        document.getElementById('avgEc').textContent = analytics.avgEc.toFixed(2) + ' μS/cm';
        document.getElementById('avgPh').textContent = analytics.avgPh.toFixed(2);
        document.getElementById('totalEntries').textContent = analytics.totalEntries;
        updateCharts();
    } catch (error) {
        console.error('Error fetching analytics data:', error.message);
        alert('Failed to load analytics. Please try again later.');
    }
}
// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    const imagePreview = document.getElementById('imagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Update data table
function updateDataTable() {
    const tableBody = document.getElementById('dataTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    // Clear existing data
    tableBody.innerHTML = '';
    
    if (currentPlant && monitoringData[currentPlant] && monitoringData[currentPlant].length > 0) {
        // Add data rows
        monitoringData[currentPlant].forEach(entry => {
            const row = document.createElement('tr');
            
            // Format date
            const dateObj = new Date(entry.date);
            const formattedDate = dateObj.toLocaleDateString();
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${entry.ec}</td>
                <td>${entry.ph}</td>
                <td>${entry.photoUrl ? `<img src="${API_URL.replace('/api', '')}${entry.photoUrl}" class="photo-thumbnail">` : 'No photo'}</td>
                <td>${entry.notes || 'No notes'}</td>
                <td>
                    <button class="btn btn-danger delete-btn" data-id="${entry._id}">Delete</button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                deleteEntry(this.dataset.id);
            });
        });
        
        noDataMessage.style.display = 'none';
    } else {
        noDataMessage.style.display = 'block';
    }
}

// Delete an entry
async function deleteEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            const response = await fetch(`${API_URL}/entries/${entryId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete entry');
            }
            
            // Refresh data
            await fetchMonitoringData();
            
            alert('Entry deleted successfully!');
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete entry. Please try again.');
        }
    }
}

// Initialize charts
function initCharts() {
    const ecCtx = document.getElementById('ecChart').getContext('2d');
    const phCtx = document.getElementById('phChart').getContext('2d');
    
    // EC Chart
    ecChart = new Chart(ecCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'EC Value (μS/cm)',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // pH Chart
    phChart = new Chart(phCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'pH Value',
                data: [],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update charts with current data
function updateCharts() {
    if (currentPlant && monitoringData[currentPlant] && monitoringData[currentPlant].length > 0) {
        // Sort data by date (oldest first)
        const sortedData = [...monitoringData[currentPlant]].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        // Prepare data for charts
        const labels = sortedData.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString();
        });
        
        const ecData = sortedData.map(entry => entry.ec);
        const phData = sortedData.map(entry => entry.ph);
        
        // Update EC chart
        ecChart.data.labels = labels;
        ecChart.data.datasets[0].data = ecData;
        ecChart.update();
        
        // Update pH chart
        phChart.data.labels = labels;
        phChart.data.datasets[0].data = phData;
        phChart.update();
    } else {
        // Clear charts if no data
        ecChart.data.labels = [];
        ecChart.data.datasets[0].data = [];
        ecChart.update();
        
        phChart.data.labels = [];
        phChart.data.datasets[0].data = [];
        phChart.update();
    }
}

// Update summary statistics
function updateSummaryStats() {
    const avgEc = document.getElementById('avgEc');
    const avgPh = document.getElementById('avgPh');
    const totalEntries = document.getElementById('totalEntries');
    
    if (currentPlant && monitoringData[currentPlant] && monitoringData[currentPlant].length > 0) {
        // Calculate averages
        const ecSum = monitoringData[currentPlant].reduce((sum, entry) => sum + entry.ec, 0);
        const phSum = monitoringData[currentPlant].reduce((sum, entry) => sum + entry.ph, 0);
        const count = monitoringData[currentPlant].length;
        
        avgEc.textContent = (ecSum / count).toFixed(2) + ' μS/cm';
        avgPh.textContent = (phSum / count).toFixed(2);
        totalEntries.textContent = count;
    } else {
        avgEc.textContent = '-';
        avgPh.textContent = '-';
        totalEntries.textContent = '0';
    }
}

// Apply date filter to data table
async function applyDateFilter() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    
    if (!currentPlant) return;
    
    try {
        let url = `${API_URL}/entries/${currentPlant}/filter`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to filter data');
        }
        
        const data = await response.json();
        
        // Update table with filtered data
        const tableBody = document.getElementById('dataTableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        
        // Clear existing data
        tableBody.innerHTML = '';
        
        if (data.length > 0) {
            // Temporarily replace monitoring data for the table update
            const originalData = monitoringData[currentPlant];
            monitoringData[currentPlant] = data;
            
            // Update table
            updateDataTable();
            
            // Restore original data
            monitoringData[currentPlant] = originalData;
            
            noDataMessage.style.display = 'none';
        } else {
            noDataMessage.style.display = 'block';
            noDataMessage.innerHTML = '<p>No data found for the selected date range.</p>';
        }
    } catch (error) {
        console.error('Error applying filter:', error);
        alert('Failed to filter data. Please try again.');
    }
}

// Export data as CSV
function exportDataAsCSV() {
    if (!currentPlant) {
        alert('Please select a plant first');
        return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = `${API_URL}/export/${currentPlant}`;
    link.download = `${currentPlant}_monitoring_data.csv`;
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Add export button to view data tab
document.addEventListener('DOMContentLoaded', function() {
    const viewDataTab = document.getElementById('viewData');
    const exportButton = document.createElement('button');
    exportButton.className = 'btn';
    exportButton.textContent = 'Export to CSV';
    exportButton.style.marginTop = '20px';
    exportButton.addEventListener('click', exportDataAsCSV);
    
    viewDataTab.appendChild(exportButton);
});