// js/views/Reports/parcelReports.js
import { state } from '../../state.js';
import { formatDate } from '../../utils.js';
import { getTripData } from '../reportUtils.js';

export function generateRomaReport(reportDisplayArea, parcelReportsSection) {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: allParcels } = data;

    if (country?.Cod !== 0) {
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів з України в ЄС.</p>';
        parcelReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    const parcels = allParcels.filter(p => p.stationEnd?.Cod >= 2000 && p.stationEnd?.Cod <= 2099);

    const groupedByStation = parcels.reduce((groups, p) => {
        const stationId = p.stationEnd?.id || 'unknown';
        if (!groups[stationId]) {
            groups[stationId] = {
                station: p.stationEnd,
                parcels: []
            };
        }
        groups[stationId].parcels.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => {
        const codeA = groupedByStation[a].station?.Cod || 0;
        const codeB = groupedByStation[b].station?.Cod || 0;
        return codeA - codeB;
    });

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 1rem;">
            <table style="width: 100%; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; border: none; padding: 0;">
                            <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
                            <span style="margin-left: 1rem;">${route?.Name || ''}</span>
                        </td>
                        <td style="text-align: right; border: none; padding: 0;">
                            <h3 style="font-weight: bold; margin: 0;">Roma</h3>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    if (parcels.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Посилок, що відповідають критеріям (код зупинки 2000-2099), не знайдено.</p>';
    } else {
        reportHTML += `
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <tbody>`;

        sortedGroupKeys.forEach((stationId, groupIndex) => {
            const group = groupedByStation[stationId];
            const stationName = group.station?.Name || 'Невідомо';

            reportHTML += `<tr class="group-header-row"><td colspan="7" style="border-bottom: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right; font-size: 10pt;">${stationName}</td></tr>`;

            const groupParcels = group.parcels;
            groupParcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            groupParcels.forEach((p, index) => {
                const phones = [p.client?.TelUA, p.client?.TelEU].filter(Boolean).join(', ');
                const moneyCellContent = p.Paid ? '<strong style="font-size: 8pt;">опл.</strong>' : (p.Money || '');
                reportHTML += `
                <tr class="passenger-row">
                    <td style="width: 3%; vertical-align: top; border-right: 1px solid #ccc; padding: 1px 4px;">${index + 1}.</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.Name || ''}</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.townEnd?.Name || ''}</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${phones}</td>
                    <td style="vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.Name || ''}</td>
                    <td style="width: 5%; vertical-align: top; text-align: center; padding: 1px 4px;">${p.Weight || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center; border-left: 1px solid #ccc; padding: 1px 4px;">${moneyCellContent}</td>
                </tr>`;
            });

            if (groupIndex < sortedGroupKeys.length - 1) {
                reportHTML += `<tr><td colspan="7" style="padding: 2px 0;"></td></tr>`;
            }
        });
        reportHTML += `</tbody></table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    parcelReportsSection.querySelector('.print-report-btn').classList.toggle('hidden', parcels.length === 0);
}

export function generateParcelDepartureCitiesReport(reportDisplayArea, parcelReportsSection) {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: allParcels } = data;

    if (country?.Cod !== 0) {
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів з України в ЄС.</p>';
        parcelReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    const parcels = allParcels.filter(p => p.stationEnd?.Cod > 2099);

    const groupedByStation = parcels.reduce((groups, p) => {
        const stationId = p.stationEnd?.id || 'unknown';
        if (!groups[stationId]) {
            groups[stationId] = {
                station: p.stationEnd,
                parcels: []
            };
        }
        groups[stationId].parcels.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => {
        const codeA = groupedByStation[a].station?.Cod || 0;
        const codeB = groupedByStation[b].station?.Cod || 0;
        return codeB - codeA;
    });

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 1rem;">
            <table style="width: 100%; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; border: none; padding: 0;">
                            <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
                            <span style="margin-left: 1rem;">${route?.Name || ''}</span>
                        </td>
                        <td style="text-align: right; border: none; padding: 0;">
                            <h3 style="font-weight: bold; margin: 0;">Відправка за містами</h3>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    if (parcels.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Посилок, що відповідають критеріям (код зупинки > 2099), не знайдено.</p>';
    } else {
        reportHTML += `
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <tbody>`;

        sortedGroupKeys.forEach((stationId, groupIndex) => {
            const group = groupedByStation[stationId];
            const stationName = group.station?.Name || 'Невідомо';

            reportHTML += `<tr class="group-header-row"><td colspan="7" style="border-bottom: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right; font-size: 10pt;">${stationName}</td></tr>`;

            const groupParcels = group.parcels;
            groupParcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            groupParcels.forEach((p, index) => {
                const phones = [p.client?.TelUA, p.client?.TelEU].filter(Boolean).join(', ');
                const moneyCellContent = p.Paid ? '<strong style="font-size: 8pt;">опл.</strong>' : (p.Money || '');
                reportHTML += `
                <tr class="passenger-row">
                    <td style="width: 3%; vertical-align: top; border-right: 1px solid #ccc; padding: 1px 4px;">${index + 1}.</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.Name || ''}</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.townEnd?.Name || ''}</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${phones}</td>
                    <td style="vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.Name || ''}</td>
                    <td style="width: 5%; vertical-align: top; text-align: center; padding: 1px 4px;">${p.Weight || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center; border-left: 1px solid #ccc; padding: 1px 4px;">${moneyCellContent}</td>
                </tr>`;
            });

            if (groupIndex < sortedGroupKeys.length - 1) {
                reportHTML += `<tr><td colspan="7" style="padding: 2px 0;"></td></tr>`;
            }
        });
        reportHTML += `</tbody></table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    parcelReportsSection.querySelector('.print-report-btn').classList.toggle('hidden', parcels.length === 0);
}

export function generateKropyvnytskyiReport(reportDisplayArea, parcelReportsSection) {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: allParcels } = data;

    if (country?.Cod === 0) { // Should be a trip TO Ukraine
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів на Україну.</p>';
        parcelReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    const kropParcels = allParcels.filter(p => p.townEnd?.Name === 'Кропивницький');

    const groupedByAgent = kropParcels.reduce((groups, p) => {
        const agentId = p.AgentId || 'no-agent';
        if (!groups[agentId]) {
            groups[agentId] = [];
        }
        groups[agentId].push(p);
        return groups;
    }, {});

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 1rem;">
            <table style="width: 100%; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; border: none; padding: 0;">
                            <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
                            <span style="margin-left: 1rem;">${route?.Name || ''}</span>
                        </td>
                        <td style="text-align: right; border: none; padding: 0;">
                            <h3 style="font-weight: bold; margin: 0;">Кропивницький</h3>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    if (kropParcels.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Посилок до м. Кропивницький для цього рейсу не знайдено.</p>';
    } else {
        const tableHead = `
            <thead style="background-color: #f2f2f2; border-bottom: 1px solid #000; font-size: 10pt;">
                 <tr style="font-weight: normal; text-align: center;">
                    <th style="width: 3%; padding: 4px; font-weight: normal; text-align: center; border: none; border-right: 1px solid #ccc;">№</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none;">Ім\'я клієнта</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none;">Телефон</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none; border-left: 1px solid #ccc;">Багаж</th>
                    <th style="width: 5%; padding: 4px; font-weight: normal; text-align: center; border: none;">Вага</th>
                    <th style="width: 10%; padding: 4px; font-weight: normal; text-align: center; border: none; border-left: 1px solid #ccc;">Кошти</th>
                </tr>
            </thead>`;

        let tableBody = '';
        const agentIds = Object.keys(groupedByAgent);

        agentIds.forEach(agentId => {
            const agent = (state.collections.Agents || []).find(a => a.id === agentId);
            const agentName = agent ? agent.Name : "Без агента";
            const parcels = groupedByAgent[agentId];

            tableBody += `<tr class="group-header-row"><td colspan="6" style="font-size: 10pt; font-weight: bold; text-align: left; padding-top: 0.5rem;">${agentName}</td></tr>`;

            parcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            parcels.forEach((p, index) => {
                const phones = [p.client?.TelUA, p.client?.TelEU].filter(Boolean).join(', ');
                const moneyCellContent = p.Money || '';
                tableBody += `
                    <tr class="passenger-row">
                        <td style="width: 3%; vertical-align: top; border-right: 1px solid #ccc; padding: 1px 4px;">${index + 1}.</td>
                        <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.Name || ''}</td>
                        <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${phones}</td>
                        <td style="vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.Name || ''}</td>
                        <td style="width: 5%; vertical-align: top; text-align: center; padding: 1px 4px;">${p.Weight || ''}</td>
                        <td style="width: 10%; vertical-align: top; text-align: center; border-left: 1px solid #ccc; padding: 1px 4px;">${moneyCellContent}</td>
                    </tr>`;
            });
        });

        reportHTML += `
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            ${tableHead}
            <tbody>${tableBody}</tbody>
        </table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    parcelReportsSection.querySelector('.print-report-btn').classList.toggle('hidden', kropParcels.length === 0);
}

export function generateNovaPoshtaReport(reportDisplayArea, parcelReportsSection) {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: allParcels } = data;

    if (country?.Cod === 0) { // Should be a trip TO Ukraine
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів на Україну.</p>';
        parcelReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    const npParcels = allParcels.filter(p => p.client?.NPNum);

    const groupedByAgent = npParcels.reduce((groups, p) => {
        const agentId = p.AgentId || 'no-agent';
        if (!groups[agentId]) {
            groups[agentId] = [];
        }
        groups[agentId].push(p);
        return groups;
    }, {});

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 1rem;">
            <table style="width: 100%; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; border: none; padding: 0;">
                            <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
                            <span style="margin-left: 1rem;">${route?.Name || ''}</span>
                        </td>
                        <td style="text-align: right; border: none; padding: 0;">
                            <h3 style="font-weight: bold; margin: 0;">Нова Пошта</h3>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    if (npParcels.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Посилок з вказаною Новою Поштою для цього рейсу не знайдено.</p>';
    } else {
        const tableHead = `
            <thead style="background-color: #f2f2f2; border-bottom: 1px solid #000; font-size: 10pt;">
                 <tr style="font-weight: normal; text-align: center;">
                    <th style="width: 3%; padding: 4px; font-weight: normal; text-align: center; border: none; border-right: 1px solid #ccc;">№</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none;">Ім\'я клієнта</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none;">Телефон</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none; border-left: 1px solid #ccc;">Місто отримання</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none;">Нова пошта</th>
                    <th style="padding: 4px; font-weight: normal; text-align: center; border: none; border-left: 1px solid #ccc;">Багаж</th>
                    <th style="width: 5%; padding: 4px; font-weight: normal; text-align: center; border: none;">Вага</th>
                    <th style="width: 10%; padding: 4px; font-weight: normal; text-align: center; border: none; border-left: 1px solid #ccc;">Кошти</th>
                </tr>
            </thead>`;

        let tableBody = '';
        const agentIds = Object.keys(groupedByAgent);

        agentIds.forEach(agentId => {
            const agent = (state.collections.Agents || []).find(a => a.id === agentId);
            const agentName = agent ? agent.Name : "Без агента";
            const parcels = groupedByAgent[agentId];

            tableBody += `<tr class="group-header-row"><td colspan="8" style="font-size: 10pt; font-weight: bold; text-align: left; padding-top: 0.5rem;">${agentName}</td></tr>`;

            parcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            parcels.forEach((p, index) => {
                const phones = [p.client?.TelUA, p.client?.TelEU].filter(Boolean).join(', ');
                const moneyCellContent = p.Money || '';
                tableBody += `
                    <tr class="passenger-row">
                        <td style="width: 3%; vertical-align: top; border-right: 1px solid #ccc; padding: 1px 4px;">${index + 1}.</td>
                        <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.Name || ''}</td>
                        <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${phones}</td>
                        <td style="white-space: nowrap; vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.townEnd?.Name || ''}</td>
                        <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.NPNum || ''}</td>
                        <td style="vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.Name || ''}</td>
                        <td style="width: 5%; vertical-align: top; text-align: center; padding: 1px 4px;">${p.Weight || ''}</td>
                        <td style="width: 10%; vertical-align: top; text-align: center; border-left: 1px solid #ccc; padding: 1px 4px;">${moneyCellContent}</td>
                    </tr>`;
            });
        });

        reportHTML += `
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            ${tableHead}
            <tbody>${tableBody}</tbody>
        </table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    parcelReportsSection.querySelector('.print-report-btn').classList.toggle('hidden', npParcels.length === 0);
}

export function generateParcelArrivalCitiesReport(reportDisplayArea, parcelReportsSection) {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: allParcels } = data;

    if (country?.Cod === 0) { // Should be a trip TO Ukraine
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів на Україну.</p>';
        parcelReportsSection.querySelector('.print-report-btn').classList.add('hidden');
        return;
    }

    const parcelsToReport = allParcels.filter(p => !p.client?.NPNum && p.townEnd?.Name !== 'Кропивницький');

    const groupedByTown = parcelsToReport.reduce((groups, p) => {
        const townId = p.townEnd?.id || 'unknown';
        if (!groups[townId]) {
            groups[townId] = {
                town: p.townEnd,
                parcels: []
            };
        }
        groups[townId].parcels.push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByTown).sort((a, b) => {
        const nameA = groupedByTown[a].town?.Name || '';
        const nameB = groupedByTown[b].town?.Name || '';
        return nameA.localeCompare(nameB);
    });

    let reportHTML = `
        <div class="report-header" style="font-size: 11pt; margin-bottom: 1rem;">
            <table style="width: 100%; border: none;">
                <tbody>
                    <tr>
                        <td style="text-align: left; border: none; padding: 0;">
                            <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
                            <span style="margin-left: 1rem;">${route?.Name || ''}</span>
                        </td>
                        <td style="text-align: right; border: none; padding: 0;">
                            <h3 style="font-weight: bold; margin: 0;">Отримання за містами</h3>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    if (parcelsToReport.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Посилок (без вказаної Нової Пошти та м. Кропивницький) для цього рейсу не знайдено.</p>';
    } else {
        reportHTML += `
        <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <tbody>`;

        sortedGroupKeys.forEach((townId, groupIndex) => {
            const group = groupedByTown[townId];
            const townName = group.town?.Name || 'Невідомо';

            reportHTML += `<tr class="group-header-row"><td colspan="6" style="border-bottom: 1px solid #000; padding: 2px 4px; font-weight: bold; text-align: right; font-size: 10pt;">${townName}</td></tr>`;

            const groupParcels = group.parcels;
            groupParcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            groupParcels.forEach((p, index) => {
                const phones = [p.client?.TelUA, p.client?.TelEU].filter(Boolean).join(', ');
                const moneyCellContent = p.Money || '';
                reportHTML += `
                <tr class="passenger-row">
                    <td style="width: 3%; vertical-align: top; border-right: 1px solid #ccc; padding: 1px 4px;">${index + 1}.</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${p.client?.Name || ''}</td>
                    <td style="white-space: nowrap; vertical-align: top; padding: 1px 4px;">${phones}</td>
                    <td style="vertical-align: top; border-left: 1px solid #ccc; padding: 1px 4px;">${p.Name || ''}</td>
                    <td style="width: 5%; vertical-align: top; text-align: center; padding: 1px 4px;">${p.Weight || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center; border-left: 1px solid #ccc; padding: 1px 4px;">${moneyCellContent}</td>
                </tr>`;
            });

            if (groupIndex < sortedGroupKeys.length - 1) {
                reportHTML += `<tr><td colspan="6" style="padding: 2px 0;"></td></tr>`;
            }
        });
        reportHTML += `</tbody></table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    parcelReportsSection.querySelector('.print-report-btn').classList.toggle('hidden', parcelsToReport.length === 0);
}
