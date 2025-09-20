// js/tripSelector.js
import { state } from './state.js';
import { getDisplayValue } from './utils.js';

export function selectNextFutureTrip() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const futureTrips = (state.collections.Trips || [])
        .filter(t => t.Date && t.Date.toDate() >= now)
        .sort((a,b) => a.Date.seconds - b.Date.seconds);
    if (futureTrips.length > 0) {
        state.selectedTripId = futureTrips[0].id;
    } else {
        const pastTrips = (state.collections.Trips || []).sort((a,b) => b.Date.seconds - a.Date.seconds);
        if(pastTrips.length > 0) {
            state.selectedTripId = pastTrips[0].id;
        } else {
            state.selectedTripId = null;
        }
    }
}

export function selectDefaultTrip() {
    if (!state.selectedTripId && state.collections.Trips && state.collections.Trips.length > 0) {
        selectNextFutureTrip();
    }
}

export function updateTripSelectorDisplays() {
    const tripInput = document.getElementById('main-trip-select-input');
    const reportTripInput = document.getElementById('reports-trip-select-input');
    const parcelTripInput = document.getElementById('parcels-trip-select-input');
    const widthCalculator = document.getElementById('width-calculator');

    if (!widthCalculator) return;

    let displayName = state.selectedTripId
        ? (state.selectedTripId === 'all' ? 'Загальний список (всі дати)' : getDisplayValue('Passengers', 'TripId', state.selectedTripId))
        : '';

    const inputs = [tripInput, reportTripInput, parcelTripInput];
    inputs.forEach(input => {
        if (input) {
            input.value = displayName;
            widthCalculator.textContent = displayName || input.placeholder;
            const newWidth = widthCalculator.scrollWidth * 1.2; // Increase width by 20%
            input.style.width = `${newWidth}px`;
        }
    });
}

export function setupTripSelector(page, onTripChangeCallback) {
    const inputId = `${page}-trip-select-input`;
    const resultsId = `${page}-trip-select-results`;

    const input = document.getElementById(inputId);
    const resultsContainer = document.getElementById(resultsId);
    if (!input || !resultsContainer) return;

    const container = input.closest('.relative');
    if (!container) return;

    let activeIndex = -1;

    const onSelect = (tripId) => {
        state.selectedTripId = tripId;
        if (page === 'main') {
            state.passengerFilter = 'all';
        } else if (page === 'parcels') {
            state.parcelFilter = '';
        }
        updateTripSelectorDisplays();
        resultsContainer.classList.add('hidden');

        if (onTripChangeCallback) {
            onTripChangeCallback();
        }
    };

    const renderResults = (trips, includeAllOption = false) => {
        let allOption = includeAllOption ? `<div class="autocomplete-item" data-id="all">Загальний список (всі дати)</div>` : '';
        let tripOptions = trips.map(t => `<div class="autocomplete-item" data-id="${t.id}">${getDisplayValue('Passengers', 'TripId', t.id)}</div>`).join('');
        resultsContainer.innerHTML = allOption + tripOptions || '<div class="p-2 text-gray-500">Рейсів не знайдено</div>';
        resultsContainer.classList.remove('hidden');
        activeIndex = -1;
    };

    const showAllTrips = () => {
        const allTrips = (state.collections.Trips || []).sort((a,b) => a.Date.seconds - b.Date.seconds);
        const allowAllOption = (page === 'main');
        renderResults(allTrips, allowAllOption);
    };

    input.addEventListener('click', (e) => {
        e.stopPropagation();
        showAllTrips();
    });

    input.addEventListener('input', () => {
        const searchTerm = input.value.toLowerCase();
        if (!searchTerm) {
            resultsContainer.classList.add('hidden');
            return;
        }
        const filteredTrips = (state.collections.Trips || [])
            .filter(t => getDisplayValue('Passengers', 'TripId', t.id).toLowerCase().includes(searchTerm))
            .sort((a,b) => a.Date.seconds - b.Date.seconds);
        renderResults(filteredTrips, false);
    });

    input.addEventListener('keydown', e => {
        const items = resultsContainer.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (resultsContainer.classList.contains('hidden')) {
                showAllTrips();
            } else if (activeIndex < items.length - 1) {
                activeIndex++;
                items.forEach((item, index) => item.classList.toggle('autocomplete-active', index === activeIndex));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIndex > 0) {
                activeIndex--;
                items.forEach((item, index) => item.classList.toggle('autocomplete-active', index === activeIndex));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex > -1 && items[activeIndex]) {
                items[activeIndex].click();
            }
        } else if (e.key === 'Escape') {
            resultsContainer.classList.add('hidden');
        }
    });

    resultsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('autocomplete-item')) {
            onSelect(e.target.dataset.id);
        }
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}