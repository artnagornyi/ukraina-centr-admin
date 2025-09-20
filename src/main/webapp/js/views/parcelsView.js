// js/views/parcelsView.js
import { state } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openParcelModal, openConfirmModal, openInfoModal } from '../ui/modal.js';
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase.js';

let parcelsPageView, parcelsTableContainer, searchInput;
let searchTimeout = null;

function getFilteredParcels() {
    let parcels = (state.collections.Parcels || []).filter(p => state.selectedTripId === 'all' || p.TripId === state.selectedTripId);

    if (state.parcelFilter) {
        const filter = state.parcelFilter;
        const enriched = parcels.map(p => {
            const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
            return { ...p, ClientName: client?.Name || '', ClientNP: client?.NPNum || '' };
        });

        parcels = enriched.filter(p =>
            (p.ClientName || '').toLowerCase().includes(filter) ||
            (getDisplayValue('Parcels', 'TripId', p.TripId) || '').toLowerCase().includes(filter) ||
            (p.Name || '').toLowerCase().includes(filter) ||
            (p.Money || '').toLowerCase().includes(filter) ||
            (p.ClientNP || '').toLowerCase().includes(filter)
        );
    }
    return parcels;
}

function exportParcelsToExcel() {
    const parcelsToExport = getFilteredParcels();
    if (parcelsToExport.length === 0) {
        openInfoModal("Немає даних для експорту.");
        return;
    }

    // Export with the new unified field names
    const dataForSheet = parcelsToExport.map(p => ({
        'ID документа': p.id,
        ClientId: p.ClientId,
        TripId: p.TripId,
        Name: p.Name,
        Weight: p.Weight,
        Paid: p.Paid,
        Money: p.Money
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Посилки");
    XLSX.writeFile(workbook, "Parcels_Export.xlsx");
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
        openParcelModal(parcelId);
    }
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
                <div class="flex items-center">
                    <label for="parcels-trip-select-input" class="mr-2 font-semibold">Рейс:</label>
                    <div id="parcel-trip-select-container" class="relative">
                        <input type="text" id="parcels-trip-select-input" class="border border-gray-300 rounded-md p-2" autocomplete="off" placeholder="Оберіть рейс...">
                        <div id="parcels-trip-select-results" class="autocomplete-results hidden"></div>
                    </div>
                </div>
                <div class="flex-grow">
                    <div class="relative">
                        <input type="text" id="parcel-search-input" class="w-full border border-gray-300 rounded-md p-2 pl-10" placeholder="Пошук посилок (F7)">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="export-parcels-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Export в Excel</button>
                    <button id="add-parcel-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Додати посилку</button>
                </div>
            </div>
            <div id="parcels-table-container" class="overflow-x-auto mt-4"></div>
        </div>
    `;
    parcelsTableContainer = document.getElementById('parcels-table-container');
    searchInput = document.getElementById('parcel-search-input');

    document.getElementById('add-parcel-btn').addEventListener('click', () => openParcelModal());
    document.getElementById('export-parcels-btn').addEventListener('click', exportParcelsToExcel);

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.parcelFilter = searchInput.value.toLowerCase();
            renderParcelsPage();
        }, 300);
    });

    parcelsTableContainer.addEventListener('click', handleTableActions);
}

export function renderParcelsPage() {
    if (!parcelsPageView) return;

    const filteredParcels = getFilteredParcels();

    let enrichedParcels = filteredParcels.map(p => {
        const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
        const trip = (state.collections.Trips || []).find(t => t.id === p.TripId);
        const route = trip ? (state.collections.Routes || []).find(r => r.id === trip.RouteId) : null;
        const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;

        let stationBegin = '—';
        let stationEnd = '—';

        if (client && country) {
            const townUA = getDisplayValue('Clients', 'TownIdUA', client.TownIdUA);
            const townEU = getDisplayValue('Clients', 'TownIdEU', client.TownIdEU);
            stationBegin = country.Cod === 0 ? townUA : townEU;
            stationEnd = country.Cod === 0 ? townEU : townUA;
        }
        return {
            ...p,
            ClientName: client?.Name || '',
            ClientNP: client?.NPNum || '',
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
        return;
    }

    const tableHTML = `
        <table class="min-w-full bg-white">
            <thead id="parcels-table-head" class="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <tr>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="ClientName">Клієнт</th>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="StationBegin">Відправлення</th>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="StationEnd">Отримання</th>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="Name">Багаж</th>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="Money">Кошти</th>
                    <th class="py-3 px-6 text-left cursor-pointer" data-sort-key="ClientNP">Нова Пошта</th>
                    <th class="py-3 px-6 text-center">Дії</th>
                </tr>
            </thead>
            <tbody class="text-gray-600 text-sm font-light">
                ${enrichedParcels.map(p => renderParcelRow(p)).join('')}
            </tbody>
        </table>
    `;
    parcelsTableContainer.innerHTML = tableHTML;

    const thead = document.getElementById('parcels-table-head');
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

function renderParcelRow(parcel) {
    const isUnpaid = parcel.Paid === false;
    const rowClass = isUnpaid ? 'bg-pink-100' : 'border-b border-gray-200 hover:bg-gray-100';

    return `
        <tr class="${rowClass} cursor-pointer" data-id="${parcel.id}">
            <td class="py-3 px-6 text-left whitespace-nowrap">${parcel.ClientName || 'N/A'}</td>
            <td class="py-3 px-6 text-left">${parcel.StationBegin}</td>
            <td class="py-3 px-6 text-left">${parcel.StationEnd}</td>
            <td class="py-3 px-6 text-left">${parcel.Name || ''}</td>
            <td class="py-3 px-6 text-left">${parcel.Money || ''}</td>
            <td class="py-3 px-6 text-left">${parcel.ClientNP || ''}</td>
            <td class="py-3 px-6 text-center">
                <div class="flex item-center justify-center">
                    <button class="w-6 h-6 text-gray-500 hover:text-blue-600" data-action="edit" title="Редагувати"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button>
                    <button class="w-6 h-6 text-gray-500 hover:text-red-600 ml-2" data-action="delete" title="Видалити"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>
        </tr>
    `;
}
