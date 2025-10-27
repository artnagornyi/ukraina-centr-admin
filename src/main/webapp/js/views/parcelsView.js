// js/views/parcelsView.js
import { state } from '../state.js';
import { getDisplayValue, getNextSelectable } from '../utils.js';
import { openParcelModal, openConfirmModal } from '../ui/modal.js';
import { doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase.js';

let parcelsPageView, parcelsTableContainer, searchInput, parcelRecordCount;
let searchTimeout = null;

state.selectedParcelId = null;

function scrollToSelected() {
    if (!state.selectedParcelId) return;
    setTimeout(() => {
        const row = parcelsTableContainer.querySelector(`tr[data-id="${state.selectedParcelId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function getFilteredParcels() {
    let parcels = (state.collections.Parcels || []).filter(p => state.selectedTripId === 'all' || p.TripId === state.selectedTripId);

    if (state.parcelFilter) {
        const filter = state.parcelFilter.toLowerCase();
        const enriched = parcels.map(p => {
            const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
            const agent = (state.collections.Agents || []).find(a => a.id === p.AgentId);
            return { ...p, ClientName: client?.Name || '', ClientNP: client?.NPNum || '', AgentName: agent?.Name || '' };
        });

        parcels = enriched.filter(p =>
            (p.ClientName || '').toLowerCase().includes(filter) ||
            (getDisplayValue('Parcels', 'TripId', p.TripId) || '').toLowerCase().includes(filter) ||
            (p.Name || '').toLowerCase().includes(filter) ||
            (p.Money || '').toLowerCase().includes(filter) ||
            (p.ClientNP || '').toLowerCase().includes(filter) ||
            (p.AgentName || '').toLowerCase().includes(filter) ||
            ((p.Weight || '').toString().toLowerCase().includes(filter))
        );
    }
    return parcels;
}

async function handleNpCellEdit(e) {
    const td = e.target.closest('td[data-field="ClientNP"]');
    if (!td || td.querySelector('input')) {
        return;
    }

    const clientId = td.dataset.clientId;
    if (!clientId) return;

    const originalValue = td.textContent.trim();
    td.innerHTML = `<input type="text" class="w-full bg-yellow-100 border border-gray-400 rounded px-1" value="${originalValue}">`;
    const input = td.querySelector('input');
    input.focus();
    input.select();

    const saveChanges = async () => {
        const newValue = input.value.trim();
        input.removeEventListener('blur', saveChanges);
        td.innerHTML = newValue;

        if (newValue !== originalValue) {
            try {
                const clientRef = doc(db, 'Clients', clientId);
                await updateDoc(clientRef, { NPNum: newValue });
            } catch (error) {
                console.error("Error updating NPNum: ", error);
                td.innerHTML = originalValue;
                alert(`Помилка при оновленні Нової Пошти: ${error.message}`);
            }
        }
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveChanges();
        } else if (e.key === 'Escape') {
            input.removeEventListener('blur', saveChanges);
            td.innerHTML = originalValue;
        }
    });
}

function handleTableActions(e) {
    const target = e.target;
    const row = target.closest('tr');
    if (!row || !row.dataset.id) return;

    const parcelId = row.dataset.id;
    const button = target.closest('button[data-action]');

    if (button) {
        const action = button.dataset.action;
        if (action === 'edit') {
            openParcelModal(parcelId);
        } else if (action === 'delete') {
            const clientName = row.querySelector('td').textContent;
            openConfirmModal(`Ви впевнені, що хочете видалити посилку для "${clientName}"?`, async () => {
                await deleteDoc(doc(db, 'Parcels', parcelId));
            });
        }
    } else {
        state.selectedParcelId = parcelId;
        updateRowHighlights();
    }
}

function handleRowDblClick(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset.id) {
        openParcelModal(row.dataset.id);
    }
}

function handleKeyboardNavigation(e) {
    if (state.currentView !== 'parcels' || document.querySelector('.modal-overlay')) return;

    const rows = Array.from(parcelsTableContainer.querySelectorAll('tbody tr[data-id]'));
    if (rows.length === 0) return;

    if (e.key === 'Enter' && state.selectedParcelId) {
        e.preventDefault();
        openParcelModal(state.selectedParcelId);
        return;
    }

    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    const direction = e.key === 'ArrowDown' ? 'down' : 'up';
    const { nextId, nextRow } = getNextSelectable(rows, state.selectedParcelId, direction);

    if (nextRow) {
        state.selectedParcelId = nextId;
        updateRowHighlights();
        nextRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updateRowHighlights() {
    const rows = parcelsTableContainer.querySelectorAll('tbody tr[data-id]');
    rows.forEach(row => {
        const parcelId = row.dataset.id;
        const isSelected = state.selectedParcelId === parcelId;
        const isUnpaid = row.dataset.unpaid === 'true';

        row.classList.remove('bg-blue-200', 'bg-pink-100', 'hover:bg-gray-100');

        if (isSelected) {
            row.classList.add('bg-blue-200');
        } else if (isUnpaid) {
            row.classList.add('bg-pink-100');
        } else {
            row.classList.add('hover:bg-gray-100');
        }
    });
}

function handleSort(e) {
    const th = e.target.closest('[data-sort-key]');
    if (!th) return;
    const key = th.dataset.sortKey;
    if (!state.parcelSortConfig) {
        state.parcelSortConfig = { key: 'ClientName', direction: 'ascending' };
    }
    if (state.parcelSortConfig.key === key) {
        state.parcelSortConfig.direction = state.parcelSortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
        state.parcelSortConfig.key = key;
        state.parcelSortConfig.direction = 'ascending';
    }
    renderParcelsPage();
}

export function initParcelsView() {
    parcelsPageView = document.getElementById('parcels-page-view');
    parcelsPageView.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-md">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div class="flex items-center w-full md:w-auto">
                    <label for="parcels-trip-select-input" class="mr-2 font-semibold">Рейс:</label>
                    <div id="parcel-trip-select-container" class="relative flex-grow">
                        <input type="text" id="parcels-trip-select-input" class="w-full border border-gray-300 rounded-md p-2" autocomplete="off" placeholder="Оберіть рейс...">
                        <div id="parcels-trip-select-results" class="autocomplete-results hidden"></div>
                    </div>
                </div>
                <div class="flex-grow w-full md:w-auto">
                    <div class="relative">
                        <input type="text" id="parcel-search-input" class="w-full border border-gray-300 rounded-md p-2 pl-10" placeholder="Пошук посилок (F7)">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
                    </div>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <span id="parcel-record-count" class="text-sm text-gray-500 font-bold"></span>
                    <button id="add-parcel-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Додати посилку</span>
                    </button>
                </div>
            </div>
            <div id="parcels-table-container" class="overflow-x-auto mt-4"></div>
        </div>
    `;
    parcelsTableContainer = parcelsPageView.querySelector('#parcels-table-container');
    searchInput = parcelsPageView.querySelector('#parcel-search-input');
    parcelRecordCount = parcelsPageView.querySelector('#parcel-record-count');
    const addParcelBtn = parcelsPageView.querySelector('#add-parcel-btn');

    addParcelBtn.addEventListener('click', () => openParcelModal());

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.parcelFilter = searchInput.value.toLowerCase();
            renderParcelsPage();
        }, 300);
    });

    parcelsTableContainer.addEventListener('click', handleTableActions);
    parcelsTableContainer.addEventListener('dblclick', handleRowDblClick);
    parcelsTableContainer.addEventListener('click', handleNpCellEdit);
    document.addEventListener('keydown', handleKeyboardNavigation);
}

export function renderParcelsPage() {
    if (!parcelsPageView) return;

    let justFocused = false;
    if (state.focusItemId) {
        const allParcels = (state.collections.Parcels || []);
        if (allParcels.some(p => p.id === state.focusItemId)) {
            if (state.parcelFilter) {
                state.parcelFilter = '';
                if (searchInput) searchInput.value = '';
            }

            state.selectedParcelId = state.focusItemId;
            state.focusItemId = null;
            justFocused = true;
        }
    }

    const selectedTrip = (state.collections.Trips || []).find(t => t.id === state.selectedTripId);
    const route = selectedTrip ? (state.collections.Routes || []).find(r => r.id === selectedTrip.RouteId) : null;
    const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;
    const isFromUkraine = country ? country.Cod === 0 : false;

    const filteredParcels = getFilteredParcels();
    parcelRecordCount.textContent = `Всього: ${filteredParcels.length}`;

    let enrichedParcels = filteredParcels.map(p => {
        const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
        const trip = (state.collections.Trips || []).find(t => t.id === p.TripId);
        const agent = (state.collections.Agents || []).find(a => a.id === p.AgentId);
        const routeOfParcel = trip ? (state.collections.Routes || []).find(r => r.id === trip.RouteId) : null;
        const countryOfParcel = routeOfParcel ? (state.collections.Country || []).find(c => c.id === routeOfParcel.CountryId) : null;

        let stationBegin = '—';
        let stationEnd = '—';

        if (client && countryOfParcel) {
            const townUA = getDisplayValue('Clients', 'TownIdUA', client.TownIdUA);
            const townEU = getDisplayValue('Clients', 'TownIdEU', client.TownIdEU);
            stationBegin = countryOfParcel.Cod === 0 ? townUA : townEU;
            stationEnd = countryOfParcel.Cod === 0 ? townEU : townUA;
        }
        return {
            ...p,
            ClientName: client?.Name || '',
            ClientNP: client?.NPNum || '',
            AgentName: agent?.Name || '',
            StationBegin: stationBegin,
            StationEnd: stationEnd,
        };
    });

    const sortConfig = state.parcelSortConfig || { key: 'ClientName', direction: 'ascending' };
    const { key, direction } = sortConfig;
    enrichedParcels.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const comparison = String(valA ?? '').localeCompare(String(valB ?? ''), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    if (enrichedParcels.length === 0) {
        parcelsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Для обраного рейсу посилок не знайдено.</p>';
        state.selectedParcelId = null;
        return;
    }

    if (state.selectedParcelId && !enrichedParcels.some(p => p.id === state.selectedParcelId)) {
        state.selectedParcelId = null;
    }

    const agentHeader = isFromUkraine ? '' : `<th class="py-3 px-6 text-left cursor-pointer" data-sort-key="AgentName">Агент</th>`;
    const baggageHeader = `<th class="py-3 px-6 text-left cursor-pointer" data-sort-key="Name">Багаж</th>`;
    const weightHeader = `<th class="py-3 px-6 text-left cursor-pointer" data-sort-key="Weight">Вага</th>`;
    const npHeader = `<th class="py-3 px-6 text-left cursor-pointer" data-sort-key="ClientNP">Нова Пошта</th>`;

    const headerCells = `
        <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="ClientName">Клієнт</th>
        <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="StationBegin">Відправлення</th>
        <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="StationEnd">Отримання</th>
        ${agentHeader}
        ${isFromUkraine
        ? baggageHeader + weightHeader
        : npHeader + baggageHeader
    }
        <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="Money">Кошти</th>
        <th class="py-3 px-6 text-center">Дії</th>
    `;

    const tableHTML = `
        <table class="min-w-full bg-white whitespace-nowrap">
            <thead id="parcels-table-head" class="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <tr>
                    ${headerCells}
                </tr>
            </thead>
            <tbody class="text-gray-600 text-sm font-light">
                ${enrichedParcels.map(p => renderParcelRow(p, isFromUkraine)).join('')}
            </tbody>
        </table>
    `;
    parcelsTableContainer.innerHTML = tableHTML;
    updateRowHighlights();

    if (justFocused) {
        scrollToSelected();
    }

    const thead = parcelsTableContainer.querySelector('#parcels-table-head');
    if (thead) {
        thead.removeEventListener('click', handleSort);
        thead.addEventListener('click', handleSort);

        thead.querySelectorAll('th[data-sort-key]').forEach(th => {
            const currentKey = th.dataset.sortKey;
            let indicator = '';
            if (sortConfig.key === currentKey) {
                indicator = sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
            }
            th.innerHTML = th.textContent.replace(/[▲▼]/g, '').trim() + indicator;
        });
    }
}

function renderParcelRow(parcel, isFromUkraine) {
    const isUnpaid = parcel.Paid === false;

    const agentCell = isFromUkraine ? '' : `<td class="py-3 px-6 text-left">${parcel.AgentName || ''}</td>`;
    const baggageCell = `<td class="py-3 px-6 text-left">${parcel.Name || ''}</td>`;
    const weightCell = `<td class="py-3 px-6 text-left">${parcel.Weight || ''}</td>`;
    const npCell = `<td class="py-3 px-6 text-left" data-field="ClientNP" data-client-id="${parcel.ClientId}">${parcel.ClientNP || ''}</td>`;

    const dataCells = `
        <td class="py-3 px-6 text-left">${parcel.ClientName || 'N/A'}</td>
        <td class="py-3 px-6 text-left">${parcel.StationBegin}</td>
        <td class="py-3 px-6 text-left">${parcel.StationEnd}</td>
        ${agentCell}
        ${isFromUkraine
        ? baggageCell + weightCell
        : npCell + baggageCell
    }
        <td class="py-3 px-6 text-left">${parcel.Money || ''}</td>
    `;

    return `
        <tr class="cursor-pointer border-b border-gray-200" data-id="${parcel.id}" data-unpaid="${isUnpaid}">
            ${dataCells}
            <td class="py-3 px-6 text-center">
                <div class="flex item-center justify-center">
                    <button class="w-6 h-6 text-gray-500 hover:text-blue-600" data-action="edit" title="Редагувати"><svg xmlns="http://www.w3.org/2000/svg" style="fill: none;" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button>
                    <button class="w-6 h-6 text-gray-500 hover:text-red-600 ml-2" data-action="delete" title="Видалити"><svg xmlns="http://www.w3.org/2000/svg" style="fill: none;" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>
        </tr>
    `;
}
