// js/ui/autocomplete.js
import { state, DIRECTORIES } from '../state.js';
import { getDisplayValue } from '../utils.js';
import { openDirectoryModal } from './modal.js';

export function setupAutocomplete(modalScope, key, collectionName) {
    const input = modalScope.querySelector(`#autocomplete-input-${key}`);
    const hiddenInput = modalScope.querySelector(`input[name="${key}"]`);
    const resultsContainer = modalScope.querySelector(`#autocomplete-results-${key}`);
    const editBtn = modalScope.querySelector(`#edit-btn-${key}`);
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
        } else if (searchTerm) {
            resultsContainer.innerHTML = '<div class="p-2 text-gray-500">Не знайдено. ↓ для створення</div>';
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
        if(editBtn) editBtn.classList.remove('hidden');

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
                    const stationEditBtn = form.querySelector(`#edit-btn-${stationKey}`);
                    if(stationEditBtn) stationEditBtn.classList.remove('hidden');
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
        if(editBtn) editBtn.classList.add('hidden');
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
                } else if (items.length === 0 && input.value.trim() !== '') {
                    // If list is empty and user typed something, open create modal
                    resultsContainer.classList.add('hidden');
                    const defaultName = DIRECTORIES[collectionName].fields.Name ? { Name: input.value } : {};
                    openDirectoryModal(collectionName, null, defaultName, (newItem) => {
                        if (newItem?.id) {
                            onSelect(newItem.id, getDisplayValue(collectionName, key, newItem.id));
                            moveToNextField();
                        }
                    });
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
                    }
                    moveToNextField();
                }
                break;
            case 'F4':
                 e.preventDefault();
                 if (editBtn && !editBtn.classList.contains('hidden')) editBtn.click();
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
        }
    });

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const itemId = hiddenInput.value;
            if (itemId) {
                openDirectoryModal(collectionName, itemId, {}, (updatedItem) => {
                    if (updatedItem) input.value = getDisplayValue(collectionName, key, updatedItem.id);
                });
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}
