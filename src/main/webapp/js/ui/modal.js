// js/ui/modal.js
import { db } from '../firebase.js';
import { doc, setDoc, addDoc, query, collection, where, getDocs, Timestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state, DIRECTORIES, PASSENGER_FIELDS, PARCEL_FIELDS, DAY_OF_WEEK_MAP, FK_MAP } from '../state.js';
import { formatDate, parseDateString, getDisplayValue } from '../utils.js';
import { setupAutocomplete } from './autocomplete.js';
import { generateFormField } from './forms.js';

const modalContainer = document.getElementById('modal-container');

// Global handler for the Escape key to close any active modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = modalContainer.querySelectorAll('.modal-overlay');
        if (modals.length > 0) {
            const topModal = modals[modals.length - 1];
            e.preventDefault();
            e.stopPropagation();
            topModal.remove();
        }
    }
}, true);

export function openInfoModal(message) {
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content max-w-sm">
                <h3 class="text-lg font-medium mb-4">Інформація</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex justify-end">
                    <button class="modal-close-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">OK</button>
                </div>
            </div>
        </div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHTML);
    setupModal(modalContainer.lastElementChild);
}

export function openConfirmModal(message, onConfirm) {
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content max-w-sm">
                <h3 class="text-lg font-medium mb-4">Підтвердження дії</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex justify-end">
                    <button class="modal-close-btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Ні</button>
                    <button id="confirm-ok-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Так</button>
                </div>
            </div>
        </div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHTML);
    const newModal = modalContainer.lastElementChild;
    newModal.querySelector('#confirm-ok-btn').addEventListener('click', () => {
        onConfirm();
        newModal.remove();
    });
    setupModal(newModal);
}

export function openDirectoryModal(collectionName, itemId = null, defaults = {}, onSaveCallback = null) {
    const directory = DIRECTORIES[collectionName];
    const isEditing = itemId !== null;
    let item = isEditing
        ? (state.collections[collectionName] || []).find(i => i.id === itemId) || {}
        : { ...defaults };

    if (!isEditing && (collectionName === 'Stations' || collectionName === 'Towns') && !item.CountryId) {
        const ukraine = (state.collections.Country || []).find(c => c.Name === 'Україна');
        if (ukraine) item.CountryId = ukraine.id;
    }

    const title = `${isEditing ? 'Редагувати' : 'Додати'} ${directory.singularTitle}`;
    const formFieldsHTML = Object.keys(directory.fields).map(key => generateFormField(key, item[key] || '', collectionName)).join('');

    const modalHTML = `<div class="modal-overlay"><div class="modal-content"><form><h2 class="text-2xl font-bold mb-6">${title}</h2><div class="space-y-4">${formFieldsHTML}</div><div class="flex justify-end mt-6"><button type="button" class="modal-close-btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Скасувати</button><button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Зберегти</button></div></form></div></div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHTML);

    const newModal = modalContainer.lastElementChild;
    const form = newModal.querySelector('form');
    setupModal(newModal, (e) => handleDirectoryFormSubmit(e, collectionName, itemId, onSaveCallback));

    setupDynamicActionButtons(form, directory.fields, newModal);

    for (const key in directory.fields) {
        if (FK_MAP[key]) {
            setupAutocomplete(form, key, FK_MAP[key]);
        }
    }

    if (collectionName === 'Trips') {
        const dateInput = form.querySelector('input[name="Date"]');
        let datepicker;
        const updateAvailableDates = () => {
            const selectedRouteId = form.querySelector('input[name="RouteId"]').value;
            if (datepicker) datepicker.destroy();
            if (!selectedRouteId) {
                datepicker = new Datepicker(dateInput, { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
                return;
            }
            const route = state.collections.Routes.find(r => r.id === selectedRouteId);
            if (!route || !route.DayOfTheWeek) return;

            const existingTrips = (state.collections.Trips || []).filter(trip => trip.RouteId === selectedRouteId && trip.id !== itemId);
            const disabledDates = existingTrips.map(trip => trip.Date?.toDate()).filter(Boolean);
            const requiredDay = DAY_OF_WEEK_MAP[route.DayOfTheWeek];

            datepicker = new Datepicker(dateInput, {
                format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1,
                daysOfWeekDisabled: [0, 1, 2, 3, 4, 5, 6].filter(d => d !== requiredDay),
                datesDisabled: disabledDates
            });
        };
        const routeObserver = new MutationObserver(updateAvailableDates);
        routeObserver.observe(form.querySelector('input[name="RouteId"]'), { attributes: true, attributeFilter: ['value'] });
        updateAvailableDates();
    }
}

function setupDynamicActionButtons(form, fields, newModal) {
    for (const key in fields) {
        if (FK_MAP[key]) {
            const collectionName = FK_MAP[key];
            const actionButton = form.querySelector(`#action-btn-${key}`);
            const hiddenInput = form.querySelector(`input[name="${key}"]`);
            const visibleInput = form.querySelector(`#autocomplete-input-${key}`);

            if (!actionButton || !hiddenInput || !visibleInput) continue;

            let currentListener = null;

            const updateActionButton = (itemId) => {
                if (currentListener) {
                    actionButton.removeEventListener('click', currentListener);
                }

                if (itemId) {
                    actionButton.innerHTML = `<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 14H3v-2l9-9 2 2-9 9z"/></svg>`;
                    actionButton.title = `Редагувати (${getDisplayValue(collectionName, key, itemId)})`;
                    actionButton.classList.remove('text-blue-500', 'hover:text-blue-700');
                    actionButton.classList.add('text-gray-400', 'hover:text-gray-600');

                    currentListener = () => {
                        openDirectoryModal(collectionName, itemId, {}, (updatedItem) => {
                            if (updatedItem) {
                                hiddenInput.value = updatedItem.id;
                                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                                visibleInput.value = getDisplayValue(collectionName, key, updatedItem.id);
                            }
                        });
                    };
                } else {
                    actionButton.innerHTML = `<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>`;
                    actionButton.title = `Створити новий запис в \"${DIRECTORIES[collectionName].title}\"`;
                    actionButton.classList.remove('text-gray-400', 'hover:text-gray-600');
                    actionButton.classList.add('text-blue-500', 'hover:text-blue-700');

                    currentListener = () => {
                        const initialName = DIRECTORIES[collectionName]?.fields.Name ? { Name: visibleInput.value } : {};
                        openDirectoryModal(collectionName, null, initialName, (newItem) => {
                            if (newItem && newItem.id) {
                                hiddenInput.value = newItem.id;
                                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    };
                }
                actionButton.addEventListener('click', currentListener);
            };

            const observer = new MutationObserver(() => {
                updateActionButton(hiddenInput.value);
                if (key === 'ClientId') {
                    updateClientInfoDisplay(hiddenInput.value, newModal);
                }
            });
            observer.observe(hiddenInput, { attributes: true, attributeFilter: ['value'] });

            updateActionButton(hiddenInput.value);
        }
    }
}

export function openPassengerModal(passengerId = null) {
    const isEditing = passengerId !== null;
    const passenger = isEditing ? (state.collections.Passengers || []).find(p => p.id === passengerId) : {};
    const title = isEditing ? 'Редагувати пасажира' : 'Додати пасажира';

    const formFieldsHTML = Object.keys(PASSENGER_FIELDS).map(key => generateFormField(key, passenger?.[key] || '', 'Passengers')).join('');

    const modalHTML = `<div class="modal-overlay"><div class="modal-content"><form><h2 class="text-2xl font-bold mb-6">${title}</h2><div class="space-y-4">
            ${formFieldsHTML}
            <div id="client-info-display" class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 space-y-1 hidden"></div>
            <div class="flex items-center space-x-4"><label class="flex items-center"><input type="checkbox" name="Ticket" class="h-4 w-4" ${passenger?.Ticket ? 'checked' : ''}><span class="ml-2">Квиток</span></label><label class="flex items-center"><input type="checkbox" name="Status" class="h-4 w-4" ${passenger?.Status ? 'checked' : ''}><span class="ml-2">Підтверджено</span></label><label class="flex items-center"><input type="checkbox" name="Place" class="h-4 w-4" ${passenger?.Place ? 'checked' : ''}><span class="ml-2">Додаткове місце</span></label></div></div><div class="flex justify-end mt-6"><button type="button" class="modal-close-btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Скасувати</button><button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Зберегти</button></div></form></div></div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHTML);

    const newModal = modalContainer.lastElementChild;
    const form = newModal.querySelector('form');

    if (!isEditing && state.selectedTripId && state.selectedTripId !== 'all') {
        form.querySelector('input[name="TripId"]').value = state.selectedTripId;
        form.querySelector(`[data-key="TripId"]`).value = getDisplayValue('Passengers', 'TripId', state.selectedTripId);
    }

    const focusTargetId = isEditing ? 'textarea-Note' : 'autocomplete-input-ClientId';
    setupModal(newModal, (e) => handlePassengerFormSubmit(e, passengerId));

    for (const key in PASSENGER_FIELDS) {
        if (FK_MAP[key]) {
            setupAutocomplete(form, key, FK_MAP[key]);
        }
    }

    setupDynamicActionButtons(form, PASSENGER_FIELDS, newModal);
}

export function openParcelModal(parcelId = null) {
    const isEditing = parcelId !== null;
    const parcel = isEditing ? (state.collections.Parcels || []).find(p => p.id === parcelId) : {};
    const title = isEditing ? 'Редагувати посилку' : 'Додати посилку';

    const formFields = Object.keys(PARCEL_FIELDS).reduce((acc, key) => {
        acc[key] = generateFormField(key, parcel[key] || '', 'Parcels');
        return acc;
    }, {});

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <form>
                    <h2 class="text-2xl font-bold mb-6">${title}</h2>
                    <div class="space-y-4">
                        ${formFields.ClientId}
                        ${formFields.TripId}
                        <div id="agent-field-container">${formFields.AgentId}</div>
                        <div id="client-info-display" class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 space-y-1 hidden"></div>
                        ${formFields.Name}
                        <div class="flex gap-4">
                            <div class="w-1/2">${formFields.Weight || ''}</div>
                            <div class="w-1/2">${formFields.Money || ''}</div>
                        </div>
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" name="Paid" class="h-4 w-4" ${!isEditing || parcel.Paid ? 'checked' : ''}>
                                <span class="ml-2">Оплачено</span>
                            </label>
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="button" class="modal-close-btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Скасувати</button>
                        <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Зберегти</button>
                    </div>
                </form>
            </div>
        </div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHTML);

    const newModal = modalContainer.lastElementChild;
    const form = newModal.querySelector('form');

    if (!isEditing && state.selectedTripId && state.selectedTripId !== 'all') {
        form.querySelector('input[name="TripId"]').value = state.selectedTripId;
        form.querySelector(`[data-key="TripId"]`).value = getDisplayValue('Parcels', 'TripId', state.selectedTripId);
    }

    const focusTargetId = isEditing ? 'input-Name' : 'autocomplete-input-ClientId';
    setupModal(newModal, (e) => handleParcelFormSubmit(e, parcelId), focusTargetId);

    for (const key in PARCEL_FIELDS) {
        if (FK_MAP[key]) {
            setupAutocomplete(form, key, FK_MAP[key]);
        }
    }

    setupDynamicActionButtons(form, PARCEL_FIELDS, newModal);

    const tripHiddenInput = form.querySelector('input[name="TripId"]');
    const agentFieldContainer = form.querySelector('#agent-field-container');

    const toggleAgentField = (tripId) => {
        const trip = (state.collections.Trips || []).find(t => t.id === tripId);
        const route = trip ? (state.collections.Routes || []).find(r => r.id === trip.RouteId) : null;
        const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;
        const isFromUkraine = country ? country.Cod === 0 : true; // Default to true if no data
        agentFieldContainer.style.display = isFromUkraine ? 'none' : 'block';
    };

    if (tripHiddenInput) {
        toggleAgentField(tripHiddenInput.value);
        const observer = new MutationObserver(() => toggleAgentField(tripHiddenInput.value));
        observer.observe(tripHiddenInput, { attributes: true, attributeFilter: ['value'] });
    }
}

function updateClientInfoDisplay(clientId, scopeElement) {
    const infoDisplay = scopeElement.querySelector('#client-info-display');
    if (!infoDisplay) return;

    if (!clientId) {
        infoDisplay.innerHTML = '';
        infoDisplay.classList.add('hidden');
        return;
    }

    const client = (state.collections.Clients || []).find(c => c.id === clientId);
    if (!client) {
        infoDisplay.innerHTML = '';
        infoDisplay.classList.add('hidden');
        return;
    }

    infoDisplay.innerHTML = `
        <div><strong>UA:</strong> ${getDisplayValue('Clients', 'TownIdUA', client.TownIdUA)} / ${getDisplayValue('Clients', 'StationIdUA', client.StationIdUA)} | <strong>Тел:</strong> ${client.TelUA ? `+38${client.TelUA}` : ''}</div>
        <div><strong>EU:</strong> ${getDisplayValue('Clients', 'TownIdEU', client.TownIdEU)} / ${getDisplayValue('Clients', 'StationIdEU', client.StationIdEU)} | <strong>Тел:</strong> ${client.TelEU ? `+39${client.TelEU}` : ''}</div>
        <div><strong>Нова Пошта:</strong> ${client.NPNum || '—'}</div>
    `;
    infoDisplay.classList.remove('hidden');
}

function setupModal(modalElement, submitHandler, focusTargetId = null) {
    const form = modalElement.querySelector('form');
    if (submitHandler && form) {
        form.addEventListener('submit', submitHandler);
    }
    modalElement.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => modalElement.remove());
    });

    const focusableContent = Array.from(modalElement.querySelectorAll('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select, button'));
    const firstFocusableElement = focusableContent[0];
    const lastFocusableElement = focusableContent[focusableContent.length - 1];

    setTimeout(() => {
        const focusElement = focusTargetId ? modalElement.querySelector(`#${focusTargetId}`) : firstFocusableElement;
        if (focusElement) {
            focusElement.focus();
            if (typeof focusElement.select === 'function') {
                focusElement.select();
            }
        }
    }, 50);

    modalElement.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusableElement) {
                    lastFocusableElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusableElement) {
                    firstFocusableElement.focus();
                    e.preventDefault();
                }
            }
        }

        if (e.key === 'Enter' && form) {
            const target = e.target;
            if (target.matches('input[type="text"], input[type="number"], textarea')) {
                if (modalElement.querySelector('.autocomplete-results:not(.hidden)')) {
                    return;
                }
                e.preventDefault();
                const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)'));
                const currentIndex = inputs.indexOf(target);
                if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                    const nextElement = inputs[currentIndex + 1];
                    nextElement.focus();
                    if (typeof nextElement.select === 'function') {
                        nextElement.select();
                    }
                } else {
                    form.requestSubmit();
                }
            }
        }
    });
}

async function handleDirectoryFormSubmit(e, collectionName, itemId, onSaveCallback = null) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());

    Object.keys(data).forEach(key => {
        if (['Capacity', 'Cod', 'NPNum'].includes(key)) {
            data[key] = Number(data[key]) || 0;
        }
        if (key === 'Date' && data[key]) {
            const parsedDate = parseDateString(data[key]);
            if(parsedDate) {
                data[key] = Timestamp.fromDate(parsedDate);
            } else {
                delete data[key];
            }
        }
    });

    if (collectionName === 'Trips') {
        if (!data.RouteId || !data.Date) {
            return openInfoModal("Будь ласка, оберіть маршрут та дату для рейсу.");
        }
        const q = query(collection(db, 'Trips'), where("RouteId", "==", data.RouteId), where("Date", "==", data.Date));
        const existingTrips = await getDocs(q);
        if (!existingTrips.empty && existingTrips.docs[0].id !== itemId) {
            return openInfoModal(`Рейс для цього маршруту на вказану дату вже існує.`);
        }
    }

    try {
        if (itemId) {
            await setDoc(doc(db, collectionName, itemId), data, { merge: true });
            if (onSaveCallback) onSaveCallback({ id: itemId, ...data });
        } else {
            const newDocRef = await addDoc(collection(db, collectionName), data);
            if (onSaveCallback) onSaveCallback({ id: newDocRef.id, ...data });
        }
        form.closest('.modal-overlay')?.remove();
    } catch (error) {
        console.error("Error saving document: ", error);
        openInfoModal(`Помилка збереження: ${error.message}`);
    }
}

async function handlePassengerFormSubmit(e, passengerId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
        AgentId: formData.get('AgentId') || null,
        TripId: formData.get('TripId'),
        ClientId: formData.get('ClientId'),
        Note: formData.get('Note') || '',
        Ticket: formData.has('Ticket'),
        Status: formData.has('Status'),
        Place: formData.has('Place')
    };

    if (!data.ClientId) {
        return openInfoModal("Будь ласка, оберіть клієнта.");
    }

    // Check for open-dated ticket only when creating a new passenger
    if (!passengerId) {
        try {
            const openDateRoute = (state.collections.Routes || []).find(r => r.Cod === 0);
            if (openDateRoute) {
                const openDateTrip = (state.collections.Trips || []).find(t => t.RouteId === openDateRoute.id);
                if (openDateTrip) {
                    const openTicketPassenger = (state.collections.Passengers || []).find(p =>
                        p.ClientId === data.ClientId && p.TripId === openDateTrip.id && !p.Canceled
                    );

                    if (openTicketPassenger) {
                        if (!data.TripId || data.TripId === openDateTrip.id) {
                            return openInfoModal("Клієнт має квиток з відкритою датою. Будь ласка, оберіть дійсний рейс, щоб використати квиток.");
                        }

                        const client = (state.collections.Clients || []).find(c => c.id === data.ClientId);
                        const clientName = client?.Name || 'цього пасажира';

                        openConfirmModal(
                            `У пасажира "${clientName}" є квиток з відкритою датою! Використати його для цього рейсу?`,
                            async () => { // onConfirm callback
                                try {
                                    data.Ticket = true;
                                    data.Booking = Timestamp.now();
                                    await addDoc(collection(db, 'Passengers'), data);
                                    await deleteDoc(doc(db, 'Passengers', openTicketPassenger.id));
                                    form.closest('.modal-overlay')?.remove();
                                } catch (error) {
                                    console.error("Error using open-dated ticket:", error);
                                    openInfoModal(`Помилка використання квитка: ${error.message}`);
                                }
                            }
                        );
                        return; // Stop, wait for user confirmation.
                    }
                }
            }
        } catch (error) {
            console.error("Error checking for open-dated ticket:", error);
        }
    }

    // Standard validation and save logic
    if (!data.TripId) {
        return openInfoModal("Будь ласка, оберіть рейс.");
    }

    try {
        if (passengerId) {
            await setDoc(doc(db, 'Passengers', passengerId), data, { merge: true });
        } else {
            data.Booking = Timestamp.now();
            await addDoc(collection(db, 'Passengers'), data);
        }
        form.closest('.modal-overlay')?.remove();
    } catch (error) {
        console.error("Error saving passenger:", error);
        openInfoModal(`Помилка збереження пасажира: ${error.message}`);
    }
}


async function handleParcelFormSubmit(e, parcelId) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        TripId: formData.get('TripId'),
        ClientId: formData.get('ClientId'),
        AgentId: formData.get('AgentId') || null,
        Name: formData.get('Name') || '',
        Weight: formData.get('Weight') || '',
        Money: formData.get('Money') || '',
        Paid: formData.has('Paid'),
    };

    if (!data.TripId || !data.ClientId) {
        return openInfoModal("Будь ласка, оберіть рейс та клієнта.");
    }

    try {
        if (parcelId) {
            await setDoc(doc(db, 'Parcels', parcelId), data, { merge: true });
        } else {
            await addDoc(collection(db, 'Parcels'), data);
        }
        e.target.closest('.modal-overlay')?.remove();
    } catch (error) {
        console.error("Error saving parcel:", error);
        openInfoModal(`Помилка збереження посилки: ${error.message}`);
    }
}
