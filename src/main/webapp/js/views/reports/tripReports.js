// js/views/reports/tripReports.js
import { state } from '../../state.js';
import { getTripData, formatDate } from '../../utils.js';

export function generateCallListReport(reportDisplayArea, tripReportsSection) {
    const data = getTripData(state.selectedTripId, 'Passengers');
    if (!data) return;
    const { trip, route, bus, driver, items: passengers } = data;

    const groupedByStation = passengers.reduce((groups, p) => {
        const stationId = p.stationBegin?.id || 'unknown';
        if (!groups[stationId]) {
            groups[stationId] = {
                name: p.stationBegin?.Name || 'Невідомо',
                code: p.stationBegin?.Cod || 0,
                passengers: []
            };
        }
        groups[stationId].passengers.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => groupedByStation[a].code - groupedByStation[b].code);

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt;">
            <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="text-align: right; font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yy')}</span>
            </div>
        </div>
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse;">
            <tbody>`;

    if (passengers.length === 0) {
        reportHTML = '<p class="text-center text-gray-500">Пасажирів для цього рейсу не знайдено.</p>';
    } else {
        sortedGroupKeys.forEach(stationId => {
            const group = groupedByStation[stationId];
            reportHTML += `<tr class="group-header-row"><td colspan="5" style="font-size: 10pt; font-weight: bold; text-align: left; padding-top: 0.5rem;">${group.name}</td></tr>`;

            group.passengers.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            group.passengers.forEach((p, index) => {
                const statusMarker = p.Status ? '+' : ' ';
                const telUA = p.client?.TelUA ? `+38${p.client.TelUA}` : '';
                const telEU = p.client?.TelEU ? `+39${p.client.TelEU}` : '';
                const phones = [telUA, telEU].filter(Boolean).join(', ');
                reportHTML += `
                <tr class="passenger-row">
                    <td style="width: 5%;">${index + 1}. ${statusMarker}</td>
                    <td style="width: 30%;">${p.client?.Name || ''}</td>
                    <td style="width: 35%;">${p.townBegin?.Name || ''} - ${p.townEnd?.Name || ''}</td>
                    <td style="width: 30%;">${phones}</td>
                </tr>`;
            });
        });
        reportHTML += `</tbody></table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    tripReportsSection.querySelector('.print-report-btn').classList.remove('hidden');
}

export function generateDepartureReport(reportDisplayArea, tripReportsSection) {
    const data = getTripData(state.selectedTripId, 'Passengers');
    if (!data) return;
    const { trip, route, bus, driver, items: passengers } = data;

    const groupedByStation = passengers.reduce((groups, p) => {
        const stationId = p.stationBegin?.id || 'unknown';
        if (!groups[stationId]) {
            groups[stationId] = {
                name: p.stationBegin?.Name || 'Невідомо',
                code: p.stationBegin?.Cod || 0,
                time: p.stationBegin?.TimeBegin || '',
                passengers: []
            };
        }
        groups[stationId].passengers.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => groupedByStation[a].code - groupedByStation[b].code);
    let tableBodyHTML = '';
    let passengerThroughCount = 0;
    sortedGroupKeys.forEach(stationId => {
        const group = groupedByStation[stationId];
        tableBodyHTML += `<tr class="group-header-row"><td colspan="4" style="text-align: right; padding: 4px; font-size: 10pt;">${group.name} <strong>${group.time}</strong></td></tr>`;
        group.passengers.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));
        group.passengers.forEach((p, index) => {
            passengerThroughCount++;
            const statusLine = [p.Status ? '+' : '', p.Place ? '<strong>!h</strong>' : ''].filter(Boolean).join(' ');
            const telUA = (p.client?.TelUA || '').split(',')[0].trim();
            const telEU = (p.client?.TelEU || '').split(',')[0].trim();
            const phones = [telUA, telEU].filter(Boolean).join(', ');
            const agentName = p.AgentId ? ` <span style="font-size: 8pt; color: #555;">(${(state.collections.Agents.find(a => a.id === p.AgentId) || {}).Name || ''})</span>` : '';

            tableBodyHTML += `
                <tr class="passenger-row">
                    <td style="text-align: center; width: 1%; white-space: nowrap; vertical-align: top; font-size: 9pt;">
                        <div>${index + 1} / <strong>${passengerThroughCount}</strong></div>
                        <div>${statusLine}</div>
                    </td>
                    <td class="passenger-name-cell" style="padding: 2px 4px; vertical-align: top; width: 45%;">
                        <div style="font-size: 10pt;">${p.client?.Name || ''}${agentName}</div>
                        <div style="font-size: 8pt;">${p.stationEnd?.Name || '—'} ${p.Place ? '<strong>+ додаткове місце!</strong>' : ''}</div>
                    </td>
                    <td style="border-left: 1px solid #ccc; padding: 2px 4px; vertical-align: middle; text-align: center; width: 15%; font-size: 9pt;">
                        ${p.Ticket ? '<div style="font-size: 8pt; font-weight: bold;">квиток</div>' : ''}
                    </td>
                    <td class="phones-cell" style="border-left: 1px solid #ccc; padding: 2px 4px; vertical-align: top; font-size: 9pt; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <div>${phones}</div>
                        <div>${p.Note || ''}</div>
                    </td>
                </tr>`;
        });
    });

    const additionalSeatsCount = passengers.filter(p => p.Place).length;
    reportDisplayArea.innerHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 0.25rem;">
            <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="text-align: right; font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yy')}</span>
            </div>
            <div style="font-size: 10pt;">
                <span>Пасажирів всього: </span><strong>${passengers.length}</strong><span> + додаткових місць: </span><strong>${additionalSeatsCount}</strong>
            </div>
        </div>
        <table class="report-table departure-report-table" style="font-size: 9pt;"><tbody>${tableBodyHTML}</tbody></table>`;
    tripReportsSection.querySelector('.print-report-btn').classList.remove('hidden');
}

export function generateArrivalReport(reportDisplayArea, tripReportsSection) {
    const data = getTripData(state.selectedTripId, 'Passengers');
    if (!data) return;
    const { trip, route, bus, driver, items: passengers } = data;

    const groupedByStation = passengers.reduce((groups, p) => {
        const stationId = p.stationEnd?.id || 'unknown';
        if (!groups[stationId]) {
            groups[stationId] = {
                name: p.stationEnd?.Name || 'Невідомо',
                code: p.stationEnd?.Cod || 0,
                time: p.stationEnd?.TimeEnd || '',
                passengers: []
            };
        }
        groups[stationId].passengers.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => groupedByStation[b].code - groupedByStation[a].code);
    let tableBodyHTML = '';
    let passengerThroughCount = 0;
    sortedGroupKeys.forEach(stationId => {
        const group = groupedByStation[stationId];
        group.passengers.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));
        group.passengers.forEach((p, index) => {
            passengerThroughCount++;
            const isFirstInGroup = index === 0;
            const stationCellContent = isFirstInGroup ? `<div style="white-space: nowrap; font-size: 10pt;"><strong>${group.time}</strong> ${group.name}</div>` : '';
            tableBodyHTML += `
                <tr class="passenger-row" ${isFirstInGroup ? 'style="border-top: 2px solid #000;"' : ''}>
                    <td style="width: 25%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${stationCellContent}</td>
                    <td style="width: 10%; text-align: center;">${index + 1} / <strong>${passengerThroughCount}</strong></td>
                    <td style="width: 30%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10pt;">${p.client?.Name || ''}</td>
                    <td style="width: 20%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.townEnd?.Name || ''}</td>
                    <td style="width: 15%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></td>
                </tr>`;
        });
    });

    reportDisplayArea.innerHTML = `
        <div class="report-header" style="font-size: 11pt;">
             <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="text-align: right; font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yy')}</span>
            </div>
        </div>
        <table class="report-table" style="font-size: 8pt;"><tbody>${tableBodyHTML}</tbody></table>`;
    tripReportsSection.querySelector('.print-report-btn').classList.remove('hidden');
}

export function generateTransitReport(reportDisplayArea, tripReportsSection) {
    const data = getTripData(state.selectedTripId, 'Passengers');
    if (!data) return;
    const { trip, route, bus, driver, items: passengers } = data;

    const transitPassengers = passengers
        .filter(p => (p.stationBegin?.Name || '').startsWith("Tranzit") || (p.stationEnd?.Name || '').startsWith("Tranzit"))
        .sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

    if (transitPassengers.length === 0) {
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Транзитних пасажирів на цьому рейсі не знайдено.</p>';
        tripReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt;">
             <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yy')}</span>
            </div>
        </div>
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse;">
            <thead style="font-size: 10pt;">
                <tr style="text-align: left;">
                    <th style="width: 5%; padding: 4px; border-bottom: 1px solid #000;">№</th>
                    <th style="width: 25%; padding: 4px; border-bottom: 1px solid #000;">Ім'я</th>
                    <th style="width: 30%; padding: 4px; border-bottom: 1px solid #000;">Маршрут</th>
                    <th style="width: 20%; padding: 4px; border-bottom: 1px solid #000;">Телефон UA</th>
                    <th style="width: 20%; padding: 4px; border-bottom: 1px solid #000;">Телефон EU</th>
                </tr>
            </thead>
            <tbody>`;

    transitPassengers.forEach((p, index) => {
        const telUA = p.client?.TelUA || '';
        const telEU = p.client?.TelEU || '';
        reportHTML += `
            <tr class="passenger-row">
                <td>${index + 1}.</td>
                <td>${p.client?.Name || ''}</td>
                <td>${p.townBegin?.Name || ''} - ${p.townEnd?.Name || ''}</td>
                <td>${telUA}</td>
                <td>${telEU}</td>
            </tr>`;
    });

    reportHTML += `</tbody></table>`;
    reportDisplayArea.innerHTML = reportHTML;
    tripReportsSection.querySelector('.print-report-btn').classList.remove('hidden');
}
