// js/views/reportsView.js
import { state } from '../state.js';
import { getDisplayValue, formatDate, parseDateString } from '../utils.js';
import { openInfoModal } from '../ui/modal.js';

// Module-level variables for DOM elements
let reportsPageView, reportTypeTripBtn, reportTypeParcelBtn, reportTypeAgentBtn, tripReportsSection, parcelReportsSection, agentReportSection,
    generateCallListBtn, generateDepartureListBtn, generateArrivalListBtn, generateTransitListBtn,
    generateRomaReportBtn, generateParcelDepartureCitiesReportBtn, generateKropyvnytskyiReportBtn, generateNovaPoshtaReportBtn, generateParcelArrivalCitiesReportBtn,
    generateAgentReportBtn, exportExcelBtn, printReportBtn, reportDisplayArea;

function getTripData(tripId, collectionName = 'Passengers') {
    if (!tripId || tripId === 'all') {
        openInfoModal('Будь ласка, оберіть конкретний рейс для формування звіту.');
        return null;
    }
    const trip = (state.collections.Trips || []).find(t => t.id === tripId);
    if (!trip) {
        openInfoModal("Помилка: не вдалося знайти обраний рейс.");
        return null;
    }

    const route = (state.collections.Routes || []).find(r => r.id === trip.RouteId);
    const bus = (state.collections.Buses || []).find(b => b.id === trip.BusId);
    const driver = (state.collections.Drivers || []).find(d => d.id === trip.DriverId);
    const country = route ? (state.collections.Country || []).find(cy => cy.id === route.CountryId) : null;

    let items = [];
    if (collectionName === 'Passengers') {
        items = (state.collections.Passengers || [])
            .filter(p => p.TripId === tripId)
            .map(p => {
                const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
                const stationBeginId = client ? (country?.Cod === 0 ? client.StationIdUA : client.StationIdEU) : null;
                const stationEndId = client ? (country?.Cod === 0 ? client.StationIdEU : client.StationIdUA) : null;
                const townBeginId = client ? (country?.Cod === 0 ? client.TownIdUA : client.TownIdEU) : null;
                const townEndId = client ? (country?.Cod === 0 ? client.TownIdEU : client.TownIdUA) : null;
                return {
                    ...p,
                    client,
                    stationBegin: (state.collections.Stations || []).find(s => s.id === stationBeginId),
                    stationEnd: (state.collections.Stations || []).find(s => s.id === stationEndId),
                    townBegin: (state.collections.Towns || []).find(t => t.id === townBeginId),
                    townEnd: (state.collections.Towns || []).find(t => t.id === townEndId)
                };
            });
    } else if (collectionName === 'Parcels') {
        items = (state.collections.Parcels || [])
            .filter(p => p.TripId === tripId)
            .map(p => {
                const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
                let stationBegin = '—', stationEnd = '—';
                if (client && country) {
                    const townUA = getDisplayValue('Clients', 'TownIdUA', client.TownIdUA);
                    const townEU = getDisplayValue('Clients', 'TownIdEU', client.TownIdEU);
                    stationBegin = country.Cod === 0 ? townUA : townEU;
                    stationEnd = country.Cod === 0 ? townEU : townUA;
                }
                return { ...p, client, stationBegin, stationEnd };
            });
    }

    return { trip, route, bus, driver, country, items };
}

// Placeholder functions for new parcel reports
function generateRomaReport() {
    openInfoModal("Звіт 'Roma' ще не реалізовано.");
    reportDisplayArea.innerHTML = '';
    printReportBtn.classList.add('hidden');
}

function generateParcelDepartureCitiesReport() {
    const data = getTripData(state.selectedTripId, 'Parcels');
    if (!data) return;
    const { trip, route, country, items: parcels } = data;

    if (country?.Cod !== 0) {
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Цей звіт призначений для рейсів з України в ЄС.</p>';
        printReportBtn.classList.add('hidden');
        return;
    }

    const groupedByStation = parcels.reduce((groups, p) => {
        const stationName = p.stationEnd || 'Невідомо';
        if (!groups[stationName]) {
            groups[stationName] = [];
        }
        groups[stationName].push(p);
        return groups;
    }, {});

    const sortedGroupKeys = Object.keys(groupedByStation).sort((a, b) => a.localeCompare(b));

    let reportHTML = `
        <div class="report-header" style="font-size: 10pt;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span style="font-size: 11pt;">${route?.Name || ''}</span>
                <span style="font-size: 12pt; font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
            </div>
        </div>
        <table class="report-table" style="font-size: 10pt; width: 100%; border-collapse: collapse;">
            <tbody>`;

    if (parcels.length === 0) {
        reportHTML = '<p class="text-center text-gray-500">Посилок для цього рейсу не знайдено.</p>';
    } else {
        sortedGroupKeys.forEach(stationName => {
            reportHTML += `<tr class="group-header-row"><td colspan="7" style="padding-top: 1rem; font-weight: bold;">${stationName}</td></tr>`;
            const groupParcels = groupedByStation[stationName];
            groupParcels.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

            groupParcels.forEach((p, index) => {
                const phones = [p.client?.TelUA ? `+38${p.client.TelUA}` : '', p.client?.TelEU ? `+39${p.client.TelEU}` : ''].filter(Boolean).join(', ');
                const paidMarker = p.Paid ? '+' : '-';
                reportHTML += `
                <tr class="passenger-row">
                    <td style="width: 3%; vertical-align: top;">${index + 1}.</td>
                    <td style="width: 25%; vertical-align: top;">${p.client?.Name || ''}</td>
                    <td style="width: 17%; vertical-align: top;">${phones}</td>
                    <td style="width: 25%; vertical-align: top;">${p.Name || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center;">${p.Weight || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center;">${p.Money || ''}</td>
                    <td style="width: 10%; vertical-align: top; text-align: center; font-weight: bold;">${paidMarker}</td>
                </tr>`;
            });
        });
        reportHTML += `</tbody></table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    printReportBtn.classList.toggle('hidden', parcels.length === 0);
}

function generateKropyvnytskyiReport() {
    openInfoModal("Звіт 'Кропивницький' ще не реалізовано.");
    reportDisplayArea.innerHTML = '';
    printReportBtn.classList.add('hidden');
}
function generateNovaPoshtaReport() {
    openInfoModal("Звіт 'Нова пошта' ще не реалізовано.");
    reportDisplayArea.innerHTML = '';
    printReportBtn.classList.add('hidden');
}
function generateParcelArrivalCitiesReport() {
    openInfoModal("Звіт 'Отримання за містами' ще не реалізовано.");
    reportDisplayArea.innerHTML = '';
    printReportBtn.classList.add('hidden');
}

function generateCallListReport() {
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

    let listContent = '';
    sortedGroupKeys.forEach(stationId => {
        const group = groupedByStation[stationId];
        listContent += `${group.name}\n`;
        group.passengers.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));
        group.passengers.forEach((p, index) => {
            const statusMarker = p.Status ? '+' : ' ';
            const telUA = p.client?.TelUA ? `+38${p.client.TelUA}` : '';
            const telEU = p.client?.TelEU ? `+39${p.client.TelEU}` : '';
            const phones = [telUA, telEU].filter(Boolean).join(', ');
            listContent += `${index + 1}. ${statusMarker}\t${p.client?.Name || ''}\t${p.townBegin?.Name || ''} - ${p.townEnd?.Name || ''}\t${phones}\n`;
        });
        listContent += '\n';
    });

    reportDisplayArea.innerHTML = `
        <div class="report-header">
            <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="text-align: right; font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
            </div>
        </div>
        <pre style="font-size: 12px; font-family: 'Inter', sans-serif; white-space: pre-wrap;">${listContent}</pre>`;
    printReportBtn.classList.remove('hidden');
}

function generateDepartureReport() {
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
        tableBodyHTML += `<tr class="group-header-row"><td colspan="4" style="text-align: right; padding: 4px;">${group.name} <strong>${group.time}</strong></td></tr>`;
        group.passengers.sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));
        group.passengers.forEach((p, index) => {
            passengerThroughCount++;
            const statusLine = [p.Status ? '+' : '', p.Place ? '<strong>!h</strong>' : ''].filter(Boolean).join(' ');
            const phones = [p.client?.TelUA ? `+38${p.client.TelUA}` : '', p.client?.TelEU ? `+39${p.client.TelEU}` : ''].filter(Boolean).join(', ');
            tableBodyHTML += `
                <tr class="passenger-row">
                    <td style="text-align: center; width: 10%; vertical-align: top;">
                        <div>${index + 1} / <strong>${passengerThroughCount}</strong></div>
                        <div>${statusLine}</div>
                    </td>
                    <td class="passenger-name-cell" style="padding: 2px 4px; vertical-align: top; width: 45%;">
                        <div>${p.client?.Name || ''}</div>
                        <div>${p.stationEnd?.Name || '—'} ${p.Place ? '<strong>+ додаткове місце!</strong>' : ''}</div>
                    </td>
                    <td style="border-left: 1px solid #ccc; padding: 2px 4px; vertical-align: middle; text-align: center; width: 15%;">
                        ${p.Ticket ? '<div style="font-size: 8pt; font-weight: bold;">квиток</div>' : ''}
                    </td>
                    <td class="phones-cell" style="border-left: 1px solid #ccc; padding: 2px 4px; vertical-align: top;">
                        <div>${phones}</div>
                        <div>${p.Note || ''}</div>
                    </td>
                </tr>`;
        });
    });

    reportDisplayArea.innerHTML = `
        <div class="report-header" style="margin-bottom: 0.25rem;">
            <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
            </div>
            <div style="font-size: 10pt;">
                <span>Пасажирів: </span><strong>${passengers.length}</strong><span> + дод. місць: </span><strong>${passengers.filter(p => p.Place).length}</strong>
            </div>
        </div>
        <table class="report-table departure-report-table"><tbody>${tableBodyHTML}</tbody></table>`;
    printReportBtn.classList.remove('hidden');
}

function generateArrivalReport() {
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
            const stationCellContent = isFirstInGroup ? `<div style="white-space: nowrap;"><strong>${group.time}</strong> ${group.name}</div>` : '';
            tableBodyHTML += `
                <tr class="passenger-row" ${isFirstInGroup ? 'style="border-top: 2px solid #000;"' : ''}>
                    <td style="width: 25%;">${stationCellContent}</td>
                    <td style="width: 10%; text-align: center;">${index + 1} / <strong>${passengerThroughCount}</strong></td>
                    <td style="width: 30%;">${p.client?.Name || ''}</td>
                    <td style="width: 20%;">${p.townEnd?.Name || ''}</td>
                    <td style="width: 15%;">${p.Note || ''}</td>
                </tr>`;
        });
    });

    reportDisplayArea.innerHTML = `
        <div class="report-header">
             <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
            </div>
        </div>
        <table class="report-table"><tbody>${tableBodyHTML}</tbody></table>`;
    printReportBtn.classList.remove('hidden');
}

function generateTransitReport() {
    const data = getTripData(state.selectedTripId, 'Passengers');
    if (!data) return;
    const { trip, route, bus, driver, items: passengers } = data;

    const transitPassengers = passengers
        .filter(p => (p.stationBegin?.Name || '').startsWith("Tranzit") || (p.stationEnd?.Name || '').startsWith("Tranzit"))
        .sort((a, b) => (a.client?.Name || '').localeCompare(b.client?.Name || ''));

    if (transitPassengers.length === 0) {
        reportDisplayArea.innerHTML = '<p class="text-center text-gray-500">Транзитних пасажирів на цьому рейсі не знайдено.</p>';
        printReportBtn.classList.add('hidden');
        return;
    }

    let listContent = '';
    transitPassengers.forEach((p, index) => {
        const telUA = p.client?.TelUA ? `+38${p.client.TelUA}` : '';
        const telEU = p.client?.TelEU ? `+39${p.client.TelEU}` : '';
        listContent += `${index + 1}.\t${p.client?.Name || ''}\t${p.townBegin?.Name || ''} - ${p.townEnd?.Name || ''}\t${telUA}\t${telEU}\n`;
    });

    reportDisplayArea.innerHTML = `
        <div class="report-header">
             <div class="report-header-flex-row">
                <span><strong>${bus?.Plate || ''}</strong> ${bus?.Name || ''}</span>
                <span style="text-align: right;">${route?.Name || ''}</span>
            </div>
            <div class="report-header-flex-row">
                <span>${driver?.Name || ''}</span>
                <span style="font-weight: bold;">${formatDate(trip?.Date, 'dd.mm.yyyy')}</span>
            </div>
        </div>
        <pre style="font-size: 12px; font-family: 'Inter', sans-serif; white-space: pre-wrap;">${listContent}</pre>`;
    printReportBtn.classList.remove('hidden');
}

function generateAgentReport() {
    const agentSelect = document.getElementById('agent-filter-select');
    const startDateInput = document.getElementById('start-date-filter');
    const endDateInput = document.getElementById('end-date-filter');
    const startDate = parseDateString(startDateInput.value);
    const endDate = parseDateString(endDateInput.value);

    if (!startDate || !endDate) return openInfoModal('Будь ласка, вкажіть початкову та кінцеву дати.');

    endDate.setHours(23, 59, 59, 999);

    let passengers = (state.collections.Passengers || []).filter(p => {
        const trip = (state.collections.Trips || []).find(t => t.id === p.TripId);
        return trip?.Date && trip.Date.toDate() >= startDate && trip.Date.toDate() <= endDate;
    });

    const selectedAgentId = agentSelect.value;
    if (selectedAgentId === 'all') {
        passengers = passengers.filter(p => p.AgentId);
    } else {
        passengers = passengers.filter(p => p.AgentId === selectedAgentId);
    }

    const reportData = passengers.map(p => {
        const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
        const trip = (state.collections.Trips || []).find(t => t.id === p.TripId);
        const route = trip ? (state.collections.Routes || []).find(r => r.id === trip.RouteId) : null;
        const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;
        let stationBegin = '—', stationEnd = '—';

        if (client) {
            const stUA = (state.collections.Stations || []).find(s => s.id === client.StationIdUA)?.Name || '—';
            const stEU = (state.collections.Stations || []).find(s => s.id === client.StationIdEU)?.Name || '—';
            stationBegin = country?.Cod === 0 ? stUA : stEU;
            stationEnd = country?.Cod === 0 ? stEU : stUA;
        }

        return {
            tripDate: trip ? formatDate(trip.Date, 'dd.mm.yyyy') : 'N/A',
            clientName: client?.Name || 'N/A',
            stationBegin: (stationBegin.split(' ')[0] || '').replace(/,$/, ''),
            stationEnd: (stationEnd.split(' ')[0] || '').replace(/,$/, ''),
            agentId: p.AgentId
        };
    });

    state.lastAgentReportData = reportData;

    let headerText = selectedAgentId !== 'all'
        ? `Звіт по агенту: ${agentSelect.options[agentSelect.selectedIndex].text}`
        : 'Звіт по всіх агентах';
    headerText += ` за період з ${startDateInput.value} по ${endDateInput.value}`;

    let tableRows = '';
    if (selectedAgentId === 'all') {
        const groupedData = reportData.reduce((groups, item) => {
            const agentId = item.agentId || 'none';
            if (!groups[agentId]) groups[agentId] = [];
            groups[agentId].push(item);
            return groups;
        }, {});

        let count = 0;
        Object.keys(groupedData).forEach(agentId => {
            const agentName = agentId === 'none' ? 'Без агента' : (state.collections.Agents.find(a => a.id === agentId)?.Name || 'Невідомий');
            tableRows += `<tr class="group-header-row"><td colspan="5">${agentName}</td></tr>`;
            groupedData[agentId].forEach(item => {
                count++;
                tableRows += `<tr><td>${count}</td><td>${item.tripDate}</td><td>${item.clientName}</td><td>${item.stationBegin}</td><td>${item.stationEnd}</td></tr>`;
            });
        });
    } else {
        reportData.forEach((item, index) => {
            tableRows += `<tr><td>${index + 1}</td><td>${item.tripDate}</td><td>${item.clientName}</td><td>${item.stationBegin}</td><td>${item.stationEnd}</td></tr>`;
        });
    }

    reportDisplayArea.innerHTML = reportData.length > 0
        ? `<h3 class="font-semibold text-lg mb-4">${headerText}</h3>
           <table><thead><tr><th>№</th><th>Дата рейсу</th><th>Пасажир</th><th>Відправка</th><th>Прибуття</th></tr></thead><tbody>${tableRows}</tbody></table>`
        : '<p class="text-center text-gray-500">Дані за обраний період відсутні.</p>';

    exportExcelBtn.classList.toggle('hidden', reportData.length === 0);
}


function exportAgentReportToExcel() {
    if (!state.lastAgentReportData || state.lastAgentReportData.length === 0) {
        return openInfoModal("Немає даних для експорту.");
    }

    const headers = ["N", "Дата рейсу", "Пасажир", "Місто відправки", "Місто прибуття"];
    if (document.getElementById('agent-filter-select').value === 'all') {
        headers.splice(1, 0, "Агент");
    }

    const dataToExport = state.lastAgentReportData.map((item, index) => {
        const row = {
            'N': index + 1,
            'Дата рейсу': item.tripDate,
            'Пасажир': item.clientName,
            'Місто відправки': item.stationBegin,
            'Місто прибуття': item.stationEnd
        };
        if (headers.includes("Агент")) {
            const agent = state.collections.Agents.find(a => a.id === item.agentId);
            row['Агент'] = agent ? agent.Name : 'Без агента';
        }
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Звіт по агентах");
    XLSX.writeFile(workbook, "Agent_Report.xlsx");
}

function handlePrint() {
    const reportContent = reportDisplayArea.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return openInfoModal('Будь ласка, дозвольте спливаючі вікна для друку.');

    const now = new Date();
    const printDateTime = `${now.toLocaleDateString('uk-UA')} ${now.toLocaleTimeString('uk-UA')}`;

    const printStyles = `
        @page {
            size: A4;
            margin: 20mm 5.2mm 5.2mm 5.2mm;

            @bottom-left {
                content: "${printDateTime}";
                font-family: 'Inter', sans-serif;
                font-size: 8pt;
                color: #666;
            }

            @bottom-right {
                content: counter(page) " / " counter(pages);
                font-family: 'Inter', sans-serif;
                font-size: 8pt;
                color: #666;
            }
        }
        body { 
            font-family: 'Inter', sans-serif;
        }
        .report-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; font-size: 11pt; }
        .report-header .report-header-flex-row { display: flex; justify-content: space-between; align-items: flex-start; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
        th { background-color: #f2f2f2; }
        .report-table td { border: none; padding: 2px 4px; vertical-align: top; }
        .report-table tr.passenger-row { border-bottom: 1px solid #ccc; }
        .report-table tr.group-header-row td { background-color: #f8f9fa !important; border-bottom: 2px solid #000; }
        .departure-report-table td { font-size: 9pt; }
        .departure-report-table .passenger-name-cell { border-left: 1px solid #ccc; border-right: 1px solid #ccc; font-size: 10pt; }
        .departure-report-table .phones-cell { width: 1%; white-space: nowrap; }
    `;

    printWindow.document.write(`<html><head><title>Друк звіту</title><style>${printStyles}</style></head><body>${reportContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

export function renderReportsPage() {
    if (!reportsPageView) return;
    const agentFilterSelect = document.getElementById('agent-filter-select');
    if (agentFilterSelect) {
        const agents = (state.collections.Agents || []).sort((a,b) => a.Name.localeCompare(b.Name));
        agentFilterSelect.innerHTML = `<option value="all">Всі агенти</option>` + agents.map(a => `<option value="${a.id}">${a.Name}</option>`).join('');
    }
}

export function updateReportView() {
    if (!reportsPageView) return;
    const isTripReport = state.currentReportType === 'trip';
    const isParcelReport = state.currentReportType === 'parcel';
    const isAgentReport = state.currentReportType === 'agent';

    reportTypeTripBtn.classList.toggle('border-blue-500', isTripReport);
    reportTypeTripBtn.classList.toggle('text-blue-600', isTripReport);
    reportTypeTripBtn.classList.toggle('text-gray-500', !isTripReport);

    reportTypeParcelBtn.classList.toggle('border-blue-500', isParcelReport);
    reportTypeParcelBtn.classList.toggle('text-blue-600', isParcelReport);
    reportTypeParcelBtn.classList.toggle('text-gray-500', !isParcelReport);

    reportTypeAgentBtn.classList.toggle('border-blue-500', isAgentReport);
    reportTypeAgentBtn.classList.toggle('text-blue-600', isAgentReport);
    reportTypeAgentBtn.classList.toggle('text-gray-500', !isAgentReport);

    tripReportsSection.classList.toggle('hidden', !isTripReport);
    parcelReportsSection.classList.toggle('hidden', !isParcelReport);
    agentReportSection.classList.toggle('hidden', !isAgentReport);

    reportDisplayArea.innerHTML = '';
    exportExcelBtn.classList.add('hidden');
    printReportBtn.classList.add('hidden');
}

export function initReportsView() {
    reportsPageView = document.getElementById('reports-page-view');
    reportsPageView.innerHTML = `
    <div class="bg-white p-4 rounded-lg shadow-md mb-4">
        <div class="flex border-b mb-4">
            <button id="report-type-trip" class="report-type-btn py-2 px-4 border-b-2">Звіти по рейсах</button>
            <button id="report-type-parcel" class="report-type-btn py-2 px-4">Реєстри посилок</button>
            <button id="report-type-agent" class="report-type-btn py-2 px-4">Звіт по агентах</button>
        </div>
        
        <div id="trip-reports-section">
            <div class="flex flex-wrap items-center gap-4 mb-4">
                <div class="flex items-center">
                    <label for="reports-trip-select-input" class="mr-2 font-semibold">Рейс:</label>
                    <div class="relative">
                        <input type="text" id="reports-trip-select-input" class="border border-gray-300 rounded-md p-2" autocomplete="off" placeholder="Оберіть рейс...">
                        <div id="reports-trip-select-results" class="autocomplete-results hidden"></div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <button id="generate-call-list-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Обзвон</button>
                    <button id="generate-departure-list-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Відправка</button>
                    <button id="generate-arrival-list-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Прибуття</button>
                    <button id="generate-transit-list-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg">Транзит</button>
                </div>
                <button id="print-report-btn" class="hidden ml-auto bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zM1 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1zm3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1H4z"/></svg>
                    <span>Друк</span>
                </button>
            </div>
        </div>

        <div id="parcel-reports-section" class="hidden">
            <div class="flex flex-wrap items-center gap-4 mb-4">
                <div class="flex items-center p-2 bg-gray-100 rounded-md">
                    <p class="text-sm text-gray-600">Рейс для реєстрів обирається у вкладці "Звіти по рейсах".</p>
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <button id="generate-roma-report-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Roma</button>
                    <button id="generate-parcel-departure-cities-report-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Відправка за містами</button>
                    <button id="generate-kropyvnytskyi-report-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Кропивницький</button>
                    <button id="generate-nova-poshta-report-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Нова пошта</button>
                    <button id="generate-parcel-arrival-cities-report-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Отримання за містами</button>
                </div>
            </div>
        </div>

        <div id="agent-report-section" class="hidden">
            <div class="flex flex-wrap items-center gap-4">
                <div>
                    <label for="agent-filter-select" class="text-sm font-medium">Агент:</label>
                    <select id="agent-filter-select" class="p-2 border border-gray-300 rounded-md"></select>
                </div>
                <div class="flex items-center gap-2">
                    <label for="start-date-filter" class="text-sm font-medium">З:</label>
                    <input type="text" id="start-date-filter" class="p-2 border border-gray-300 rounded-md w-32 date-input-mask" placeholder="дд.мм.рр">
                </div>
                <div class="flex items-center gap-2">
                    <label for="end-date-filter" class="text-sm font-medium">По:</label>
                    <input type="text" id="end-date-filter" class="p-2 border border-gray-300 rounded-md w-32 date-input-mask" placeholder="дд.мм.рр">
                </div>
                <button id="generate-agent-report-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg self-end">Сформувати</button>
                <button id="export-excel-btn" class="hidden ml-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.781l2.116 2.54a.5.5 0 0 0 .768-.64L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.219l-2.116-2.54z"/><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>
                    <span>Export Excel</span>
                </button>
            </div>
        </div>
        
        <div id="report-display-area" class="mt-6 border-t border-gray-200 pt-4"></div>
    </div>`;

    // Assign elements to module variables
    reportTypeTripBtn = document.getElementById('report-type-trip');
    reportTypeParcelBtn = document.getElementById('report-type-parcel');
    reportTypeAgentBtn = document.getElementById('report-type-agent');
    tripReportsSection = document.getElementById('trip-reports-section');
    parcelReportsSection = document.getElementById('parcel-reports-section');
    agentReportSection = document.getElementById('agent-report-section');
    generateCallListBtn = document.getElementById('generate-call-list-btn');
    generateDepartureListBtn = document.getElementById('generate-departure-list-btn');
    generateArrivalListBtn = document.getElementById('generate-arrival-list-btn');
    generateTransitListBtn = document.getElementById('generate-transit-list-btn');
    generateRomaReportBtn = document.getElementById('generate-roma-report-btn');
    generateParcelDepartureCitiesReportBtn = document.getElementById('generate-parcel-departure-cities-report-btn');
    generateKropyvnytskyiReportBtn = document.getElementById('generate-kropyvnytskyi-report-btn');
    generateNovaPoshtaReportBtn = document.getElementById('generate-nova-poshta-report-btn');
    generateParcelArrivalCitiesReportBtn = document.getElementById('generate-parcel-arrival-cities-report-btn');
    generateAgentReportBtn = document.getElementById('generate-agent-report-btn');
    exportExcelBtn = document.getElementById('export-excel-btn');
    printReportBtn = document.getElementById('print-report-btn');
    reportDisplayArea = document.getElementById('report-display-area');

    // Setup event listeners
    reportTypeTripBtn.addEventListener('click', () => { state.currentReportType = 'trip'; updateReportView(); });
    reportTypeParcelBtn.addEventListener('click', () => { state.currentReportType = 'parcel'; updateReportView(); });
    reportTypeAgentBtn.addEventListener('click', () => { state.currentReportType = 'agent'; updateReportView(); });

    generateCallListBtn.addEventListener('click', generateCallListReport);
    generateDepartureListBtn.addEventListener('click', generateDepartureReport);
    generateArrivalListBtn.addEventListener('click', generateArrivalReport);
    generateTransitListBtn.addEventListener('click', generateTransitReport);

    generateRomaReportBtn.addEventListener('click', generateRomaReport);
    generateParcelDepartureCitiesReportBtn.addEventListener('click', generateParcelDepartureCitiesReport);
    generateKropyvnytskyiReportBtn.addEventListener('click', generateKropyvnytskyiReport);
    generateNovaPoshtaReportBtn.addEventListener('click', generateNovaPoshtaReport);
    generateParcelArrivalCitiesReportBtn.addEventListener('click', generateParcelArrivalCitiesReport);

    generateAgentReportBtn.addEventListener('click', generateAgentReport);

    exportExcelBtn.addEventListener('click', exportAgentReportToExcel);
    printReportBtn.addEventListener('click', handlePrint);

    // Initialize date pickers
    new Datepicker(document.getElementById('start-date-filter'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
    new Datepicker(document.getElementById('end-date-filter'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
}
