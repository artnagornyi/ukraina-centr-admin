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
        
        const iconHTML = `<button type="button" id="action-btn-${key}" class="p-1 text-gray-400 hover:text-gray-600" tabindex="-1"><!-- Icon will be set dynamically --></button>`;

        fieldHTML += `
                 <div class="relative">
                     <input type="text" id="autocomplete-input-${key}" data-key="${key}" autocomplete="new-password" value="${currentName}" class="w-full border border-gray-300 rounded-md p-2 pr-10" placeholder="Введіть для пошуку...">
                     <input type="hidden" name="${key}" value="${value || ''}">
                     <div class="absolute inset-y-0 right-0 pr-1 flex items-center">${iconHTML}</div>
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