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
const navButtons = document.querySelectorAll('.nav-btn[data-view]');
const mainPageView = document.getElementById('main-page-view');
const parcelsPageView = document.getElementById('parcels-page-view');
const directoriesPageView = document.getElementById('directories-page-view');
const reportsPageView = document.getElementById('reports-page-view');
const homeLink = document.getElementById('home-link');

// --- AUTHENTICATION & INITIALIZATION ---
function authenticateUser() {
    signInAnonymously(auth).catch(error => {
        console.error("Authentication Error:", error);
        authStatusText.innerHTML = `<b>Помилка автентифікації:</b><br/>${error.message}.<br/>Перевірте налаштування Firebase.`;
    });
}

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            authStatusText.textContent = 'Автентифікація успішна. Завантаження даних...';
            await initializeAppLogic();
            authOverlay.classList.add('hidden');
            appView.classList.remove('hidden');
        } else {
            // Keep the overlay visible if there's no user
            authOverlay.classList.remove('hidden');
            appView.classList.add('hidden');
        }
    } catch (error) {
        console.error("Critical Initialization Error:", error);
        authStatusText.innerHTML = `<b>Критична помилка під час ініціалізації:</b><br/><pre>${error.stack}</pre>`;
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

    const promises = collectionsToListen.map(name => new Promise((resolve, reject) => {
        if (state.listeners[name]) state.listeners[name](); // Unsubscribe from old listener

        const q = query(collection(db, name));
        let isFirstLoadForThisListener = true;

        state.listeners[name] = onSnapshot(q, (snapshot) => {
            try {
                state.collections[name] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                if (isFirstLoadForThisListener) {
                    if (name === 'Trips') {
                        selectDefaultTrip();
                    }
                    isFirstLoadForThisListener = false;
                    resolve(); // Resolve promise on first successful data load
                } else {
                    // On subsequent updates, just re-render the current view
                    switch (state.currentView) {
                        case 'main': renderMainPage(); break;
                        case 'parcels': renderParcelsPage(); break;
                        case 'directories': renderDirectoryPage(); break;
                        case 'reports': renderReportsPage(); break;
                    }
                }
            } catch (renderError) {
                // Catch errors inside the snapshot callback and reject the main promise
                reject(renderError);
            }
        }, (error) => {
            // This is the error callback from onSnapshot
            console.error(`Error listening to ${name}:`, error);
            reject(new Error(`Помилка завантаження колекції '${name}'. Перевірте правила безпеки Firestore.`));
        });
    }));

    // This will now wait for all collections to load their initial data
    // and will fail if any of the listeners encounters an error.
    await Promise.all(promises);
}


// --- VIEW MANAGEMENT ---
function switchView(viewName) {
    state.currentView = viewName;
    mainPageView.classList.toggle('hidden', viewName !== 'main');
    parcelsPageView.classList.toggle('hidden', viewName !== 'parcels');
    directoriesPageView.classList.toggle('hidden', viewName !== 'directories');
    reportsPageView.classList.toggle('hidden', viewName !== 'reports');

    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
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

    const nav = document.querySelector('header nav');
    if (nav) {
        nav.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.dataset.view) {
                switchView(button.dataset.view);
            } else if (button.id === 'exit-btn') {
                if (appView) appView.style.display = 'none';
                if (authOverlay) authOverlay.style.display = 'none';

                if (document.getElementById('exit-message-container')) return;

                const exitMessageContainer = document.createElement('div');
                exitMessageContainer.id = 'exit-message-container';
                exitMessageContainer.innerHTML = `<div class="flex items-center justify-center h-screen bg-gray-100">
                        <div class="bg-white p-10 rounded-lg shadow-lg text-center">
                            <h1 class="text-2xl font-bold text-gray-800">Захист від кота!</h1>
                            <p class="text-gray-600 mt-2">Ви можете закрити це вікно.</p>
                        </div>
                    </div>`;
                document.body.appendChild(exitMessageContainer);
            }
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
