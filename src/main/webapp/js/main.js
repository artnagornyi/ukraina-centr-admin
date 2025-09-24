// js/main.js
import { db, auth, signInAnonymously, onAuthStateChanged } from './firebase.js';
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state, DIRECTORIES } from './state.js';
import { initMainView, renderMainPage } from './views/mainView.js';
import { initParcelsView, renderParcelsPage } from './views/parcelsView.js';
import { initDirectoriesView, renderDirectoryPage } from './views/directoriesView.js';
import { initReportsView, renderReportsPage, updateReportView } from './views/reportsView.js';
import { selectDefaultTrip, setupTripSelector, selectNextFutureTrip, updateTripSelectorDisplays } from './tripSelector.js';

// --- UI ELEMENTS (Global) ---
const authOverlay = document.getElementById('auth-overlay');
const authStatusText = document.getElementById('auth-status-text');
const appView = document.getElementById('app-view');
const navButtons = document.querySelectorAll('.nav-btn');
const mainPageView = document.getElementById('main-page-view');
const parcelsPageView = document.getElementById('parcels-page-view');
const directoriesPageView = document.getElementById('directories-page-view');
const reportsPageView = document.getElementById('reports-page-view');
const homeLink = document.getElementById('home-link');

// --- AUTHENTICATION & INITIALIZATION ---
function authenticateUser() {
    signInAnonymously(auth).catch(error => {
        console.error("Authentication Error:", error);
        if (error.code === 'auth/admin-restricted-operation') {
            authStatusText.innerHTML = `<b>Помилка:</b> Анонімний вхід вимкнено. <br/>Увімкніть його в налаштуваннях Firebase: Authentication -> Sign-in method.`;
        } else {
            authStatusText.textContent = `Помилка автентифікації: ${error.message}`;
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        authStatusText.textContent = 'Автентифікація успішна. Завантаження даних...';
        await initializeAppLogic();
        authOverlay.classList.add('hidden');
        appView.classList.remove('hidden');
    } else {
        authOverlay.classList.remove('hidden');
        appView.classList.add('hidden');
    }
});

async function initializeAppLogic() {
    setupGlobalEventListeners();
    initMainView();
    initParcelsView();
    initDirectoriesView();
    initReportsView();

    // Set up trip selectors for each relevant page
    setupTripSelector('main', renderMainPage);
    setupTripSelector('parcels', renderParcelsPage);
    setupTripSelector('reports', renderReportsPage);

    await setupRealtimeListeners();
    switchView('main');
}

async function setupRealtimeListeners() {
    const collectionsToListen = ['Passengers', 'Parcels', 'Clients', 'Users', 'Agents', 'Buses', 'Drivers', 'Country', 'Stations', 'Towns', 'Routes', 'Trips'];

    const promises = collectionsToListen.map(name => new Promise((resolve) => {
        if (state.listeners[name]) state.listeners[name](); // Unsubscribe from old listener

        const q = query(collection(db, name));

        state.listeners[name] = onSnapshot(q, (snapshot) => {
            const isFirstLoad = !state.collections[name];
            state.collections[name] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            if (name === 'Trips' && isFirstLoad) {
                selectDefaultTrip();
            }

            // Re-render the current view with the updated state
            switch (state.currentView) {
                case 'main': renderMainPage(); break;
                case 'parcels': renderParcelsPage(); break;
                case 'directories': renderDirectoryPage(); break;
                case 'reports': renderReportsPage(); break;
            }
        }, (error) => {
            console.error(`Error listening to ${name}:`, error);
        });
        resolve();
    }));
    await Promise.all(promises);
}

// --- VIEW MANAGEMENT ---
function switchView(viewName) {
    state.currentView = viewName;
    mainPageView.classList.toggle('hidden', viewName !== 'main');
    parcelsPageView.classList.toggle('hidden', viewName !== 'parcels');
    directoriesPageView.classList.toggle('hidden', viewName !== 'directories');
    reportsPageView.classList.toggle('hidden', viewName !== 'reports');

    navButtons.forEach(btn => {
        btn.classList.toggle('bg-gray-200', btn.dataset.view === viewName);
        btn.classList.toggle('text-gray-900', btn.dataset.view === viewName);
        btn.classList.toggle('text-gray-700', btn.dataset.view !== viewName);
    });

    if (viewName === 'reports' || viewName === 'parcels') {
        if (state.selectedTripId === 'all') {
            selectNextFutureTrip();
        }
    }

    // Initial render for the switched view
    switch (viewName) {
        case 'main':
            renderMainPage();
            break;
        case 'parcels':
            renderParcelsPage();
            updateTripSelectorDisplays();
            break;
        case 'directories':
            // Reset to default directory if current is not valid
            if (!DIRECTORIES[state.currentDirectory] || state.currentDirectory === 'Passengers' || state.currentDirectory === 'Parcels') {
                state.currentDirectory = 'Clients';
            }
            renderDirectoryPage();
            break;
        case 'reports':
            renderReportsPage();
            updateReportView();
            updateTripSelectorDisplays();
            break;
    }
}

// --- GLOBAL EVENT LISTENERS ---
function setupGlobalEventListeners() {
    homeLink.addEventListener('click', () => switchView('main'));
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            window.close();
        });
    }

    document.addEventListener('keydown', (e) => {
        const modalIsOpen = document.querySelector('.modal-overlay');
        if (modalIsOpen) return;

        if (e.key === 'Insert') {
            e.preventDefault();
            if (state.currentView === 'main') {
                document.getElementById('add-passenger-btn')?.click();
            } else if (state.currentView === 'parcels') {
                document.getElementById('add-parcel-btn')?.click();
            } else if (state.currentView === 'directories') {
                document.getElementById('add-directory-item-btn')?.click();
            }
        }

        if (e.key === 'F7') {
            e.preventDefault();
            let searchInput;
            if (state.currentView === 'main') {
                searchInput = document.getElementById('passenger-search-input');
            } else if (state.currentView === 'parcels') {
                searchInput = document.getElementById('parcel-search-input');
            } else if (state.currentView === 'directories') {
                searchInput = document.getElementById('directory-search-input');
            }
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.matches('.date-input-mask')) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) value = value.substring(0, 2) + '.' + value.substring(2);
            if (value.length > 5) value = value.substring(0, 5) + '.' + value.substring(5, 9);
            e.target.value = value.substring(0, 10);
        } else if (e.target.matches('.time-input')) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + ':' + value.substring(2, 4);
            }
            e.target.value = value;
        }
    });
}

// --- START THE APPLICATION ---
authenticateUser();
