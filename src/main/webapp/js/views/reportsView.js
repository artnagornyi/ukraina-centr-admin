// js/views/reportsView.js
import { state } from '../state.js';
import { parseDateString } from '../utils.js';
import { openInfoModal } from '../ui/modal.js';
import {
    generateCallListReport,
    generateDepartureReport,
    generateArrivalReport,
    generateTransitReport
} from './reports/tripReports.js';
import {
    generateRomaReport,
    generateParcelDepartureCitiesReport,
    generateKropyvnytskyiReport,
    generateNovaPoshtaReport,
    generateParcelArrivalCitiesReport
} from './reports/parcelReports.js';
import {
    generateAgentReport,
    generatePassengerFlowReport,
    generatePassengerFlowChart,
    exportAgentReportToExcel
} from './reports/agentAndFlowReports.js';

// Module-level variables for DOM elements
let reportsPageView, reportTypeTripBtn, reportTypeParcelBtn, reportTypeAgentBtn, reportTypePassengerFlowBtn,
    tripReportsSection, parcelReportsSection, agentReportSection, passengerFlowReportSection,
    generateCallListBtn, generateDepartureListBtn, generateArrivalListBtn, generateTransitListBtn,
    generateRomaReportBtn, generateParcelDepartureCitiesReportBtn, generateKropyvnytskyiReportBtn, generateNovaPoshtaReportBtn, generateParcelArrivalCitiesReportBtn,
    generateAgentReportBtn, generatePassengerFlowReportBtn, generatePassengerFlowChartBtn, exportExcelBtn, reportDisplayArea,
    agentStartDatepicker, agentEndDatepicker, passengerFlowStartDatepicker, passengerFlowEndDatepicker;


function handlePrint() {
    const reportContent = reportDisplayArea.innerHTML;
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

    if (state.currentReportType !== 'parcel' && state.currentReportType !== 'passenger-flow') {
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
    const isPassengerFlowReport = state.currentReportType === 'passenger-flow';

    reportTypeTripBtn.classList.toggle('border-blue-500', isTripReport);
    reportTypeTripBtn.classList.toggle('text-blue-600', isTripReport);
    reportTypeTripBtn.classList.toggle('text-gray-500', !isTripReport);

    reportTypeParcelBtn.classList.toggle('border-blue-500', isParcelReport);
    reportTypeParcelBtn.classList.toggle('text-blue-600', isParcelReport);
    reportTypeParcelBtn.classList.toggle('text-gray-500', !isParcelReport);

    reportTypeAgentBtn.classList.toggle('border-blue-500', isAgentReport);
    reportTypeAgentBtn.classList.toggle('text-blue-600', isAgentReport);
    reportTypeAgentBtn.classList.toggle('text-gray-500', !isAgentReport);

    reportTypePassengerFlowBtn.classList.toggle('border-blue-500', isPassengerFlowReport);
    reportTypePassengerFlowBtn.classList.toggle('text-blue-600', isPassengerFlowReport);
    reportTypePassengerFlowBtn.classList.toggle('text-gray-500', !isPassengerFlowReport);

    tripReportsSection.classList.toggle('hidden', !isTripReport);
    parcelReportsSection.classList.toggle('hidden', !isParcelReport);
    agentReportSection.classList.toggle('hidden', !isAgentReport);
    passengerFlowReportSection.classList.toggle('hidden', !isPassengerFlowReport);

    // --- Set default dates ---
    if (isAgentReport) {
        const now = new Date();
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        if (agentStartDatepicker) agentStartDatepicker.setDate(firstDayOfLastMonth);
        if (agentEndDatepicker) agentEndDatepicker.setDate(lastDayOfLastMonth);
    } else if (isPassengerFlowReport) {
        const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (passengerFlowStartDatepicker) passengerFlowStartDatepicker.setDate(firstDayOfCurrentMonth);
        if (passengerFlowEndDatepicker) passengerFlowEndDatepicker.setDate(lastDayOfCurrentMonth);
    }
    // -----------------------------------------

    reportDisplayArea.innerHTML = '';
    exportExcelBtn.classList.add('hidden');
    reportsPageView.querySelectorAll('.print-report-btn').forEach(btn => btn.classList.add('hidden'));
}

export function initReportsView() {
    reportsPageView = document.getElementById('reports-page-view');
    reportsPageView.innerHTML = `
    <div class="bg-white p-4 rounded-lg shadow-md mb-4">
        <div class="flex border-b mb-4">
            <button id="report-type-trip" class="report-type-btn py-2 px-4 border-b-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Звіти по рейсах</span>
            </button>
            <button id="report-type-parcel" class="report-type-btn py-2 px-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <span>Реєстри посилок</span>
            </button>
            <button id="report-type-agent" class="report-type-btn py-2 px-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>Звіт по агентах</span>
            </button>
            <button id="report-type-passenger-flow" class="report-type-btn py-2 px-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>Пасажиропотік</span>
            </button>
        </div>
        
        <div id="trip-reports-section">
             <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div class="flex items-center">
                    <label for="reports-trip-select-input" class="mr-2 font-semibold">Рейс:</label>
                    <div class="relative">
                        <input type="text" id="reports-trip-select-input" class="border border-gray-300 rounded-md p-2" autocomplete="off" placeholder="Оберіть рейс...">
                        <div id="reports-trip-select-results" class="autocomplete-results hidden"></div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <button id="generate-call-list-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <span>Обзвон</span>
                    </button>
                    <button id="generate-departure-list-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        <span>Відправка</span>
                    </button>
                    <button id="generate-arrival-list-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        <span>Прибуття</span>
                    </button>
                    <button id="generate-transit-list-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                        <span>Транзит</span>
                    </button>
                </div>
                <button class="print-report-btn hidden ml-auto bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zM1 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1zm3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1H4z"/></svg>
                    <span>Друк</span>
                </button>
            </div>
        </div>

        <div id="parcel-reports-section" class="hidden">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div class="flex flex-wrap gap-2 items-center">
                    <button id="generate-roma-report-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span>Roma</span>
                    </button>
                    <button id="generate-parcel-departure-cities-report-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span>Відправка за містами</span>
                    </button>
                    <button id="generate-kropyvnytskyi-report-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        <span>Кропивницький</span>
                    </button>
                    <button id="generate-nova-poshta-report-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zM13 16l-4-4h9v4h-5z" /></svg>
                        <span>Нова пошта</span>
                    </button>
                    <button id="generate-parcel-arrival-cities-report-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                        <span>Отримання за містами</span>
                    </button>
                </div>
                 <button class="print-report-btn hidden ml-auto bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zM1 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1zm3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1H4z"/></svg>
                    <span>Друк</span>
                </button>
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
                <button id="generate-agent-report-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Сформувати</span>
                </button>
                <div class="ml-auto flex items-center gap-2">
                    <button id="export-excel-btn" class="hidden bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        <span>Export Excel</span>
                    </button>
                    <button class="print-report-btn hidden ml-auto bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zM1 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1zm3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1H4z"/></svg>
                        <span>Друк</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="passenger-flow-report-section" class="hidden">
            <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                    <label for="passenger-flow-start-date" class="text-sm font-medium">З:</label>
                    <input type="text" id="passenger-flow-start-date" class="p-2 border border-gray-300 rounded-md w-32 date-input-mask" placeholder="дд.мм.рр">
                </div>
                <div class="flex items-center gap-2">
                    <label for="passenger-flow-end-date" class="text-sm font-medium">По:</label>
                    <input type="text" id="passenger-flow-end-date" class="p-2 border border-gray-300 rounded-md w-32 date-input-mask" placeholder="дд.мм.рр">
                </div>
                <button id="generate-passenger-flow-report-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" style="fill: none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Сформувати</span>
                </button>
                <button id="generate-passenger-flow-chart-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                    <span>Діаграма</span>
                </button>
                <div class="ml-auto flex items-center gap-2">
                    <button class="print-report-btn hidden ml-auto bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zM1 7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1zm3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1H4z"/></svg>
                        <span>Друк</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="report-display-area" class="mt-6 border-t border-gray-200 pt-4"></div>
    </div>`;

    // Assign elements to module variables
    reportTypeTripBtn = document.getElementById('report-type-trip');
    reportTypeParcelBtn = document.getElementById('report-type-parcel');
    reportTypeAgentBtn = document.getElementById('report-type-agent');
    reportTypePassengerFlowBtn = document.getElementById('report-type-passenger-flow');
    tripReportsSection = document.getElementById('trip-reports-section');
    parcelReportsSection = document.getElementById('parcel-reports-section');
    agentReportSection = document.getElementById('agent-report-section');
    passengerFlowReportSection = document.getElementById('passenger-flow-report-section');
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
    generatePassengerFlowReportBtn = document.getElementById('generate-passenger-flow-report-btn');
    generatePassengerFlowChartBtn = document.getElementById('generate-passenger-flow-chart-btn');
    exportExcelBtn = document.getElementById('export-excel-btn');
    reportDisplayArea = document.getElementById('report-display-area');

    // Setup event listeners
    reportTypeTripBtn.addEventListener('click', () => { state.currentReportType = 'trip'; updateReportView(); });
    reportTypeParcelBtn.addEventListener('click', () => { state.currentReportType = 'parcel'; updateReportView(); });
    reportTypeAgentBtn.addEventListener('click', () => { state.currentReportType = 'agent'; updateReportView(); });
    reportTypePassengerFlowBtn.addEventListener('click', () => { state.currentReportType = 'passenger-flow'; updateReportView(); });

    generateCallListBtn.addEventListener('click', () => generateCallListReport(reportDisplayArea, tripReportsSection));
    generateDepartureListBtn.addEventListener('click', () => generateDepartureReport(reportDisplayArea, tripReportsSection));
    generateArrivalListBtn.addEventListener('click', () => generateArrivalReport(reportDisplayArea, tripReportsSection));
    generateTransitListBtn.addEventListener('click', () => generateTransitReport(reportDisplayArea, tripReportsSection));

    generateRomaReportBtn.addEventListener('click', () => generateRomaReport(reportDisplayArea, parcelReportsSection));
    generateParcelDepartureCitiesReportBtn.addEventListener('click', () => generateParcelDepartureCitiesReport(reportDisplayArea, parcelReportsSection));
    generateKropyvnytskyiReportBtn.addEventListener('click', () => generateKropyvnytskyiReport(reportDisplayArea, parcelReportsSection));
    generateNovaPoshtaReportBtn.addEventListener('click', () => generateNovaPoshtaReport(reportDisplayArea, parcelReportsSection));
    generateParcelArrivalCitiesReportBtn.addEventListener('click', () => generateParcelArrivalCitiesReport(reportDisplayArea, parcelReportsSection));

    generateAgentReportBtn.addEventListener('click', () => generateAgentReport(reportDisplayArea, agentReportSection, exportExcelBtn));
    generatePassengerFlowReportBtn.addEventListener('click', () => generatePassengerFlowReport(reportDisplayArea, passengerFlowReportSection));
    generatePassengerFlowChartBtn.addEventListener('click', () => generatePassengerFlowChart(reportDisplayArea, passengerFlowReportSection));

    exportExcelBtn.addEventListener('click', exportAgentReportToExcel);

    reportsPageView.addEventListener('click', (e) => {
        if (e.target.closest('.print-report-btn')) {
            handlePrint();
        }
    });

    // Initialize date pickers
    agentStartDatepicker = new Datepicker(document.getElementById('start-date-filter'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
    agentEndDatepicker = new Datepicker(document.getElementById('end-date-filter'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
    passengerFlowStartDatepicker = new Datepicker(document.getElementById('passenger-flow-start-date'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
    passengerFlowEndDatepicker = new Datepicker(document.getElementById('passenger-flow-end-date'), { format: 'dd.mm.yy', autohide: true, language: 'uk', weekStart: 1 });
}
