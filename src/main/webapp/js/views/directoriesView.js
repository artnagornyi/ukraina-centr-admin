// js/views/directoriesView.js
import { db } from '../firebase.js';
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state, DIRECTORIES } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openDirectoryModal, openConfirmModal } from '../ui/modal.js';

let directoriesPageView, directoryTabs, directoryTitle, directorySearchInput, addDirectoryItemBtn, directoryTableContainer, stationCountryFilter;

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
            <tr data-id="${item.id}" data-collection="${state.currentDirectory}" class="cursor-pointer border-b border-gray-200 hover:bg-gray-50">
                ${cells}
                <td class="p-3">
                    <button class="edit-item-btn text-gray-500 hover:text-blue-600" data-id="${item.id}" data-collection="${state.currentDirectory}">✏️</button>
                    <button class="delete-item-btn text-gray-500 hover:text-red-600" data-id="${item.id}" data-name="${item.Name || item.Plate || getDisplayValue(null, 'Date', item.Date)}" data-collection="${state.currentDirectory}">🗑️</button>
                </td>
            </tr>`;
    }).join('');

    directoryTableContainer.innerHTML = `<table class="w-full text-left"><thead class="bg-gray-50 border-b-2 border-gray-200"><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
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
                <button id="add-directory-item-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">Додати запис</button>
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

        openDirectoryModal(collection, id);
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
}
