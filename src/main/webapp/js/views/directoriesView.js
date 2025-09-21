// js/views/directoriesView.js
import { db } from '../firebase.js';
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state, DIRECTORIES } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openDirectoryModal, openConfirmModal } from '../ui/modal.js';

let directoriesPageView, directoryTabs, directoryTitle, directorySearchInput, addDirectoryItemBtn, directoryTableContainer, stationCountryFilter;

state.selectedDirectoryItemId = null;

const DIRECTORY_ICONS = {
    Clients: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
    Trips: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    Routes: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3" /></svg>`,
    Buses: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V8z" /></svg>`,
    Drivers: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`,
    Agents: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`,
    Stations: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    Towns: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    Country: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>`,
};

function updateRowHighlights() {
    const rows = directoryTableContainer.querySelectorAll('tbody tr[data-id]');
    rows.forEach(row => {
        if (row.dataset.id === state.selectedDirectoryItemId) {
            row.classList.add('bg-blue-200');
            row.classList.remove('hover:bg-gray-50');
        } else {
            row.classList.remove('bg-blue-200');
            row.classList.add('hover:bg-gray-50');
        }
    });
}

export function renderDirectoryPage() {
    if (!directoriesPageView) return;
    directoryTitle.textContent = DIRECTORIES[state.currentDirectory].title;
    const stationFilterContainer = document.getElementById('station-filter-container');

    if (['Stations', 'Towns'].includes(state.currentDirectory)) {
        populateCountryFilter();
        stationFilterContainer.classList.remove('hidden');
        stationFilterContainer.classList.add('flex');
    } else {
        stationFilterContainer.classList.add('hidden');
    }
    renderDirectoryTable();
}

function renderDirectoryTabs() {
    const directoryKeys = Object.keys(DIRECTORIES).filter(key => key !== 'Passengers' && key !== 'Parcels');
    directoryTabs.innerHTML = directoryKeys.map(key => `
        <button data-dir="${key}" class="dir-tab-btn flex items-center gap-2 px-4 py-2 text-sm rounded-md ${state.currentDirectory === key ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            ${DIRECTORY_ICONS[key] || ''}
            <span>${DIRECTORIES[key].title}</span>
        </button>`).join('');
}

function populateCountryFilter() {
    const countries = (state.collections.Country || []).sort((a, b) => a.Name.localeCompare(b.Name));
    stationCountryFilter.innerHTML = '<option value="all">Всі країни</option>' + countries.map(c => `<option value="${c.id}">${c.Name}</option>`).join('');
    stationCountryFilter.value = state.stationCountryFilter || 'all';
}

function renderDirectoryTable() {
    const directory = DIRECTORIES[state.currentDirectory];
    let data = [...(state.collections[state.currentDirectory] || [])];

    // Filtering logic
    if (['Stations', 'Towns'].includes(state.currentDirectory) && state.stationCountryFilter && state.stationCountryFilter !== 'all') {
        const euCountry = (state.collections.Country || []).find(c => c.Name === 'European Union');
        const uaCountry = (state.collections.Country || []).find(c => c.Name === 'Україна');

        if (euCountry && state.stationCountryFilter === euCountry.id) {
            if (uaCountry) {
                data = data.filter(item => item.CountryId !== uaCountry.id);
            }
        } else {
            data = data.filter(item => item.CountryId === state.stationCountryFilter);
        }
    }

    if (state.directorySearchTerm) {
        const term = state.directorySearchTerm.toLowerCase();
        data = data.filter(item =>
            Object.keys(directory.fields).some(key =>
                getDisplayValue(state.currentDirectory, key, item[key]).toString().toLowerCase().includes(term)
            )
        );
    }

    // Sorting logic
    const sortConfig = state.directorySortConfig || { key: Object.keys(directory.fields)[0], direction: 'ascending' };
    const { key, direction } = sortConfig;
    if (key) {
        data.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];

            if (directory.fields[key]?.type === 'date') {
                valA = valA?.seconds || 0;
                valB = valB?.seconds || 0;
            } else {
                valA = getDisplayValue(state.currentDirectory, key, valA) || '';
                valB = getDisplayValue(state.currentDirectory, key, valB) || '';
            }

            const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return direction === 'ascending' ? comparison : -comparison;
        });
    }

    if (data.length === 0) {
        state.selectedDirectoryItemId = null;
    }
    if (state.selectedDirectoryItemId && !data.some(d => d.id === state.selectedDirectoryItemId)) {
        state.selectedDirectoryItemId = null;
    }

    // Rendering HTML
    const headers = Object.keys(directory.fields).map(k =>
        `<th class="p-3 text-sm font-semibold tracking-wide cursor-pointer" data-sort-key="${k}">${directory.fields[k].label} ${key === k ? (direction === 'ascending' ? '▲' : '▼') : ''}</th>`
    ).join('') + '<th class="p-3">Дії</th>';

    const rows = data.map(item => {
        let cells = Object.keys(directory.fields).map(fieldKey => {
            if (state.currentDirectory === 'Stations' && fieldKey === 'Cod') {
                return `<td class="p-1"><input type="text" value="${item[fieldKey] || ''}" data-id="${item.id}" data-key="Cod" class="w-20 p-2 border border-gray-200 rounded-md text-center cod-input"></td>`;
            }
            return `<td class="p-3 text-sm">${getDisplayValue(state.currentDirectory, fieldKey, item[fieldKey])}</td>`;
        }).join('');

        return `
            <tr data-id="${item.id}" data-collection="${state.currentDirectory}" class="cursor-pointer border-b border-gray-200">
                ${cells}
                <td class="p-3">
                    <button class="edit-item-btn text-gray-500 hover:text-blue-600" data-id="${item.id}" data-collection="${state.currentDirectory}">✏️</button>
                    <button class="delete-item-btn text-gray-500 hover:text-red-600" data-id="${item.id}" data-name="${item.Name || item.Plate || getDisplayValue(null, 'Date', item.Date)}" data-collection="${state.currentDirectory}">🗑️</button>
                </td>
            </tr>`;
    }).join('');

    directoryTableContainer.innerHTML = `<table class="w-full text-left"><thead class="bg-gray-50 border-b-2 border-gray-200"><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    updateRowHighlights();
}

function handleKeyboardNavigation(e) {
    if (state.currentView !== 'directories' || document.querySelector('.modal-overlay')) return;

    const rows = Array.from(directoryTableContainer.querySelectorAll('tbody tr[data-id]'));
    if (rows.length === 0) return;

    if (e.key === 'Enter' && state.selectedDirectoryItemId) {
        e.preventDefault();
        openDirectoryModal(state.currentDirectory, state.selectedDirectoryItemId);
        return;
    }

    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    let currentIndex = -1;
    if (state.selectedDirectoryItemId) {
        currentIndex = rows.findIndex(row => row.dataset.id === state.selectedDirectoryItemId);
    }

    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    }

    const nextRow = rows[nextIndex];
    if (nextRow) {
        state.selectedDirectoryItemId = nextRow.dataset.id;
        updateRowHighlights();
        nextRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function initDirectoriesView() {
    directoriesPageView = document.getElementById('directories-page-view');
    directoriesPageView.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-md mb-4">
            <div id="directory-tabs" class="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-4"></div>
            <div class="flex justify-between items-center mb-4">
                <h2 id="directory-title" class="text-2xl font-bold"></h2>
                <div class="flex items-center gap-4 flex-grow mx-4">
                    <div id="station-filter-container" class="items-center hidden">
                        <label for="station-country-filter" class="mr-2 text-sm font-medium">Країна:</label>
                        <select id="station-country-filter" class="p-2 border border-gray-300 rounded-md"></select>
                    </div>
                    <label for="directory-search-input" class="sr-only">Пошук у довіднику</label>
                    <input type="text" id="directory-search-input" placeholder="Пошук (F7)..." class="w-full p-2 border border-gray-300 rounded-md">
                </div>
                <button id="add-directory-item-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Додати запис</span>
                </button>
            </div>
            <div id="directory-table-container" class="overflow-x-auto"></div>
        </div>`;

    directoryTabs = document.getElementById('directory-tabs');
    directoryTitle = document.getElementById('directory-title');
    directorySearchInput = document.getElementById('directory-search-input');
    addDirectoryItemBtn = document.getElementById('add-directory-item-btn');
    directoryTableContainer = document.getElementById('directory-table-container');
    stationCountryFilter = document.getElementById('station-country-filter');

    renderDirectoryTabs();

    directoryTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.dir-tab-btn');
        if (tab) {
            state.currentDirectory = tab.dataset.dir;
            const firstField = Object.keys(DIRECTORIES[state.currentDirectory].fields)[0];
            let sortKey = firstField;
            if (state.currentDirectory === 'Trips') {
                sortKey = 'Date';
            }
            state.directorySortConfig = { key: sortKey, direction: 'ascending' };
            directorySearchInput.value = '';
            state.directorySearchTerm = '';
            state.stationCountryFilter = 'all';
            state.selectedDirectoryItemId = null; // Reset selection on tab change
            renderDirectoryTabs();
            renderDirectoryPage();
        }
    });

    addDirectoryItemBtn.addEventListener('click', () => {
        openDirectoryModal(state.currentDirectory);
    });

    directorySearchInput.addEventListener('input', (e) => {
        state.directorySearchTerm = e.target.value;
        renderDirectoryTable();
    });
    stationCountryFilter.addEventListener('change', (e) => {
        state.stationCountryFilter = e.target.value;
        renderDirectoryTable();
    });

    directoryTableContainer.addEventListener('click', (e) => {
        const target = e.target;

        const th = target.closest('th[data-sort-key]');
        if (th) {
            const key = th.dataset.sortKey;
            if (!state.directorySortConfig) state.directorySortConfig = { key: Object.keys(DIRECTORIES[state.currentDirectory].fields)[0], direction: 'ascending' };

            if (state.directorySortConfig.key === key) {
                state.directorySortConfig.direction = state.directorySortConfig.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                state.directorySortConfig.key = key;
                state.directorySortConfig.direction = 'ascending';
            }
            renderDirectoryTable();
            return;
        }

        const row = target.closest('tr[data-id]');
        if (!row) return;

        const id = row.dataset.id;
        const collection = row.dataset.collection;

        if (target.closest('button, input, a')) {
            const button = target.closest('button');
            if (button) {
                if (button.matches('.edit-item-btn')) {
                    openDirectoryModal(collection, id);
                } else if (button.matches('.delete-item-btn')) {
                    openConfirmModal(`Ви впевнені, що хочете видалити "${button.dataset.name}"?`, async () => {
                        await deleteDoc(doc(db, collection, id));
                    });
                }
            }
            return; 
        }
        
        state.selectedDirectoryItemId = id;
        updateRowHighlights();
    });

    directoryTableContainer.addEventListener('dblclick', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) {
            openDirectoryModal(row.dataset.collection, row.dataset.id);
        }
    });

    directoryTableContainer.addEventListener('blur', async (e) => {
        const input = e.target.closest('.cod-input');
        if (input) {
            const id = input.dataset.id;
            const key = input.dataset.key;
            const value = isNaN(parseInt(input.value, 10)) ? 0 : parseInt(input.value, 10);

            try {
                await setDoc(doc(db, 'Stations', id), { [key]: value }, { merge: true });
                input.classList.add('bg-green-100');
                setTimeout(() => input.classList.remove('bg-green-100'), 1000);
            } catch (error) {
                console.error("Error updating document:", error);
                input.classList.add('bg-red-100');
                setTimeout(() => input.classList.remove('bg-red-100'), 1000);
            }
        }
    }, true);

    document.addEventListener('keydown', handleKeyboardNavigation);
}
