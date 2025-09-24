// js/utils.js
import { state, FK_MAP } from './state.js';

export function formatDate(timestamp, format = 'dd.mm.yy') {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'dd.mm.yy') {
        return `${day}.${month}.${String(year).slice(-2)}`;
    }
    if (format === 'dd.mm.yyyy') {
        return `${day}.${month}.${year}`;
    }
    return `${day}.${month}.${year}`;
}

export function parseDateString(dateStr) {
    if (!dateStr || (!/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr) && !/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr))) return null;
    const parts = dateStr.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
        return date;
    }
    return null;
}

export function getDisplayValue(parentCollectionName, key, value) {
    if (value === null || typeof value === 'undefined') return '—';
    const refCollectionName = FK_MAP[key];
    const refItem = refCollectionName ? (state.collections[refCollectionName] || []).find(i => i.id === value) : null;

    if (refItem) {
        if (key === 'TripId') {
            const route = state.collections.Routes?.find(r => r.id === refItem.RouteId);
            return `${refItem.Date ? formatDate(refItem.Date, 'dd.mm.yy') : 'N/A'} - ${route?.Name || '...'}`;
        }
        if (key === 'BusId') {
            return `${refItem.Plate || ''} - ${refItem.Name || ''}`;
        }
        return refItem.Name || refItem.Plate || refItem.Cod || refItem.username || 'N/A';
    }
    if (key === 'Date' && value.seconds) return formatDate(value, 'dd.mm.yy');
    return value;
}

export function getNextSelectable(rows, currentSelectedId, direction) {
    if (!rows || rows.length === 0) {
        return { nextId: null, nextRow: null };
    }

    const currentIndex = rows.findIndex(row => row.dataset.id === currentSelectedId);

    let nextIndex = currentIndex;
    if (direction === 'down') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    } else if (direction === 'up') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    } else if (currentIndex === -1) { // if nothing is selected, select the first
        nextIndex = 0;
    }


    const nextRow = rows[nextIndex] || null;
    const nextId = nextRow ? nextRow.dataset.id : null;

    return { nextId, nextRow };
}
