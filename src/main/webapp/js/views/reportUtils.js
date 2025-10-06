// js/views/reportUtils.js
import { state } from '../state.js';
import { openInfoModal } from '../ui/modal.js';

export function getTripData(tripId, collectionName = 'Passengers') {
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
            .filter(p => p.TripId === tripId && !p.Canceled)
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
                let townBegin = null, townEnd = null, stationBegin = null, stationEnd = null;
                if (client && country) {
                    const townBeginId = country.Cod === 0 ? client.TownIdUA : client.TownIdEU;
                    const townEndId = country.Cod === 0 ? client.TownIdEU : client.TownIdUA;
                    townBegin = (state.collections.Towns || []).find(t => t.id === townBeginId);
                    townEnd = (state.collections.Towns || []).find(t => t.id === townEndId);

                    const stationBeginId = country.Cod === 0 ? client.StationIdUA : client.StationIdEU;
                    const stationEndId = country.Cod === 0 ? client.StationIdEU : client.StationIdUA;
                    stationBegin = (state.collections.Stations || []).find(s => s.id === stationBeginId);
                    stationEnd = (state.collections.Stations || []).find(s => s.id === stationEndId);
                }
                return { ...p, client, townBegin, townEnd, stationBegin, stationEnd };
            });
    }

    return { trip, route, bus, driver, country, items };
}

export function handlePrint(reportContent, reportType) {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return openInfoModal('Будь ласка, дозвольте спливаючі вікна для друку.');

    const now = new Date();
    const printDateTime = `${now.toLocaleDateString('uk-UA')} ${now.toLocaleTimeString('uk-UA')}`;

    let printStyles = `
        @page {
            size: A4;
            margin: 20mm 5.2mm 5.2mm 5.2mm;
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

    if (reportType !== 'parcel' && reportType !== 'passenger-flow') {
        printStyles += `
            @page {
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
        `;
    }

    printWindow.document.write(`<html lang="uk"><head><title>Друк звіту</title><style>${printStyles}</style></head><body>${reportContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}
