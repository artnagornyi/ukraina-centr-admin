// js/ui/forms.js
import { DIRECTORIES, PASSENGER_FIELDS, PARCEL_FIELDS, FK_MAP } from '../state.js';
import { getDisplayValue, formatDate } from '../utils.js';

export function generateFormField(key, value, parentCollectionName) {
    const fieldConfig = DIRECTORIES[parentCollectionName]?.fields[key] || PASSENGER_FIELDS[key] || PARCEL_FIELDS[key];
    const label = fieldConfig?.label || key;
    
    let fieldHTML = `<div><label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>`;
    const refCollectionName = FK_MAP[key];

    if (refCollectionName) {
        const currentName = value ? getDisplayValue(parentCollectionName, key, value) : '';
        const editIconHTML = `
                <button type="button" id="edit-btn-${key}" class="hidden absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" title="Редагувати запис (F4)" tabindex="-1">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 14H3v-2l9-9 2 2-9 9z"/></svg>
                </button>
            `;
        fieldHTML += `
                 <div class="relative">
                     <input type="text" id="autocomplete-input-${key}" data-key="${key}" autocomplete="new-password" value="${currentName}" class="w-full border border-gray-300 rounded-md p-2 pr-10" placeholder="Введіть для пошуку...">
                     <input type="hidden" name="${key}" value="${value || ''}">
                     ${editIconHTML}
                     <div id="autocomplete-results-${key}" class="autocomplete-results hidden"></div>
                 </div>`;
    } else if (fieldConfig?.type === 'select' && fieldConfig.options) {
        fieldHTML += `<select name="${key}" class="w-full border border-gray-300 rounded-md p-2">${fieldConfig.options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}</select>`;
    } else if (fieldConfig?.type === 'date') {
        fieldHTML += `<input type="text" name="${key}" value="${value && value.seconds ? formatDate(value, 'dd.mm.yy') : ''}" class="w-full border border-gray-300 rounded-md p-2 date-input-mask" placeholder="дд.мм.рр">`;
    } else if (key === 'TimeBegin' || key === 'TimeEnd') {
        fieldHTML += `<input type="text" name="${key}" value="${value || ''}" class="w-full border border-gray-300 rounded-md p-2 time-input" placeholder="гг:хх">`;
    } else if (key === 'ISO') {
        fieldHTML += `<input type="text" name="${key}" value="${value || ''}" class="w-full border border-gray-300 rounded-md p-2" maxlength="2" style="text-transform: uppercase;" oninput="this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase()">`;
    } else if (fieldConfig?.type === 'password') {
        fieldHTML += `<input type="password" name="${key}" value="${value || ''}" class="w-full border border-gray-300 rounded-md p-2" autocomplete="new-password">`;
    } else {
        fieldHTML += `<input type="text" name="${key}" value="${value || ''}" class="w-full border border-gray-300 rounded-md p-2">`;
    }
    return fieldHTML + `</div>`;
}