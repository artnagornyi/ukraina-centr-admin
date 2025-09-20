// js/views/mainView.js
import { db } from '../firebase.js';
import { doc, setDoc, addDoc, Timestamp, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openPassengerModal, openConfirmModal } from '../ui/modal.js';
import { updateTripSelectorDisplays } from '../tripSelector.js';

// Module-level variables for DOM elements
let mainPageView, passengerSearchInput, addPassengerBtn, passengersTableBody, passengersTableHead, tripInfo, passengerDateHeader;

export function renderMainPage() {
    if (!mainPageView) return;
    updateTripSelectorDisplays();
    renderPassengerTable(state.selectedTripId);
}

function renderPassengerTable(tripId) {
    const allPassengersForTrip = (state.collections.Passengers || []).filter(p => (tripId === 'all' || (tripId && p.TripId === tripId)));
    let passengersToDisplay = [...allPassengersForTrip];

    if (tripId && tripId !== 'all') {
        const trip = (state.collections.Trips || []).find(t => t.id === tripId);
        const bus = trip ? (state.collections.Buses || []).find(b => b.id === trip.BusId) : null;
        const busCapacity = bus?.Capacity || 0;
        const totalPassengers = allPassengersForTrip.length;
        const unconfirmedCount = allPassengersForTrip.filter(p => !p.Status).length;
        const additionalCount = allPassengersForTrip.filter(p => p.Place).length;
        const isOverloaded = (totalPassengers + additionalCount) > (busCapacity - 2);
        const totalCountColor = isOverloaded ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

        tripInfo.innerHTML = `
            <span class="cursor-pointer ${totalCountColor}" data-filter="all" title="Всього пасажирів (показати всіх)">${totalPassengers}</span>
            <span class="cursor-pointer text-blue-600 font-bold ml-3" data-filter="unconfirmed" title="Не підтверджено">${unconfirmedCount}</span>
            <span class="cursor-pointer text-yellow-500 font-bold ml-3" data-filter="additional" title="Додаткові місця">+${additionalCount}</span>
            <span class="text-gray-500"> / </span>
            <span class="cursor-pointer text-gray-800" data-filter="all" title="Місткість / Показати всіх">${busCapacity}</span>
        `;
    } else {
        tripInfo.innerHTML = '';
    }

    if (tripId && tripId !== 'all') {
        if (state.passengerFilter === 'unconfirmed') {
            passengersToDisplay = allPassengersForTrip.filter(p => !p.Status);
        } else if (state.passengerFilter === 'additional') {
            passengersToDisplay = allPassengersForTrip.filter(p => p.Place);
        }
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
        let valA = a[key];
        let valB = b[key];

        if (key === 'TripDate') {
            valA = valA?.seconds || 0;
            valB = valB?.seconds || 0;
        }

        const comparison = String(valA ?? '').localeCompare(String(valB ?? ''), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    passengersTableHead.querySelectorAll('th[data-sort-key]').forEach(th => {
        th.innerHTML = `${th.textContent.replace(/[▲▼]/g, '').trim()} ${sortConfig.key === th.dataset.sortKey ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}`;
    });
    passengerDateHeader.style.display = tripId === 'all' ? '' : 'none';

    passengersTableBody.innerHTML = enriched.map(p => {
        const dateCell = tripId === 'all' ? `<td class="p-3 text-sm">${getDisplayValue(null, 'Date', p.TripDate)}</td>` : '';
        return `
            <tr data-id="${p.id}" class="cursor-pointer hover:bg-gray-100 ${p.Place ? 'bg-yellow-100' : (p.Status ? 'bg-green-50' : '')} ${p.Ticket ? 'font-bold' : ''} border-b">
                ${dateCell}
                <td class="p-3 text-sm">${p.ClientName || ''}</td>
                <td class="p-3 text-sm">${p.StationBegin}</td>
                <td class="p-3 text-sm">${p.StationEnd}</td>
                <td class="p-3 text-sm">${p.Note || ''}</td>
                <td class="p-3">
                    <button class="status-btn text-xl ${p.Status ? '' : 'opacity-25'}" data-id="${p.id}" title="Підтверджено">✅</button>
                    <button class="copy-passenger-btn text-gray-500 hover:text-gray-700 ml-2" data-id="${p.id}" title="Дублювати">📋</button>
                    <button class="edit-passenger-btn text-blue-500 hover:text-blue-700 ml-2" data-id="${p.id}" title="Редагувати">✏️</button>
                    <button class="delete-passenger-btn text-red-500 hover:text-red-700 ml-2" data-id="${p.id}" data-name="${p.ClientName}" title="Видалити">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleCopyPassenger(passengerId) {
    const original = (state.collections.Passengers || []).find(p => p.id === passengerId);
    if (!original) return;
    const newData = { ...original, Booking: Timestamp.now() };
    delete newData.id;
    if (state.selectedTripId && state.selectedTripId !== 'all') {
        newData.TripId = state.selectedTripId;
    }
    await addDoc(collection(db, 'Passengers'), newData);
}

async function togglePassengerStatus(passengerId) {
    const passenger = (state.collections.Passengers || []).find(p => p.id === passengerId);
    if (passenger) {
        await setDoc(doc(db, 'Passengers', passengerId), { Status: !passenger.Status }, { merge: true });
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

    addPassengerBtn.addEventListener('click', () => openPassengerModal());

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
            // A button inside the row was clicked, handle the specific button action
            if (button.classList.contains('edit-passenger-btn')) {
                openPassengerModal(id);
            } else if (button.classList.contains('delete-passenger-btn')) {
                openConfirmModal(`Ви впевнені, що хочете видалити "${button.dataset.name}"?`, async () => {
                    await deleteDoc(doc(db, 'Passengers', id));
                });
            } else if (button.classList.contains('copy-passenger-btn')) {
                await handleCopyPassenger(id);
            } else if (button.classList.contains('status-btn')) {
                await togglePassengerStatus(id);
            }
        } else {
            // The row itself was clicked (but not a button), open the edit modal
            openPassengerModal(id);
        }
    });
}
