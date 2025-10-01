// js/views/mainView.js
import { db } from '../firebase.js';
import { doc, setDoc, addDoc, Timestamp, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openPassengerModal } from '../ui/modal.js';
import { updateTripSelectorDisplays } from '../tripSelector.js';

// Module-level variables for DOM elements
let mainPageView, passengerSearchInput, addPassengerBtn, passengersTableBody, passengersTableHead, tripInfo, passengerDateHeader;

// Initialize selectedPassengerId in the state
state.selectedPassengerId = null;

function scrollToSelected() {
    if (!state.selectedPassengerId) return;
    setTimeout(() => {
        const row = passengersTableBody.querySelector(`tr[data-id="${state.selectedPassengerId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

export function renderMainPage() {
    if (!mainPageView) return;
    updateTripSelectorDisplays();
    renderPassengerTable(state.selectedTripId);
}

function updateRowHighlights() {
    const rows = passengersTableBody.querySelectorAll('tr[data-id]');
    rows.forEach(row => {
        const passengerId = row.dataset.id;
        const isSelected = state.selectedPassengerId === passengerId;
        const isCanceled = row.dataset.canceled === 'true';
        const isPlace = row.dataset.place === 'true';
        const isStatus = row.dataset.status === 'true';

        // Reset classes
        row.classList.remove('bg-red-100', 'bg-blue-200', 'bg-yellow-100', 'bg-green-50', 'hover:bg-gray-100');

        if (isCanceled) {
            row.classList.add('bg-red-100');
        } else if (isSelected) {
            row.classList.add('bg-blue-200');
        } else {
            if (isPlace) {
                row.classList.add('bg-yellow-100');
            } else if (isStatus) {
                row.classList.add('bg-green-50');
            }
            row.classList.add('hover:bg-gray-100');
        }
    });
}

function renderPassengerTable(tripId) {
    let justFocused = false;
    if (state.focusItemId) {
        const allPassengers = (state.collections.Passengers || []);
        if (allPassengers.some(p => p.id === state.focusItemId)) {
            state.passengerFilter = 'active'; // Default to active passengers
            if (state.passengerSearchTerm) {
                state.passengerSearchTerm = '';
                if (passengerSearchInput) passengerSearchInput.value = '';
            }
            state.selectedPassengerId = state.focusItemId;
            state.focusItemId = null;
            justFocused = true;
        }
    }

    const allPassengersForTrip = (state.collections.Passengers || []).filter(p => (tripId === 'all' || (tripId && p.TripId === tripId)));
    const activePassengers = allPassengersForTrip.filter(p => !p.Canceled);

    let passengersToDisplay;

    // Filtering logic based on the new requirements
    switch (state.passengerFilter) {
        case 'all':
            passengersToDisplay = [...allPassengersForTrip];
            break;
        case 'unconfirmed':
            passengersToDisplay = activePassengers.filter(p => !p.Status);
            break;
        case 'additional':
            passengersToDisplay = activePassengers.filter(p => p.Place);
            break;
        case 'active':
        default:
            passengersToDisplay = [...activePassengers];
            break;
    }

    if (tripId && tripId !== 'all') {
        const trip = (state.collections.Trips || []).find(t => t.id === tripId);
        const bus = trip ? (state.collections.Buses || []).find(b => b.id === trip.BusId) : null;
        const busCapacity = bus?.Capacity || 0;
        const totalPassengers = activePassengers.length;
        const unconfirmedCount = activePassengers.filter(p => !p.Status).length;
        const additionalCount = activePassengers.filter(p => p.Place).length;
        const isOverloaded = (totalPassengers + additionalCount) > (busCapacity - 2);
        const totalCountColor = isOverloaded ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

        tripInfo.innerHTML = `
            <span class="cursor-pointer ${totalCountColor}" data-filter="active" title="Всього активних пасажирів">${totalPassengers}</span>
            <span class="cursor-pointer text-blue-600 font-bold ml-3" data-filter="unconfirmed" title="Не підтверджено">${unconfirmedCount}</span>
            <span class="cursor-pointer text-yellow-500 font-bold ml-3" data-filter="additional" title="Додаткові місця">+${additionalCount}</span>
            <span class="text-gray-500"> / </span>
            <span class="cursor-pointer text-gray-800" data-filter="all" title="Місткість / Показати всіх (з скасованими)">${busCapacity}</span>
        `;
    } else {
        tripInfo.innerHTML = '';
    }

    let enriched = passengersToDisplay.map(p => {
        const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
        const trip = (state.collections.Trips || []).find(t => t.id === p.TripId);
        const route = trip ? (state.collections.Routes || []).find(r => r.id === trip.RouteId) : null;
        const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;
        let stationBegin, stationEnd, stationBeginCode, stationEndCode;

        if (client) {
            const stBeginUA = (state.collections.Stations || []).find(s => s.id === client.StationIdUA);
            const stBeginEU = (state.collections.Stations || []).find(s => s.id === client.StationIdEU);
            const stEndUA = (state.collections.Stations || []).find(s => s.id === client.StationIdUA);
            const stEndEU = (state.collections.Stations || []).find(s => s.id === client.StationIdEU);

            if (country?.Cod === 0) { // Ukraine -> EU
                stationBegin = stBeginUA?.Name || '—';
                stationEnd = stEndEU?.Name || '—';
                stationBeginCode = stBeginUA?.Cod || 0;
                stationEndCode = stEndEU?.Cod || 0;
            } else { // EU -> Ukraine
                stationBegin = stBeginEU?.Name || '—';
                stationEnd = stEndUA?.Name || '—';
                stationBeginCode = stBeginEU?.Cod || 0;
                stationEndCode = stEndUA?.Cod || 0;
            }
        }
        return { ...p, ClientName: client?.Name || '', TripDate: trip?.Date, StationBegin: stationBegin, StationEnd: stationEnd, StationBeginCode: stationBeginCode, StationEndCode: stationEndCode };
    });

    if (state.passengerSearchTerm) {
        const term = state.passengerSearchTerm.toLowerCase();
        enriched = enriched.filter(p => {
            return (p.ClientName || '').toLowerCase().includes(term) ||
                (p.StationBegin || '').toLowerCase().includes(term) ||
                (p.StationEnd || '').toLowerCase().includes(term) ||
                (p.Note || '').toLowerCase().includes(term);
        });
    }

    const sortConfig = state.passengerSortConfig || { key: 'ClientName', direction: 'ascending' };
    const { key, direction } = sortConfig;
    enriched.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case 'StationBegin':
                valA = a.StationBeginCode;
                valB = b.StationBeginCode;
                break;
            case 'StationEnd':
                valA = a.StationEndCode;
                valB = b.StationEndCode;
                break;
            case 'TripDate':
                valA = a.TripDate?.seconds || 0;
                valB = b.TripDate?.seconds || 0;
                break;
            default:
                valA = a[key];
                valB = b[key];
                break;
        }

        const comparison = String(valA ?? '').localeCompare(String(valB ?? ''), undefined, { numeric: true });

        if (comparison === 0 && (key === 'StationBegin' || key === 'StationEnd')) {
            const nameA = a.ClientName || '';
            const nameB = b.ClientName || '';
            const secondaryComparison = nameA.localeCompare(nameB);
            return direction === 'ascending' ? secondaryComparison : -secondaryComparison;
        }

        return direction === 'ascending' ? comparison : -comparison;
    });

    if (enriched.length === 0) {
        passengersTableBody.innerHTML = '';
        state.selectedPassengerId = null;
    }

    if (state.selectedPassengerId && !enriched.some(p => p.id === state.selectedPassengerId)) {
        state.selectedPassengerId = null;
    }

    passengersTableHead.querySelectorAll('th[data-sort-key]').forEach(th => {
        th.innerHTML = `${th.textContent.replace(/[▲▼]/g, '').trim()} ${sortConfig.key === th.dataset.sortKey ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}`;
    });
    passengerDateHeader.style.display = tripId === 'all' ? '' : 'none';

    passengersTableBody.innerHTML = enriched.map(p => {
        const dateCell = tripId === 'all' ? `<td class="p-3 text-sm">${getDisplayValue(null, 'Date', p.TripDate)}</td>` : '';
        return `
            <tr data-id="${p.id}" data-status="${p.Status}" data-place="${p.Place}" data-canceled="${p.Canceled || false}" class="cursor-pointer ${p.Ticket ? 'font-bold' : ''} border-b">
                ${dateCell}
                <td class="p-3 text-sm">${p.ClientName || ''}</td>
                <td class="p-3 text-sm">${p.StationBegin}</td>
                <td class="p-3 text-sm">${p.StationEnd}</td>
                <td class="p-3 text-sm">${p.Note || ''}</td>
                <td class="p-3">
                    <button class="status-btn text-xl ${p.Status ? '' : 'opacity-25'}" data-id="${p.id}" title="Підтверджено">✅</button>
                    <button class="copy-passenger-btn text-gray-500 hover:text-gray-700 ml-2" data-id="${p.id}" title="Дублювати">📋</button>
                    <button class="edit-passenger-btn text-blue-500 hover:text-blue-700 ml-2" data-id="${p.id}" title="Редагувати">✏️</button>
                    <button class="cancel-btn text-xl ${p.Canceled ? '' : 'opacity-25'} ml-2" data-id="${p.id}" title="Скасовано">🚫</button>
                </td>
            </tr>
        `;
    }).join('');

    updateRowHighlights();

    if (justFocused) {
        scrollToSelected();
    }
}

async function handleCopyPassenger(passengerId) {
    const original = (state.collections.Passengers || []).find(p => p.id === passengerId);
    if (!original) return;
    const newData = { ...original, Booking: Timestamp.now() };
    delete newData.id;
    if (state.selectedTripId && state.selectedTripId !== 'all') {
        newData.TripId = state.selectedTripId;
    }
    const newDocRef = await addDoc(collection(db, 'Passengers'), newData);
    state.focusItemId = newDocRef.id;
}

async function togglePassengerStatus(passengerId) {
    const passenger = (state.collections.Passengers || []).find(p => p.id === passengerId);
    if (passenger) {
        await setDoc(doc(db, 'Passengers', passengerId), { Status: !passenger.Status }, { merge: true });
    }
}

async function togglePassengerCanceled(passengerId) {
    const passenger = (state.collections.Passengers || []).find(p => p.id === passengerId);
    if (passenger) {
        await setDoc(doc(db, 'Passengers', passengerId), { Canceled: !passenger.Canceled }, { merge: true });
    }
}

function handleKeyboardNavigation(e) {
    if (state.currentView !== 'main' || document.querySelector('.modal-overlay')) return;

    const rows = Array.from(passengersTableBody.querySelectorAll('tr[data-id]'));
    if (rows.length === 0) return;

    if (e.key === 'Enter' && state.selectedPassengerId) {
        e.preventDefault();
        openPassengerModal(state.selectedPassengerId);
        return;
    }

    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    let currentIndex = -1;
    if (state.selectedPassengerId) {
        currentIndex = rows.findIndex(row => row.dataset.id === state.selectedPassengerId);
    }

    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    }

    const nextRow = rows[nextIndex];
    if (nextRow) {
        state.selectedPassengerId = nextRow.dataset.id;
        updateRowHighlights();
        nextRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function initMainView() {
    mainPageView = document.getElementById('main-page-view');
    mainPageView.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center">
                <label for="main-trip-select-input" class="mr-2 font-semibold">Рейс:</label>
                <div id="trip-select-container" class="relative">
                    <input type="text" id="main-trip-select-input" class="border border-gray-300 rounded-md p-2" autocomplete="new-password" placeholder="дд.мм.рр або пошук...">
                    <div id="main-trip-select-results" class="autocomplete-results hidden"></div>
                </div>
            </div>
            <div class="flex-grow">
                <div class="relative">
                    <input type="text" id="passenger-search-input" class="w-full border border-gray-300 rounded-md p-2 pl-10" placeholder="Пошук пасажира (F7)">
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
                </div>
            </div>
            <div id="trip-info" class="text-lg font-bold"></div>
            <button id="add-passenger-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                <span>Додати пасажира</span>
            </button>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
            <table class="w-full text-left">
                <thead id="passengers-table-head" class="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                    <th id="passenger-date-header" data-sort-key="TripDate" class="p-3 text-sm font-semibold tracking-wide">Дата поїздки</th>
                    <th data-sort-key="ClientName" class="p-3 text-sm font-semibold tracking-wide">Ім'я клієнта</th>
                    <th data-sort-key="StationBegin" class="p-3 text-sm font-semibold tracking-wide">Пункт відправлення</th>
                    <th data-sort-key="StationEnd" class="p-3 text-sm font-semibold tracking-wide">Пункт прибуття</th>
                    <th data-sort-key="Note" class="p-3 text-sm font-semibold tracking-wide">Примітка</th>
                    <th class="p-3 text-sm font-semibold tracking-wide">Дії</th>
                </tr>
                </thead>
                <tbody id="passengers-table-body">
                </tbody>
            </table>
        </div>`;

    passengerSearchInput = document.getElementById('passenger-search-input');
    addPassengerBtn = document.getElementById('add-passenger-btn');
    passengersTableBody = document.getElementById('passengers-table-body');
    passengersTableHead = document.getElementById('passengers-table-head');
    passengerDateHeader = document.getElementById('passenger-date-header');
    tripInfo = document.getElementById('trip-info');

    addPassengerBtn.addEventListener('click', () => {
        openPassengerModal();
    });

    passengerSearchInput.addEventListener('input', (e) => {
        state.passengerSearchTerm = e.target.value;
        renderPassengerTable(state.selectedTripId);
    });

    passengersTableHead.addEventListener('click', (e) => {
        const th = e.target.closest('[data-sort-key]');
        if (!th) return;
        const key = th.dataset.sortKey;
        if (!state.passengerSortConfig) {
            state.passengerSortConfig = { key: 'ClientName', direction: 'ascending' };
        }
        if (state.passengerSortConfig.key === key) {
            state.passengerSortConfig.direction = state.passengerSortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        } else {
            state.passengerSortConfig.key = key;
            state.passengerSortConfig.direction = 'ascending';
        }
        renderPassengerTable(state.selectedTripId);
    });

    tripInfo.addEventListener('click', (e) => {
        const filterTarget = e.target.closest('[data-filter]');
        if (filterTarget) {
            state.passengerFilter = filterTarget.dataset.filter;
            renderPassengerTable(state.selectedTripId);
        }
    });

    passengersTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;

        const id = row.dataset.id;
        const button = target.closest('button');

        if (button) {
            if (button.classList.contains('edit-passenger-btn')) {
                openPassengerModal(id);
            } else if (button.classList.contains('copy-passenger-btn')) {
                await handleCopyPassenger(id);
            } else if (button.classList.contains('status-btn')) {
                await togglePassengerStatus(id);
            } else if (button.classList.contains('cancel-btn')) {
                await togglePassengerCanceled(id);
            }
        } else {
            state.selectedPassengerId = id;
            updateRowHighlights();
        }
    });

    passengersTableBody.addEventListener('dblclick', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.id) {
            openPassengerModal(row.dataset.id);
        }
    });

    document.addEventListener('keydown', handleKeyboardNavigation);
}
