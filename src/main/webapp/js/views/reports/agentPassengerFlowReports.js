// js/views/reports/agentPassengerFlowReports.js
import { state } from '/js/state.js';
import { formatDate, parseDateString } from '/js/utils.js';
import { openInfoModal } from '/js/ui/modal.js';

export function generateAgentReport(reportDisplayArea, agentReportSection, exportExcelBtn) {
    const agentSelect = document.getElementById('agent-filter-select');
    const startDateInput = document.getElementById('start-date-filter');
    const endDateInput = document.getElementById('end-date-filter');
    const startDate = parseDateString(startDateInput.value);
    const endDate = parseDateString(endDateInput.value);

    if (!startDate || !endDate) return openInfoModal('Будь ласка, вкажіть початкову та кінцеву дати.');

    endDate.setHours(23, 59, 59, 999);

    const tripsInPeriod = (state.collections.Trips || []).filter(trip => {
        if (trip.Date && typeof trip.Date.toDate === 'function') {
            const tripDate = trip.Date.toDate();
            return tripDate >= startDate && tripDate <= endDate;
        }
        return false;
    });

    const tripIdsInPeriod = tripsInPeriod.map(t => t.id);
    const tripsById = tripsInPeriod.reduce((acc, trip) => {
        acc[trip.id] = trip;
        return acc;
    }, {});

    let passengers = (state.collections.Passengers || []).filter(p => tripIdsInPeriod.includes(p.TripId));

    const selectedAgentId = agentSelect.value;
    if (selectedAgentId === 'all') {
        passengers = passengers.filter(p => p.AgentId);
    } else {
        passengers = passengers.filter(p => p.AgentId === selectedAgentId);
    }

    const reportData = passengers.map(p => {
        const client = (state.collections.Clients || []).find(c => c.id === p.ClientId);
        const trip = tripsById[p.TripId];
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
            tripDate: trip.Date, // Keep as a timestamp for sorting
            clientName: client?.Name || 'N/A',
            stationBegin: (stationBegin.split(' ')[0] || '').replace(/,$/, ''),
            stationEnd: (stationEnd.split(' ')[0] || '').replace(/,$/, ''),
            agentId: p.AgentId,
            Canceled: p.Canceled,
            Ticket: p.Ticket
        };
    });

    // Sort by trip date, then by client name
    reportData.sort((a, b) => {
        const dateA = a.tripDate.seconds;
        const dateB = b.tripDate.seconds;
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        return a.clientName.localeCompare(b.clientName);
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

        Object.keys(groupedData).forEach(agentId => {
            const agentName = agentId === 'none' ? 'Без агента' : (state.collections.Agents.find(a => a.id === agentId)?.Name || 'Невідомий');
            tableRows += `<tr class="group-header-row" style="font-size: 10pt;"><td colspan="6">${agentName}</td></tr>`;
            groupedData[agentId].forEach((item, index) => {
                const status = item.Canceled ? 'скасовано' : (item.Ticket ? 'квиток' : '');
                tableRows += `<tr style="font-size: 9pt;"><td>${index + 1}</td><td>${formatDate(item.tripDate, 'dd.mm.yy')}</td><td>${item.clientName}</td><td>${item.stationBegin}</td><td>${item.stationEnd}</td><td>${status}</td></tr>`;
            });
        });
    } else {
        reportData.forEach((item, index) => {
            const status = item.Canceled ? 'скасовано' : (item.Ticket ? 'квиток' : '');
            tableRows += `<tr style="font-size: 9pt;"><td>${index + 1}</td><td>${formatDate(item.tripDate, 'dd.mm.yy')}</td><td>${item.clientName}</td><td>${item.stationBegin}</td><td>${item.stationEnd}</td><td>${status}</td></tr>`;
        });
    }

    reportDisplayArea.innerHTML = reportData.length > 0
        ? `<h3 class="font-semibold text-lg mb-4" style="font-size: 11pt;">${headerText}</h3>
           <table style="font-size: 9pt;"><thead><tr style="font-size: 12pt;"><th>№</th><th>Дата рейсу</th><th>Пасажир</th><th>Відправка</th><th>Прибуття</th><th>Статус</th></tr></thead><tbody>${tableRows}</tbody></table>`
        : '<p class="text-center text-gray-500">Дані за обраний період відсутні.</p>';

    exportExcelBtn.classList.toggle('hidden', reportData.length === 0);
    agentReportSection.querySelector('.print-report-btn').classList.toggle('hidden', reportData.length === 0);
}

export function generatePassengerFlowReport(reportDisplayArea, passengerFlowReportSection) {
    const startDateInput = document.getElementById('passenger-flow-start-date');
    const endDateInput = document.getElementById('passenger-flow-end-date');
    const startDate = parseDateString(startDateInput.value);
    const endDate = parseDateString(endDateInput.value);

    if (!startDate || !endDate) {
        return openInfoModal('Будь ласка, вкажіть початкову та кінцеву дати.');
    }
    endDate.setHours(23, 59, 59, 999);

    const tripsInPeriod = (state.collections.Trips || []).filter(trip => {
        if (trip.Date && typeof trip.Date.toDate === 'function') {
            const tripDate = trip.Date.toDate();
            return tripDate >= startDate && tripDate <= endDate;
        }
        return false;
    });

    const reportData = tripsInPeriod.map(trip => {
        const passengersForTrip = (state.collections.Passengers || []).filter(p => p.TripId === trip.id);
        const activePassengers = passengersForTrip.filter(p => !p.Canceled);

        const passengerCount = activePassengers.length;
        const additionalSeatsCount = activePassengers.filter(p => p.Place).length;
        const ticketCount = activePassengers.filter(p => p.Ticket).length;
        const canceledCount = passengersForTrip.length - activePassengers.length;

        return {
            date: formatDate(trip.Date, 'dd.mm.yy'),
            routeName: (state.collections.Routes || []).find(r => r.id === trip.RouteId)?.Name || 'N/A',
            passengerCount: passengerCount,
            additionalSeatsCount: additionalSeatsCount,
            ticketCount: ticketCount,
            canceledCount: canceledCount
        };
    });

    reportData.sort((a, b) => parseDateString(a.date).getTime() - parseDateString(b.date).getTime());

    let reportHTML = `<h3 class="font-semibold text-lg mb-4" style="font-size: 11pt;">Пасажиропотік за період з ${startDateInput.value} по ${endDateInput.value}</h3>`;

    if (reportData.length === 0) {
        reportHTML += '<p class="text-center text-gray-500">Дані за обраний період відсутні.</p>';
    } else {
        reportHTML += `
            <table class="report-table" style="font-size: 9pt; width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f2f2f2; font-size: 10pt;">
                    <tr>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">Дата</th>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">Рейс</th>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">К-ть пасажирів</th>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">Дод. місця</th>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">Квитки</th>
                        <th style="padding: 4px; border-bottom: 1px solid #000;">Скасовані</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map(item => `
                        <tr>
                            <td style="padding: 4px;">${item.date}</td>
                            <td style="padding: 4px;">${item.routeName}</td>
                            <td style="padding: 4px; text-align: center;">${item.passengerCount || ''}</td>
                            <td style="padding: 4px; text-align: center;">${item.additionalSeatsCount || ''}</td>
                            <td style="padding: 4px; text-align: center;">${item.ticketCount || ''}</td>
                            <td style="padding: 4px; text-align: center;">${item.canceledCount || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    reportDisplayArea.innerHTML = reportHTML;
    passengerFlowReportSection.querySelector('.print-report-btn').classList.toggle('hidden', reportData.length === 0);
}

export function generatePassengerFlowChart(reportDisplayArea, passengerFlowReportSection) {
    const startDateInput = document.getElementById('passenger-flow-start-date');
    const endDateInput = document.getElementById('passenger-flow-end-date');
    const startDate = parseDateString(startDateInput.value);
    const endDate = parseDateString(endDateInput.value);

    if (!startDate || !endDate) {
        return openInfoModal('Будь ласка, вкажіть початкову та кінцеву дати.');
    }
    endDate.setHours(23, 59, 59, 999);

    const tripsInPeriod = (state.collections.Trips || [])
        .filter(trip => {
            if (trip.Date && typeof trip.Date.toDate === 'function') {
                const tripDate = trip.Date.toDate();
                return tripDate >= startDate && tripDate <= endDate;
            }
            return false;
        })
        .sort((a, b) => a.Date.seconds - b.Date.seconds);

    const chartData = {
        labels: [],
        datasets: [
            {
                label: 'Пасажири з квитком (з Укр)',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 1.0)', // Dark Blue
                stack: 'Ukraine',
            },
            {
                label: 'Пасажири без квитка (з Укр)',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Base Blue
                stack: 'Ukraine',
            },
            {
                label: 'Дод. місця (з Укр)',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.3)', // Light Blue
                stack: 'Ukraine',
            },
            {
                label: 'Пасажири з квитком (з ЄС)',
                data: [],
                backgroundColor: 'rgba(255, 206, 86, 1.0)', // Dark Yellow
                stack: 'EU',
            },
            {
                label: 'Пасажири без квитка (з ЄС)',
                data: [],
                backgroundColor: 'rgba(255, 206, 86, 0.6)', // Base Yellow
                stack: 'EU',
            },
            {
                label: 'Дод. місця (з ЄС)',
                data: [],
                backgroundColor: 'rgba(255, 206, 86, 0.3)', // Light Yellow
                stack: 'EU',
            }
        ]
    };

    tripsInPeriod.forEach(trip => {
        const route = (state.collections.Routes || []).find(r => r.id === trip.RouteId);
        const country = route ? (state.collections.Country || []).find(c => c.id === route.CountryId) : null;
        const activePassengers = (state.collections.Passengers || []).filter(p => p.TripId === trip.id && !p.Canceled);

        const ticketCount = activePassengers.filter(p => p.Ticket).length;
        const noTicketCount = activePassengers.length - ticketCount;
        const additionalSeatsCount = activePassengers.filter(p => p.Place).length;

        chartData.labels.push(formatDate(trip.Date, 'dd.mm'));

        if (country?.Cod === 0) { // From Ukraine
            chartData.datasets[0].data.push(ticketCount);
            chartData.datasets[1].data.push(noTicketCount);
            chartData.datasets[2].data.push(additionalSeatsCount);
            chartData.datasets[3].data.push(0);
            chartData.datasets[4].data.push(0);
            chartData.datasets[5].data.push(0);
        } else { // From EU
            chartData.datasets[0].data.push(0);
            chartData.datasets[1].data.push(0);
            chartData.datasets[2].data.push(0);
            chartData.datasets[3].data.push(ticketCount);
            chartData.datasets[4].data.push(noTicketCount);
            chartData.datasets[5].data.push(additionalSeatsCount);
        }
    });

    reportDisplayArea.innerHTML = '<canvas id="passengerFlowChartCanvas"></canvas>';
    const ctx = document.getElementById('passengerFlowChartCanvas').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: false,
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const label = tooltipItem.dataset.label || '';
                            if (label.includes('Пасажири без квитка')) {
                                const dataIndex = tooltipItem.dataIndex;
                                const datasets = tooltipItem.chart.data.datasets;
                                let ticketCount = 0;
                                let noTicketCount = tooltipItem.raw;

                                if (label.includes('(з Укр)')) {
                                    ticketCount = datasets[0].data[dataIndex];
                                } else if (label.includes('(з ЄС)')) {
                                    ticketCount = datasets[3].data[dataIndex];
                                }
                                const total = ticketCount + noTicketCount;
                                return `Всього пасажирів: ${total}`;
                            }
                            return ` ${label}: ${tooltipItem.raw}`;
                        }
                    }
                }
            }
        }
    });

    passengerFlowReportSection.querySelector('.print-report-btn').classList.remove('hidden');
}

export function exportAgentReportToExcel() {
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
