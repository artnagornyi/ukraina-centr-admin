// js/ui/autocomplete.js
import { state, DIRECTORIES } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openDirectoryModal } from './modal.js';

export function setupAutocomplete(modalScope, key, collectionName) {
    const input = modalScope.querySelector(`#autocomplete-input-${key}`);
    const hiddenInput = modalScope.querySelector(`input[name="${key}"]`);
    const resultsContainer = modalScope.querySelector(`#autocomplete-results-${key}`);
    const actionBtn = modalScope.querySelector(`#action-btn-${key}`); // Use the generic action button

    if (!input || !hiddenInput || !resultsContainer) return;

    let activeIndex = -1;

    const renderResults = (searchTerm = '') => {
        let sourceData = [...(state.collections[collectionName] || [])];
        
        if (collectionName === 'Trips') {
            sourceData.sort((a, b) => (a.Date?.seconds || 0) - (b.Date?.seconds || 0)); // Oldest first
        } else {
            sourceData.sort((a, b) => 
                getDisplayValue(collectionName, key, a.id).localeCompare(getDisplayValue(collectionName, key, b.id), undefined, { numeric: true })
            );
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = lowerCaseSearchTerm
            ? sourceData.filter(item => getDisplayValue(collectionName, key, item.id).toLowerCase().includes(lowerCaseSearchTerm))
            : sourceData;

        if (filtered.length > 0) {
            resultsContainer.innerHTML = filtered.map(s => `<div class="autocomplete-item" data-id="${s.id}">${getDisplayValue(collectionName, key, s.id)}</div>`).join('');
        } else if (searchTerm && key === 'ClientId') {
            resultsContainer.innerHTML = `<div class="p-2 text-blue-500 cursor-pointer hover:bg-blue-50" id="create-new-from-autocomplete">Не знайдено. Створити нового клієнта?</div>`;
        } else if (searchTerm) {
            resultsContainer.innerHTML = '<div class="p-2 text-gray-500">Не знайдено.</div>';
        } else {
            resultsContainer.innerHTML = '<div class="p-2 text-gray-500">Немає записів.</div>';
        }
        resultsContainer.classList.remove('hidden');
        activeIndex = -1;
    };

    const setActiveItem = () => {
        const items = resultsContainer.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => item.classList.toggle('autocomplete-active', index === activeIndex));
        if (items[activeIndex]) {
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    };

    const moveToNextField = () => {
        const allFocusable = Array.from(modalScope.querySelectorAll('input:not([type=hidden]), textarea'));
        let currentIndex = allFocusable.indexOf(input);
        let nextElement = allFocusable[currentIndex + 1];

        if (input.id.startsWith('autocomplete-input-TownId') && nextElement && nextElement.id.startsWith('autocomplete-input-StationId')) {
            if (nextElement.value && nextElement.value !== '—') {
                nextElement = allFocusable[currentIndex + 2];
            }
        }

        if (nextElement) {
            nextElement.focus();
            if (typeof nextElement.select === 'function') nextElement.select();
        } else {
            modalScope.querySelector('button[type="submit"]')?.focus();
        }
    };

    const onSelect = (id, name) => {
        input.value = name;
        hiddenInput.value = id;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        resultsContainer.classList.add('hidden');
        activeIndex = -1;

        if (collectionName === 'Towns') {
            const town = (state.collections.Towns || []).find(t => t.id === id);
            if (town?.StationId) {
                const form = input.closest('form');
                const stationKey = (key === 'TownIdUA') ? 'StationIdUA' : (key === 'TownIdEU') ? 'StationIdEU' : 'StationId';
                const stationHiddenInput = form.querySelector(`input[name="${stationKey}"]`);
                const stationVisibleInput = form.querySelector(`#autocomplete-input-${stationKey}`);
                if (stationHiddenInput && stationVisibleInput) {
                    stationHiddenInput.value = town.StationId;
                    stationVisibleInput.value = getDisplayValue(null, stationKey, town.StationId);
                }
            }
        }
    };

    input.addEventListener('focus', () => {
        input.select();
    });

    input.addEventListener('click', () => {
        if (resultsContainer.classList.contains('hidden')) {
            renderResults(input.value);
        }
    });

    input.addEventListener('input', () => {
        hiddenInput.value = '';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        renderResults(input.value);
    });

    input.addEventListener('keydown', e => {
        const items = resultsContainer.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (resultsContainer.classList.contains('hidden')) {
                    renderResults(input.value);
                } else if (activeIndex < items.length - 1) {
                    activeIndex++;
                    setActiveItem();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (activeIndex > 0) {
                    activeIndex--;
                    setActiveItem();
                }
                break;
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (activeIndex > -1 && items[activeIndex]) {
                    items[activeIndex].click();
                } else {
                    const perfectMatch = (state.collections[collectionName] || []).find(item =>
                        getDisplayValue(collectionName, key, item.id).toLowerCase() === input.value.trim().toLowerCase()
                    );
                    if (perfectMatch) {
                        onSelect(perfectMatch.id, getDisplayValue(collectionName, key, perfectMatch.id));
                        moveToNextField();
                    } else if (input.value.trim() !== '' && key === 'ClientId') {
                        resultsContainer.classList.add('hidden');
                        const defaultName = { Name: input.value };
                        openDirectoryModal(collectionName, null, defaultName, (newItem) => {
                            if (newItem?.id) {
                                onSelect(newItem.id, newItem.Name);
                                moveToNextField();
                            }
                        });
                    } else {
                        moveToNextField();
                    }
                }
                break;
            case 'F4':
                 e.preventDefault();
                 if (actionBtn) actionBtn.click();
                 break;
            case 'Escape':
                resultsContainer.classList.add('hidden');
                break;
        }
    });

    resultsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('autocomplete-item')) {
            const id = e.target.dataset.id;
            onSelect(id, e.target.textContent);
            moveToNextField();
        } else if (e.target.id === 'create-new-from-autocomplete') {
            resultsContainer.classList.add('hidden');
            const defaultName = { Name: input.value };
            openDirectoryModal('Clients', null, defaultName, (newItem) => {
                if (newItem?.id) {
                    onSelect(newItem.id, newItem.Name);
                    moveToNextField();
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}
