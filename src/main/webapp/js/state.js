export const DAY_OF_WEEK_MAP = { "Понеділок": 1, "Вівторок": 2, "Середа": 3, "Четвер": 4, "П'ятниця": 5, "Субота": 6, "Неділя": 0 };

export const FK_MAP = {
    AgentId: 'Agents',
    BusId: 'Buses',
    ClientId: 'Clients',
    CountryId: 'Country',
    DriverId: 'Drivers',
    RouteId: 'Routes',
    StationId: 'Stations',
    StationIdUA: 'Stations',
    StationIdEU: 'Stations',
    TownId: 'Towns',
    TownIdUA: 'Towns',
    TownIdEU: 'Towns',
    TripId: 'Trips',
};

export const PASSENGER_FIELDS = {
    ClientId: { label: 'Клієнт', type: 'fk', required: true },
    TripId: { label: 'Рейс', type: 'fk', required: true },
    Note: { label: 'Примітка', type: 'textarea' },
    AgentId: { label: 'Агент', type: 'fk' },
};

export const PARCEL_FIELDS = {
    ClientId: { label: 'Клієнт', type: 'fk', required: true },
    TripId: { label: 'Рейс', type: 'fk', required: true },
    Name: { label: 'Опис багажу', type: 'text' },
    Weight: { label: 'Вага (кг)', type: 'text' },
    Money: { label: 'Кошти', type: 'text' },
    Paid: { label: 'Оплачено', type: 'checkbox', default: true },
};

export const DIRECTORIES = {
    Clients: {
        title: 'Клієнти',
        singularTitle: 'клієнта',
        fields: {
            Name: { label: "Ім'я", type: 'text', required: true },
            TelUA: { label: 'Телефон UA', type: 'text' },
            TelEU: { label: 'Телефон EU', type: 'text' },
            TownIdUA: { label: 'Місто UA', type: 'fk' },
            StationIdUA: { label: 'Зупинка UA', type: 'fk' },
            TownIdEU: { label: 'Місто EU', type: 'fk' },
            StationIdEU: { label: 'Зупинка EU', type: 'fk' },
            NPNum: { label: 'Нова Пошта', type: 'text' },
        }
    },
    Trips: {
        title: 'Рейси',
        singularTitle: 'рейс',
        fields: {
            RouteId: { label: 'Маршрут', type: 'fk', required: true },
            Date: { label: 'Дата', type: 'date', required: true },
            BusId: { label: 'Автобус', type: 'fk' },
            DriverId: { label: 'Водій', type: 'fk' },
        }
    },
    Routes: {
        title: 'Маршрути',
        singularTitle: 'маршрут',
        fields: {
            Cod: { label: 'Код', type: 'number' },
            Name: { label: 'Назва', type: 'text', required: true },
            CountryId: { label: 'Країна відправлення', type: 'fk', required: true },
            DayOfTheWeek: { label: 'День тижня', type: 'select', options: Object.keys(DAY_OF_WEEK_MAP) },
        }
    },
    Buses: {
        title: 'Автобуси',
        singularTitle: 'автобус',
        fields: {
            Plate: { label: 'Ном. знак', type: 'text' },
            Name: { label: 'Назва', type: 'text', required: true },
            Capacity: { label: 'К-ть місць', type: 'number' },
        }
    },
    Drivers: {
        title: 'Водії',
        singularTitle: 'водія',
        fields: {
            Name: { label: "Ім'я", type: 'text', required: true },
        }
    },
    Agents: {
        title: 'Агенти',
        singularTitle: 'агента',
        fields: {
            Name: { label: "Ім'я", type: 'text', required: true },
        }
    },
    Stations: {
        title: 'Зупинки',
        singularTitle: 'зупинку',
        fields: {
            Cod: { label: 'Код', type: 'number' },
            Name: { label: 'Назва', type: 'text', required: true },
            CountryId: { label: 'Країна', type: 'fk', required: true },
            TimeBegin: { label: 'Час відправки', type: 'text' },
            TimeEnd: { label: 'Час прибуття', type: 'text' },
        }
    },
    Towns: {
        title: 'Міста',
        singularTitle: 'місто',
        fields: {
            Name: { label: 'Назва', type: 'text', required: true },
            CountryId: { label: 'Країна', type: 'fk', required: true },
            StationId: { label: 'Зупинка', type: 'fk', required: true },
        }
    },
    Country: {
        title: 'Країни',
        singularTitle: 'країну',
        fields: {
            Cod: { label: 'Код', type: 'number' },
            ISO: { label: 'ISO', type: 'text' },
            Name: { label: 'Назва', type: 'text', required: true },
        }
    },
};

export const state = {
    collections: {},
    listeners: {},
    currentView: 'main',
    currentDirectory: 'Clients',
    directorySortConfig: { key: 'Name', direction: 'ascending' },
    passengerSortConfig: { key: 'ClientName', direction: 'ascending' },
    parcelSortConfig: { key: 'ClientName', direction: 'ascending' },
    selectedTripId: null,
    passengerFilter: 'all',
    parcelFilter: '',
    directorySearchTerm: '',
    lastAgentReportData: [],
    currentReportType: 'trip',
    focusItemId: null, // ID of item to focus after re-render
};