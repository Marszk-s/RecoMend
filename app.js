// DOM Elements
let authForm, toggleAuthBtn, logoutBtn, searchUserBtn, recommendationForm;
let tabButtons, filterButtons, typeFilterButtons;
let detailModal, userDisplay, headerProfilePicture;

// State
let currentUser = null;
let isRegistering = false;
let currentFilter = 'received';
let currentTypeFilter = 'all';
let recommendations = [];
let users = [];

// Initialize DOM elements
function initializeElements() {
    authForm = document.getElementById('authForm');
    toggleAuthBtn = document.getElementById('toggleAuth');
    logoutBtn = document.getElementById('logoutBtn');
    searchUserBtn = document.getElementById('searchUserBtn');
    recommendationForm = document.getElementById('recommendationForm');
    detailModal = document.getElementById('detailModal');
    userDisplay = document.getElementById('userDisplay');
    headerProfilePicture = document.getElementById('headerProfilePicture');
    
    tabButtons = document.querySelectorAll('.tab-btn');
    filterButtons = document.querySelectorAll('.filter-btn');
    typeFilterButtons = document.querySelectorAll('.type-filter-btn');
}

// Auth Functions
function handleAuthSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
        uniqueUsername: formData.get('uniqueUsername'),
        email: formData.get('email'),
        displayName: formData.get('displayName'),
        password: formData.get('password')
    };

    if (isRegistering) {
        // Check if username exists
        if (users.some(u => u.uniqueUsername === userData.uniqueUsername)) {
            showError('Username already exists!');
            return;
        }
        users.push(userData);
        saveUsers();
    } else {
        const user = users.find(u => 
            u.uniqueUsername === userData.uniqueUsername && 
            u.password === userData.password
        );
        if (!user) {
            showError('Invalid credentials!');
            return;
        }
        userData.friends = user.friends || [];
    }

    currentUser = userData;
    localStorage.setItem('currentUser', JSON.stringify(userData));
    checkAuth();
    updateHomePageContent();
}

function checkAuth() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        document.body.classList.remove('auth-required');
        if (authModal) authModal.classList.add('hidden');
        userDisplay.textContent = `@${currentUser.uniqueUsername}`;
        logoutBtn.classList.remove('hidden');
        headerProfilePicture.classList.remove('hidden');
        populateFriendsList();
    } else {
        document.body.classList.add('auth-required');
        if (authModal) authModal.classList.remove('hidden');
        userDisplay.textContent = '';
        logoutBtn.classList.add('hidden');
        headerProfilePicture.classList.add('hidden');
    }
}

// Friend Functions
function handleUserSearch() {
    const searchInput = document.getElementById('searchUsername');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (!searchTerm) {
        showError('Please enter a username to search');
        return;
    }

    // Load users from localStorage to ensure we have the latest data
    const storedUsers = localStorage.getItem('users');
    users = storedUsers ? JSON.parse(storedUsers) : [];

    const foundUsers = users.filter(user => 
        user.uniqueUsername.toLowerCase().includes(searchTerm) &&
        user.uniqueUsername !== currentUser.uniqueUsername &&
        !currentUser.friends?.includes(user.uniqueUsername)
    );

    if (foundUsers.length) {
        searchResults.innerHTML = foundUsers.map(user => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center">
                    <img src="https://via.placeholder.com/40" alt="${user.displayName}" class="w-10 h-10 rounded-full">
                    <div class="ml-3">
                        <p class="font-medium">@${user.uniqueUsername}</p>
                        <p class="text-sm text-gray-500">${user.displayName}</p>
                    </div>
                </div>
                <button onclick="addFriend('${user.uniqueUsername}')" 
                        class="px-4 py-2 bg-aruba text-black rounded-lg hover:bg-aruba-600">
                    Add Friend
                </button>
            </div>
        `).join('');
    } else {
        searchResults.innerHTML = '<p class="text-center text-gray-500 mt-4">No users found</p>';
    }
}

function addFriend(username) {
    if (!currentUser.friends) {
        currentUser.friends = [];
    }
    currentUser.friends.push(username);
    
    const userIndex = users.findIndex(u => u.uniqueUsername === currentUser.uniqueUsername);
    users[userIndex] = currentUser;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    saveUsers();
    
    showSuccess('Friend added successfully!');
    handleUserSearch(); // Refresh search results
    populateFriendsList(); // Refresh friends list
    updateHomePageContent(); // Update stats
}

function populateFriendsList() {
    const friendsList = document.getElementById('friendsList');
    const recipientSelect = document.getElementById('recipient');
    
    if (!currentUser.friends?.length) {
        if (friendsList) {
            friendsList.innerHTML = '<p class="text-center text-gray-500 col-span-full">No friends yet</p>';
        }
        if (recipientSelect) {
            recipientSelect.innerHTML = '<option value="">Add friends first</option>';
        }
        return;
    }

    const friendUsers = users.filter(u => currentUser.friends.includes(u.uniqueUsername));
    
    if (friendsList) {
        friendsList.innerHTML = friendUsers.map(friend => `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center">
                    <img src="https://via.placeholder.com/40" alt="${friend.displayName}" class="w-10 h-10 rounded-full">
                    <div class="ml-3">
                        <p class="font-medium">@${friend.uniqueUsername}</p>
                        <p class="text-sm text-gray-500">${friend.displayName}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (recipientSelect) {
        recipientSelect.innerHTML = `
            <option value="">Select Friend</option>
            ${friendUsers.map(friend => `
                <option value="${friend.uniqueUsername}">@${friend.uniqueUsername} (${friend.displayName})</option>
            `).join('')}
        `;
    }
}

// Recommendation Functions
function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const recommendation = {
        id: Date.now().toString(),
        sender: currentUser.uniqueUsername,
        recipient: formData.get('recipient'),
        type: formData.get('type'),
        title: formData.get('title'),
        platform: formData.get('platform'),
        description: formData.get('description'),
        timestamp: new Date().toISOString()
    };

    recommendations.push(recommendation);
    saveRecommendations();
    e.target.reset();
    showSuccess('Recommendation sent successfully!');
    updateHomePageContent();
}

function renderRecommendations() {
    const recommendationsList = document.getElementById('recommendationsList');
    if (!recommendationsList) return;

    let filtered = recommendations.filter(r => {
        const matchesFilter = currentFilter === 'received' ? 
            r.recipient === currentUser.uniqueUsername : 
            r.sender === currentUser.uniqueUsername;
        
        const matchesType = currentTypeFilter === 'all' || r.type === currentTypeFilter;
        
        return matchesFilter && matchesType;
    });

    recommendationsList.innerHTML = filtered.length ? filtered.map(r => `
        <div class="bg-white rounded-lg shadow-md p-4">
            <div class="flex justify-between items-start">
                <h3 class="font-bold">${r.title}</h3>
                <div class="flex space-x-2">
                    <button onclick="showDetailModal('${r.id}')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deleteRecommendation('${r.id}')" class="text-gray-500 hover:text-red-500">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="text-sm text-gray-500 mt-1">${r.type.charAt(0).toUpperCase() + r.type.slice(1)} • ${r.platform.charAt(0).toUpperCase() + r.platform.slice(1)}</p>
            <p class="text-sm mt-2">${r.description || 'No description provided.'}</p>
            <div class="mt-4 text-sm text-gray-500">
                ${currentFilter === 'received' ? `From: @${r.sender}` : `To: @${r.recipient}`}
            </div>
        </div>
    `).join('') : '<p class="text-center text-gray-500 col-span-full">No recommendations found</p>';
}

// Tab Navigation
function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.classList.add('hidden');
        if (tab.id === tabId) {
            tab.classList.remove('hidden');
        }
    });

    buttons.forEach(btn => {
        btn.classList.remove('text-aruba');
        btn.classList.add('text-gray-600');
        if (btn.dataset.tab === tabId) {
            btn.classList.remove('text-gray-600');
            btn.classList.add('text-aruba');
        }
    });

    if (tabId === 'view') {
        renderRecommendations();
    }
}

// Filter Functions
function updateFilterButtons() {
    filterButtons.forEach(button => {
        const isActive = button.id.toLowerCase().includes(currentFilter);
        button.classList.toggle('bg-aruba', isActive);
        button.classList.toggle('text-black', isActive);
        button.classList.toggle('bg-gray-200', !isActive);
        button.classList.toggle('text-gray-700', !isActive);
    });
    renderRecommendations();
}

function updateTypeFilterButtons() {
    typeFilterButtons.forEach(button => {
        const isActive = button.id.toLowerCase().includes(currentTypeFilter);
        button.classList.toggle('bg-aruba', isActive);
        button.classList.toggle('text-black', isActive);
        button.classList.toggle('bg-gray-200', !isActive);
        button.classList.toggle('text-gray-700', !isActive);
    });
    renderRecommendations();
}

// Home Page Content
function updateHomePageContent() {
    if (!currentUser) return;

    // Update counts
    document.getElementById('friendCount').textContent = currentUser.friends?.length || 0;
    document.getElementById('recommendationCount').textContent = recommendations.filter(r => 
        r.sender === currentUser.uniqueUsername || r.recipient === currentUser.uniqueUsername
    ).length;
    document.getElementById('pendingCount').textContent = recommendations.filter(r => 
        r.recipient === currentUser.uniqueUsername && !r.viewed
    ).length;

    // Update recent activity
    const recentActivity = document.getElementById('recentActivity');
    const activities = recommendations
        .filter(r => r.sender === currentUser.uniqueUsername || r.recipient === currentUser.uniqueUsername)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    recentActivity.innerHTML = activities.length ? activities.map(activity => `
        <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <i class="fas ${activity.type === 'movie' ? 'fa-film' : 
                          activity.type === 'series' ? 'fa-tv' : 
                          'fa-music'} text-aruba"></i>
            <div class="flex-1">
                <p class="font-medium">${activity.title}</p>
                <p class="text-sm text-gray-500">
                    ${activity.sender === currentUser.uniqueUsername ? 
                        `Recommended to @${activity.recipient}` : 
                        `Received from @${activity.sender}`}
                </p>
            </div>
            <span class="text-sm text-gray-500">
                ${new Date(activity.timestamp).toLocaleDateString()}
            </span>
        </div>
    `).join('') : '<p class="text-center text-gray-500">No recent activity</p>';

    // Update latest recommendations
    const latestRecommendations = document.getElementById('latestRecommendations');
    const latest = recommendations
        .filter(r => r.recipient === currentUser.uniqueUsername)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 4);

    latestRecommendations.innerHTML = latest.length ? latest.map(rec => `
        <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <h3 class="font-medium">${rec.title}</h3>
                <span class="text-sm text-gray-500">${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">From: @${rec.sender}</p>
            <p class="text-sm mt-2">${rec.description || 'No description provided.'}</p>
        </div>
    `).join('') : '<p class="text-center text-gray-500 col-span-full">No recommendations yet</p>';
}

// Storage Functions
function loadUsers() {
    const storedUsers = localStorage.getItem('users');
    users = storedUsers ? JSON.parse(storedUsers) : [];
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadRecommendations() {
    const storedRecommendations = localStorage.getItem('recommendations');
    recommendations = storedRecommendations ? JSON.parse(storedRecommendations) : [];
}

function saveRecommendations() {
    localStorage.setItem('recommendations', JSON.stringify(recommendations));
}

// Show detail modal
function showDetailModal(id) {
    if (!detailModal || !currentUser) return;
    
    const recommendation = recommendations.find(r => r.id === id);
    if (!recommendation) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const isReceived = recommendation.recipient === currentUser.uniqueUsername;

    modalTitle.textContent = recommendation.title;
    modalContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <span class="text-sm font-medium text-gray-500">Type:</span>
                <span class="ml-2">${recommendation.type.charAt(0).toUpperCase() + recommendation.type.slice(1)}</span>
            </div>
            <div>
                <span class="text-sm font-medium text-gray-500">Platform:</span>
                <span class="ml-2">${recommendation.platform.charAt(0).toUpperCase() + recommendation.platform.slice(1)}</span>
            </div>
            <div>
                <span class="text-sm font-medium text-gray-500">Description:</span>
                <p class="mt-1 text-gray-700">${recommendation.description || 'No description provided.'}</p>
            </div>
            <div>
                <span class="text-sm font-medium text-gray-500">${isReceived ? 'From:' : 'To:'}</span>
                <span class="ml-2">@${isReceived ? recommendation.sender : recommendation.recipient}</span>
            </div>
            <div>
                <span class="text-sm font-medium text-gray-500">Sent:</span>
                <span class="ml-2">${new Date(recommendation.timestamp).toLocaleDateString()}</span>
            </div>
        </div>
    `;

    detailModal.classList.remove('hidden');
    detailModal.classList.add('flex');
}

// Close detail modal
function closeModal() {
    if (!detailModal) return;
    detailModal.classList.remove('flex');
    detailModal.classList.add('hidden');
}

// Delete recommendation
function deleteRecommendation(id) {
    if (confirm('Are you sure you want to delete this recommendation?')) {
        recommendations = recommendations.filter(r => r.id !== id);
        saveRecommendations();
        renderRecommendations();
        updateHomePageContent();
        showSuccess('Recommendation deleted successfully!');
    }
}

// Show success message
function showSuccess(message) {
    alert(message);
}

// Show error message
function showError(message) {
    alert(message);
}

// Attach event listeners
function attachEventListeners() {
    // Auth form submission
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Toggle between login and register
    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', () => {
            isRegistering = !isRegistering;
            toggleAuthBtn.textContent = isRegistering ? 'Sign In' : 'Create Account';
            const submitBtn = authForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = isRegistering ? 'Sign Up' : 'Sign In';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            currentUser = null;
            checkAuth();
            updateHomePageContent();
            window.location.reload(); // Force page reload to reset state
        });
    }

    // Search for users
    if (searchUserBtn) {
        searchUserBtn.addEventListener('click', handleUserSearch);
    }

    // Tab navigation
    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                switchTab(button.dataset.tab);
                if (button.dataset.tab === 'home') {
                    updateHomePageContent();
                }
            });
        });
    }

    // Form submission
    if (recommendationForm) {
        recommendationForm.addEventListener('submit', handleFormSubmit);
    }

    // Filter buttons
    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentFilter = button.id.replace('filter', '').toLowerCase();
                updateFilterButtons();
                renderRecommendations();
            });
        });
    }

    // Type filter buttons
    if (typeFilterButtons) {
        typeFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentTypeFilter = button.id.replace('filter', '').toLowerCase();
                updateTypeFilterButtons();
                renderRecommendations();
            });
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    loadUsers();
    checkAuth();
    loadRecommendations();
    attachEventListeners();
    updateHomePageContent();
});
