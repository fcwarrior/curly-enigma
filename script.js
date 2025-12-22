// --- script.js ---

/**
 * Normalizes numeric input allowing both comma and dot as decimal separators.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function normalizeNumberString(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).trim().replace(/\s+/g, '').replace(',', '.');
}

/**
 * Parses a numeric value accepting either comma or dot decimals.
 * Falls back to zero when parsing fails, ensuring calculations remain robust.
 * @param {string|number|null|undefined} value
 * @param {number} [defaultValue=0]
 * @returns {number}
 */
function parseNum(value, defaultValue = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const normalized = normalizeNumberString(value);
    if (normalized === '') {
        return defaultValue;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Determines whether a raw input string can be parsed into a finite number.
 * @param {string|number|null|undefined} value
 * @returns {boolean}
 */
function isValidNumericInput(value) {
    const normalized = normalizeNumberString(value);
    if (normalized === '') return false;
    const parsed = Number(normalized);
    return Number.isFinite(parsed);
}

/**
 * Rounds component volumes consistently to the desired decimal places.
 * Ensures negative and NaN values are clamped to zero.
 * @param {number} value
 * @param {number} [decimalPlaces=1]
 * @returns {number}
 */
function roundVolume(value, decimalPlaces = 1) {
    const parsed = parseNum(value, 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(parsed * factor) / factor;
}

/**
 * Shared PDF layout tokens to keep worksheet and labels consistent and maintainable.
 */
const PDF_THEME = {
    margins: { top: 12, left: 12, right: 12, bottom: 14 },
    palette: {
        border: [33, 37, 41],
        subtleBorder: [210, 214, 220],
        headerFill: [245, 247, 250],
        warning: [255, 204, 128],
        error: [236, 112, 99]
    },
    fonts: {
        family: 'helvetica',
        title: 15,
        section: 10,
        base: 8.5,
        small: 8,
        label: 9
    }
};

/**
 * Label templates are deterministic layouts expressed in millimetres with safe areas
 * for both laser (A4 multi-up) and térmica (1-up) printing profiles.
 */
const LABEL_TEMPLATES = {
    main: {
        id: 'main',
        width: 90,
        height: 50,
        padding: 5,
        gapX: 10,
        gapY: 10,
        pageMarginX: 10,
        pageMarginY: 10,
        safeArea: { x: 2, y: 2, w: 86, h: 46 },
        minFont: 6.5
    },
    small: {
        id: 'small',
        width: 70,
        height: 35,
        padding: 4,
        gapX: 8,
        gapY: 8,
        pageMarginX: 12,
        pageMarginY: 12,
        safeArea: { x: 2, y: 2, w: 66, h: 31 },
        minFont: 6
    }
};

/**
 * Converts millimetres to PDF points (1 pt = 1/72 in) to aid calibration overlays.
 * @param {number} mm
 * @returns {number}
 */
function mmToPt(mm) {
    return (mm / 25.4) * 72;
}

/**
 * Nutrition guideline tables used to provide quick suggestions according to patient profile.
 * Values are expressed as ranges so that the mid value can be surfaced to the user.
 */
const GUIDELINE_TABLES = {
    adult: {
        label: 'Adulto',
        protein_g_per_kg: [1.0, 1.3],
        glucose_mg_kg_min: [3, 4.5],
        lipid_g_per_kg: [0.7, 1.0],
        sodium_mEq_per_kg: [1.0, 2.0],
        potassium_mEq_per_kg: [0.8, 1.2],
        magnesium_mEq_per_kg: [0.1, 0.2],
        calcium_mEq_per_kg: [0.05, 0.2],
        phosphorus_mmol_per_kg: [0.3, 0.6]
    },
    renal: {
        label: 'Insuficiência Renal',
        protein_g_per_kg: [0.8, 1.2],
        glucose_mg_kg_min: [3, 4],
        lipid_g_per_kg: [0.7, 1.0],
        sodium_mEq_per_kg: [0.5, 1.0],
        potassium_mEq_per_kg: [0.5, 1.0],
        magnesium_mEq_per_kg: [0.05, 0.1],
        calcium_mEq_per_kg: [0.05, 0.12],
        phosphorus_mmol_per_kg: [0.2, 0.4]
    },
    hepatic: {
        label: 'Insuficiência Hepática',
        protein_g_per_kg: [1.2, 1.5],
        glucose_mg_kg_min: [3, 4.5],
        lipid_g_per_kg: [0.7, 1.0],
        sodium_mEq_per_kg: [1.0, 1.5],
        potassium_mEq_per_kg: [0.7, 1.0],
        magnesium_mEq_per_kg: [0.1, 0.2],
        calcium_mEq_per_kg: [0.05, 0.15],
        phosphorus_mmol_per_kg: [0.3, 0.5]
    },
    critical: {
        label: 'Doente Crítico',
        protein_g_per_kg: [1.5, 2.0],
        glucose_mg_kg_min: [4, 5.5],
        lipid_g_per_kg: [1.0, 1.5],
        sodium_mEq_per_kg: [1.0, 2.0],
        potassium_mEq_per_kg: [1.0, 1.5],
        magnesium_mEq_per_kg: [0.15, 0.25],
        calcium_mEq_per_kg: [0.08, 0.2],
        phosphorus_mmol_per_kg: [0.4, 0.7]
    },
    pediatric: {
        label: 'Pediátrico',
        protein_g_per_kg: [1.5, 2.5],
        glucose_mg_kg_min: [4, 6],
        lipid_g_per_kg: [1.5, 2.5],
        sodium_mEq_per_kg: [2.0, 4.0],
        potassium_mEq_per_kg: [1.5, 3.0],
        magnesium_mEq_per_kg: [0.2, 0.3],
        calcium_mEq_per_kg: [0.2, 0.35],
        phosphorus_mmol_per_kg: [0.7, 1.2]
    },
    neonate: {
        label: 'Neonato',
        protein_g_per_kg: [2.5, 3.5],
        glucose_mg_kg_min: [5, 8],
        lipid_g_per_kg: [2.0, 3.0],
        sodium_mEq_per_kg: [2.0, 4.0],
        potassium_mEq_per_kg: [1.5, 3.0],
        magnesium_mEq_per_kg: [0.3, 0.4],
        calcium_mEq_per_kg: [0.25, 0.45],
        phosphorus_mmol_per_kg: [1.0, 1.5]
    }
};

const DEFAULT_GUIDELINE_ID = 'adult';

function midpoint(range = []) {
    if (!Array.isArray(range) || range.length === 0) return 0;
    if (range.length === 1) return range[0];
    return (range[0] + range[range.length - 1]) / 2;
}

/**
 * Manages data persistence using localStorage.
 * Handles getting, saving, exporting, and importing application data.
 */
class DataManager {
    constructor() {
        this.patientsKey = 'patients';
        this.prescriptionsKey = 'prescriptions';
        this.solutionsKey = 'solutions';
        this.preparationCounterKey = 'preparationCounter';
        this.settingsKey = 'settings';
        this.userNameKey = 'userName';
        this.auditLogsKey = 'auditLogs';
        console.log("DataManager instance created.");
    }

    /**
     * Safely retrieves data from localStorage and parses it as JSON.
     * @param {string} key - The key to retrieve data for.
     * @returns {any|null} - Parsed data or null if no data or error during parsing.
     */
    getData(key) {
        try {
            const rawData = localStorage.getItem(key);
            if (rawData) {
                const parsedData = JSON.parse(rawData);
                return parsedData;
            }
            return null;
        } catch (error) {
            console.error(`DataManager: Error getting data for key '${key}':`, error);
            this.displayNotification(`Erro ao carregar dados locais para '${key}'. Os dados podem estar corrompidos. Verifique o console.`, 'error');
            return null;
        }
    }

    /**
     * Saves data to localStorage after stringifying it to JSON.
     * @param {string} key - The key to save data under.
     * @param {any} data - The data to save.
     */
    saveData(key, data) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            localStorage.setItem(key, jsonData);
            console.log(`DataManager.saveData: Data for key '${key}' successfully saved to localStorage.`);
        } catch (error) {
            console.error(`DataManager: Error saving data for key '${key}':`, error);
            if (error.name === 'QuotaExceededError') {
                this.displayNotification('Erro ao salvar dados: Espaço de armazenamento local (localStorage) esgotado. Exporte os dados e limpe o cache do navegador ou contacte o suporte.', 'error');
            } else {
                this.displayNotification('Erro ao salvar dados localmente. Verifique o console para detalhes.', 'error');
            }
        }
    }

    autoExportData() {
        const settings = this.getSettings();
        if (settings?.autoExportEnabled) {
            console.log("Auto-exporting data...");
            this.exportAllDataToFile();
        }
    }

    exportAllDataToFile() {
        const allData = {
            patients: this.getPatients(),
            prescriptions: this.getPrescriptions(),
            solutions: this.getSolutions(),
            settings: this.getSettings(),
            userName: this.getUserName(),
            auditLogs: this.getAuditLogs()
        };
        this.exportData('all', allData);
    }

    getUserName() {
        return this.getData(this.userNameKey) || 'Utilizador Desconhecido';
    }

    saveUserName(userName) {
        this.saveData(this.userNameKey, userName);
    }

    getPatients() {
        return this.getData(this.patientsKey) || [];
    }

    savePatients(patients) {
        this.saveData(this.patientsKey, patients);
    }

    getPrescriptions() {
        return this.getData(this.prescriptionsKey) || [];
    }

    savePrescriptions(prescriptions) {
        this.saveData(this.prescriptionsKey, prescriptions);
    }

    getSolutions() {
        return this.getData(this.solutionsKey) || {};
    }

    saveSolutions(solutions) {
        this.saveData(this.solutionsKey, solutions);
    }

    getSettings() {
        const defaults = {
            defaultOsmolarityLimit: 900,
            autoSaveEnabled: false,
            autoExportEnabled: false,
            autoSaveIntervalMinutes: 5,
            accessLevel: 'admin',
            permissions: { exportData: true },
            osmolarityLimits: { peripheral: 900, central: 1500 },
            patientCategories: [
                {
                    id: 'cat-adult',
                    name: 'Adulto',
                    ageStart: 18,
                    ageEnd: 99,
                    substanceLimits: {
                        nitrogen: { softUpper: 2, hardUpper: 2.5, unit: 'g/kg' },
                        glucose_GIR: { softUpper: 5, hardUpper: 7, unit: 'mg/kg/min' },
                        calcium: { hardUpper: 0.2, unit: 'mEq/kg' }
                    }
                }
            ],
            protocols: [
                {
                    id: 'proto-adult-standard',
                    name: 'Adulto - Protocolo Padrão',
                    patientCategoryId: 'cat-adult',
                    dailyTemplates: [
                        {
                            day: 1,
                            inputs: {
                                nitrogen: 8,
                                glucose: 150,
                                lipids: 70,
                                sodium: 80,
                                potassium: 60,
                                calcium: 9.3,
                                magnesium: 16,
                                phosphorus: 20,
                                traceElements: 10
                            }
                        }
                    ]
                }
            ]
        };
        const savedSettings = this.getData(this.settingsKey) || {};
        return {
            ...defaults,
            ...savedSettings,
            permissions: { ...defaults.permissions, ...(savedSettings.permissions || {}) },
            osmolarityLimits: { ...defaults.osmolarityLimits, ...(savedSettings.osmolarityLimits || {}) }
        };
    }

    saveSettings(settings) {
        this.saveData(this.settingsKey, settings);
    }

    getNextPreparationNumber() {
        let counter = this.getData(this.preparationCounterKey);
        counter = (typeof counter === 'number' && !isNaN(counter)) ? counter : 0;
        counter++;
        this.saveData(this.preparationCounterKey, counter);
        return counter;
    }

    getNextPatientId() {
        const patients = this.getPatients();
        if (!patients || patients.length === 0) return 1;
        const maxId = Math.max(0, ...patients.map(p => Number(p.id) || 0));
        return maxId + 1;
    }

    exportData(dataType, dataOverride = null) {
        let data;
        let baseFilename = 'nutrisoft';
        let filenameSuffix = '';
        try {
            switch (dataType) {
                case 'all':
                    data = dataOverride || { 
                        patients: this.getPatients(),
                        prescriptions: this.getPrescriptions(),
                        solutions: this.getSolutions(),
                        settings: this.getSettings(),
                        userName: this.getUserName(),
                        auditLogs: this.getAuditLogs()
                     }; 
                    filenameSuffix = '-all-data';
                    break;
                case 'settings':
                    data = dataOverride || this.getSettings();
                    filenameSuffix = '-settings';
                    break;
                case 'auditLogs':
                    data = dataOverride || this.getAuditLogs();
                    filenameSuffix = '-audit-logs';
                    break;
                default:
                    console.error('DataManager: Tipo de dados inválido para exportação:', dataType);
                    this.displayNotification('Tipo de dados inválido para exportação.', 'error');
                    return;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${baseFilename}${filenameSuffix}-${timestamp}.json`;
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.displayNotification(`Dados (${dataType}) exportados com sucesso para ${filename}`, 'success');
        } catch (error) {
            console.error(`DataManager: Erro ao exportar dados (${dataType}):`, error);
            this.displayNotification(`Erro ao exportar dados (${dataType}). Verifique o console.`, 'error');
        }
    }

    importData(dataType, jsonData) {
        try {
            let importedSomething = false;
            if (dataType === 'all') {
                if (jsonData.patients && Array.isArray(jsonData.patients)) { this.savePatients(jsonData.patients); importedSomething = true; }
                if (jsonData.prescriptions && Array.isArray(jsonData.prescriptions)) { this.savePrescriptions(jsonData.prescriptions); importedSomething = true; }
                if (jsonData.solutions && typeof jsonData.solutions === 'object') { this.saveSolutions(jsonData.solutions); importedSomething = true; }
                if (jsonData.settings && typeof jsonData.settings === 'object') { this.saveSettings(jsonData.settings); importedSomething = true; }
                if (jsonData.userName && typeof jsonData.userName === 'string') { this.saveUserName(jsonData.userName); importedSomething = true; }
                if (jsonData.auditLogs && Array.isArray(jsonData.auditLogs)) { this.saveAuditLogs(jsonData.auditLogs); importedSomething = true; }
                if (!importedSomething) { this.displayNotification('Ficheiro de dados não contém secções válidas.', 'warning'); return false; }
                this.displayNotification('Dados importados. Recarregue a aplicação.', 'success');
                return true;
            } else if (dataType === 'settings') {
                if (jsonData && typeof jsonData === 'object') { this.saveSettings(jsonData); this.displayNotification('Configurações importadas.', 'success'); return true; }
                else { this.displayNotification('Ficheiro de configurações inválido.', 'error'); return false; }
            } else { this.displayNotification('Tipo de dados inválido para importação.', 'error'); return false; }
        } catch (error) {
            console.error(`DataManager: Erro ao importar dados (${dataType}):`, error);
            this.displayNotification(`Erro durante a importação (${dataType}). Verifique o console.`, 'error');
            return false;
        }
    }

    getAuditLogs() {
        return this.getData(this.auditLogsKey) || [];
    }

    saveAuditLogs(logs) {
        const MAX_LOGS = 1000;
        const logsToSave = logs.slice(-MAX_LOGS);
        this.saveData(this.auditLogsKey, logsToSave);
    }

    displayNotification(message, type = 'info') {
        const prefix = type.toUpperCase();
        console.log(`[${prefix}] Notification: ${message}`);
        alert(`${prefix}: ${message}`);
    }
}

class AuditLogger {
    static log(action, details = {}) {
        if (typeof app !== 'undefined' && app?.dataManager?.saveData) {
            try {
                const logEntry = { timestamp: new Date().toISOString(), user: app.dataManager.getUserName() || 'System', action, details };
                const logs = app.dataManager.getAuditLogs() || [];
                logs.push(logEntry);
                app.dataManager.saveAuditLogs(logs);
                if (typeof app.renderPerformanceStats === 'function') {
                    app.renderPerformanceStats();
                }
            } catch (error) { console.error("AuditLogger: Error during logging:", error, {action, details}); }
        } else { console.warn("AuditLogger: Skipping log - app or app.dataManager not fully initialized.", { action, details }); }
    }
}

class NutriSoft {
    constructor() {
        console.log("NutriSoft constructor starting...");
        this.dataManager = new DataManager();
        this.patients = []; this.prescriptions = []; this.solutions = {}; this.settings = {}; this.userName = '';
        this.currentPrescriptionIndex = null; this.autoSaveInterval = null; this.evolutionChartInstance = null; this.components = {};
        this.loadInitialData();
        this.applySettings();
        if (Object.keys(this.solutions).length === 0) { console.log("Initializing default solutions..."); this.initSolutions(); }
        this._bindMethods();
        console.log("NutriSoft constructor finished.");
    }

    _bindMethods() { // Helper to keep constructor cleaner
        const methodsToBind = [
            'handleRouteChange', 'handleDataImport', 'handleSettingsImport', 'handlePrescriptionAction',
            'handleReportsAction', 'handleSolutionsAction', 'saveSettings', 'addPatient',
            'clearPatientForm', 'calculateFormulation', 'savePrescription', 'printPrescription',
            'saveSolution', 'clearSolutionForm', 'handlePatientListAction'
        ];
        methodsToBind.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            } else {
                console.warn(`Method ${method} not found for binding in NutriSoft constructor.`);
            }
        });
    }

    loadInitialData() { 
        console.log("NutriSoft.loadInitialData starting...");
        this.patients = this.dataManager.getPatients();
        this.prescriptions = this.dataManager.getPrescriptions();
        this.solutions = this.dataManager.getSolutions();
        this.settings = this.dataManager.getSettings(); // Ensure settings are loaded early
        this.userName = this.dataManager.getUserName();
        console.log("NutriSoft.loadInitialData finished. Patients:", this.patients.length, "Prescriptions:", this.prescriptions.length, "Solutions:", Object.keys(this.solutions).length);
    }
    init() { 
        console.log("NutriSoft.init starting...");
        this.loadSettings(); // Load settings into UI form
        this.renderUIAllSections(); // Render all dynamic UI parts based on loaded data
        this.initRouting();
        this.initEventListeners();
        this.initAutoSave(); // Start or stop auto-save based on loaded settings
        this.setupSearchListeners();
        this.updateUserNameDisplay();
        this.checkAccessPermissions(); // Apply permissions based on loaded settings (again, to be sure after all UI elements are in place)
        this.handleRouteChange(); // Show the correct initial section based on hash or default (must be after UI rendering and routing init)
        console.log("NutriSoft.init finished successfully.");
    }
    setupSearchListeners() { 
        this.setupPatientSearch();
        this.setupPrescriptionSearch();
        this.setupReportsSearch();
    }
    updateUserNameDisplay() { 
        const userNameInput = document.getElementById('user-name');
        if (userNameInput) {
            userNameInput.value = this.userName;
        } else {
            console.warn("updateUserNameDisplay: user-name input field not found.");
        }
    }
    initSolutions() { 
        // Added osmolarity contribution values (estimates, should be verified)
        this.solutions = {
            'AMINOVEN 10%': { type: 'aminoacid', nitrogen_concentration: 16, protein_concentration: 100, osmolarityContribution: 900 }, // 500 mL ≈ 8 g N ou 50 g proteína
            'VAMINOLACT': { type: 'aminoacid', nitrogen_concentration: 7.6, protein_concentration: 47.5, osmolarityContribution: 800 }, // Approx. g/L
            'DIPEPTIVEN 200mg/ml': { type: 'glutamine', glutamine_concentration: 200, nitrogen_concentration: 32.6, osmolarityContribution: 900 }, // glutamine_concentration in mg/mL, nitrogen_concentration in g/L
            'GLUCOSE 50%': { type: 'glucose', glucose_concentration: 500, osmolarityContribution: 2775 }, // glucose_concentration in g/L
            'SMOFLIPID 200mg/ml': { type: 'lipid', lipid_concentration: 200, osmolarityContribution: 320 }, // lipid_concentration in mg/mL
            'CLORETO SÓDIO 20%': { type: 'electrolyte', sodium_concentration: 3400, osmolarityContribution: 6840 }, // mEq/L
            'CLORETO POTÁSSIO 7,5%': { type: 'electrolyte', potassium_concentration: 1000, osmolarityContribution: 2000 }, // mEq/L
            'SULFATO MAGNÉSIO 20%': { type: 'electrolyte', magnesium_concentration: 1600, osmolarityContribution: 1600 }, // mEq/L
            'GLUCONATO CÁLCIO 10%': { type: 'electrolyte', calcium_concentration: 465, osmolarityContribution: 680 }, // mEq/L
            'GLICEROFOSFATO SÓDIO': { type: 'electrolyte', phosphorus_concentration: 1000, sodium_concentration: 2000, osmolarityContribution: 4000 }, // phosphorus_concentration in mmol/L, sodium_concentration in mEq/L
            'INSULINA ACTRAPID 100UI/ml': { type: 'insulin', insulin_concentration: 100, osmolarityContribution: 10 }, // UI/ml
            'HEPARINA (5000UI/ml)': { type: 'heparin', heparin_concentration: 5000, osmolarityContribution: 5 }, // UI/ml
            'CARNITINA (1g/5ml)': { type: 'carnitine', carnitine_concentration: 200, osmolarityContribution: 1240 }, // mg/ml (1g/5ml = 1000mg/5ml = 200mg/ml)
            'ADDAVEN': { type: 'oligoelement', osmolarityContribution: 2900 },
            'TRACUTIL': { type: 'oligoelement', osmolarityContribution: 500 },
            'PEDITRACE': { type: 'oligoelement', osmolarityContribution: 3000 },
            'SOLUVIT N': { type: 'vitamin', osmolarityContribution: 500 },
            'VITALIPID ADULTO': { type: 'vitamin', osmolarityContribution: 20 },
            'VITALIPID INFANTIL': { type: 'vitamin', osmolarityContribution: 15 },
            'ÁGUA DESTILADA': { type: 'water', osmolarityContribution: 0 }
        };
        this.dataManager.saveSolutions(this.solutions);
        this.renderSolutions();
        AuditLogger.log('initDefaultSolutions');
    }
    initRouting() { 
        console.log("NutriSoft.initRouting: Adding hashchange listener.");
        window.addEventListener('hashchange', this.handleRouteChange);
    }
    handleRouteChange() { 
        const hash = window.location.hash;
        console.log(`NutriSoft.handleRouteChange: Hash changed to: ${hash}`);
        const sectionId = hash.substring(1) || 'patients'; // Default to 'patients'
        this.showSection(sectionId);
    }
    updateNavButtons(sectionId) { 
        // console.log(`NutriSoft.updateNavButtons: Updating for section '${sectionId}'`);
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-700', 'text-white'); 
        });
        const activeBtn = document.getElementById(`${sectionId}-nav-btn`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-blue-700', 'text-white'); 
            // console.log(`NutriSoft.updateNavButtons: Button '${activeBtn.id}' set to active.`);
        } else {
            console.warn(`NutriSoft.updateNavButtons: Active button for section '${sectionId}' (ID: ${sectionId}-nav-btn) not found.`);
        }
    }
    showSection(sectionId) { 
        console.log(`NutriSoft.showSection: Attempting to show section: '${sectionId}'`);
        let sectionShown = false;
        document.querySelectorAll('.section').forEach(sec => {
            if (sec.id === `${sectionId}-section`) {
                sec.classList.remove('hidden');
                sectionShown = true;
                console.log(`NutriSoft.showSection: Section '${sec.id}' made visible.`);
            } else {
                sec.classList.add('hidden');
            }
        });

        if (sectionShown) {
            this.updateNavButtons(sectionId);
            switch (sectionId) {
                case 'reports': this.renderReports(); break;
                case 'prescription':
                    this.renderPatients(); 
                    this.renderPrescriptionHistory(); 
                    break;
                case 'evolution': this.renderEvolutionPatientSelect(); break;
                case 'performance': this.renderPerformanceStats(); break;
                case 'solutions': this.renderSolutions(); break;
                case 'settings': this.renderAuditLogs(); break;
                case 'patients':
                     this.renderPatientsList();
                     this.renderPatients(); 
                     break;
            }
        } else {
            console.warn(`NutriSoft.showSection: Section element NOT FOUND for ID: '${sectionId}-section'.`);
            if (sectionId !== 'patients') { 
                 console.warn(`NutriSoft.showSection: Fallback to 'patients' section.`);
                 this.showSection('patients'); 
                 window.location.hash = 'patients'; 
            } else {
                this.dataManager.displayNotification("Erro crítico: Secção 'patients' não encontrada. A aplicação pode não funcionar corretamente.", "error");
            }
        }
    }
    initAutoSave() { 
        this.toggleAutoSave(); 
    }
    toggleAutoSave() { 
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
        const intervalMinutes = Number(this.settings.autoSaveIntervalMinutes) || 5;

        if (this.settings.autoSaveEnabled) {
            this.autoSaveInterval = setInterval(() => {
                console.log(`Auto-saving data (interval: ${intervalMinutes} min)...`);
                this.saveAllData();
                this.dataManager.autoExportData(); 
            }, intervalMinutes * 60 * 1000);
            console.log(`Auto-save enabled (Interval: ${intervalMinutes} minutes).`);
        } else {
            console.log("Auto-save disabled.");
        }
    }
    saveAllData() { 
        console.log("NutriSoft.saveAllData: Saving all application data...");
        this.dataManager.savePatients(this.patients);
        this.dataManager.savePrescriptions(this.prescriptions);
        this.dataManager.saveSolutions(this.solutions);
        this.dataManager.saveSettings(this.settings);
        this.dataManager.saveUserName(this.userName);
        console.log("NutriSoft.saveAllData: All data saving process initiated.");
    }
    loadSettings() { 
        const settings = this.settings; 
        console.log("NutriSoft.loadSettings: Loading settings into UI:", settings);

        const osmolarityLimitInput = document.getElementById('default-osmolarity-limit');
        const autoSaveIntervalInput = document.getElementById('auto-save-interval');
        const autoSaveCheckbox = document.getElementById('enable-auto-save');
        const autoExportCheckbox = document.getElementById('enable-auto-export');
        const accessLevelSelect = document.getElementById('access-level');
        const permExportCheckbox = document.getElementById('perm-export');

        if (osmolarityLimitInput) osmolarityLimitInput.value = settings.osmolarityLimits?.peripheral ?? 900; else console.warn("loadSettings: osmolarityLimitInput not found");
        if (autoSaveIntervalInput) autoSaveIntervalInput.value = settings.autoSaveIntervalMinutes ?? 5; else console.warn("loadSettings: autoSaveIntervalInput not found");
        if (autoSaveCheckbox) autoSaveCheckbox.checked = settings.autoSaveEnabled ?? false; else console.warn("loadSettings: autoSaveCheckbox not found");
        if (autoExportCheckbox) autoExportCheckbox.checked = settings.autoExportEnabled ?? false; else console.warn("loadSettings: autoExportCheckbox not found");
        if (accessLevelSelect) accessLevelSelect.value = settings.accessLevel ?? 'admin'; else console.warn("loadSettings: accessLevelSelect not found");
        if (permExportCheckbox) permExportCheckbox.checked = settings.permissions?.exportData ?? false; else console.warn("loadSettings: permExportCheckbox not found");
    }
    saveSettings() { 
        console.log("NutriSoft.saveSettings: Saving settings from UI...");
        const osmolarityLimitInput = document.getElementById('default-osmolarity-limit');
        const autoSaveIntervalInput = document.getElementById('auto-save-interval');
        const autoSaveCheckbox = document.getElementById('enable-auto-save');
        const autoExportCheckbox = document.getElementById('enable-auto-export');
        const accessLevelSelect = document.getElementById('access-level');
        const permExportCheckbox = document.getElementById('perm-export');

        this.settings.osmolarityLimits.peripheral = Number(osmolarityLimitInput?.value) || this.settings.osmolarityLimits.peripheral || 900;
        this.settings.autoSaveIntervalMinutes = Number(autoSaveIntervalInput?.value) || this.settings.autoSaveIntervalMinutes || 5;
        this.settings.autoSaveEnabled = autoSaveCheckbox?.checked ?? false;
        this.settings.autoExportEnabled = autoExportCheckbox?.checked ?? false;
        this.settings.accessLevel = accessLevelSelect?.value ?? this.settings.accessLevel ?? 'admin';
        this.settings.permissions = this.settings.permissions || {}; 
        this.settings.permissions.exportData = permExportCheckbox?.checked ?? false;

        this.dataManager.saveSettings(this.settings); 
        this.applySettings(); 
        this.toggleAutoSave(); 
        this.checkAccessPermissions(); 

        AuditLogger.log('saveSettings', { settings: this.settings });
        this.dataManager.displayNotification('Configurações salvas com sucesso!', 'success');
        console.log("NutriSoft.saveSettings: Settings saved and applied:", this.settings);
    }
    applySettings() { 
        console.log("NutriSoft.applySettings: Applying current settings...");
        this.checkAccessPermissions();
    }
    checkAccessPermissions() { 
        const currentAccessLevel = this.settings.accessLevel || 'admin';
        const permissions = this.settings.permissions || {};
        const isAdmin = currentAccessLevel === 'admin';
        const isPrescriber = currentAccessLevel === 'prescriber';
        console.log(`NutriSoft.checkAccessPermissions: Level='${currentAccessLevel}', IsAdmin=${isAdmin}, IsPrescriber=${isPrescriber}, Perms=`, permissions);

        const exportDataBtn = document.getElementById('export-data-btn');
        const exportSettingsBtn = document.getElementById('export-settings-btn');
        const exportAuditLogsBtn = document.getElementById('export-audit-logs-btn');
        const importDataBtn = document.getElementById('import-data-btn');
        const importSettingsBtn = document.getElementById('import-settings-btn');

        const settingsNavBtn = document.getElementById('settings-nav-btn');
        const solutionsNavBtn = document.getElementById('solutions-nav-btn');
        const auditLogViewBtn = document.getElementById('view-audit-logs-btn'); 

        settingsNavBtn?.classList.toggle('hidden', !isAdmin);
        solutionsNavBtn?.classList.remove('hidden');

        if (exportDataBtn) exportDataBtn.disabled = !(isAdmin || (isPrescriber && permissions.exportData));
        if (exportSettingsBtn) exportSettingsBtn.disabled = !isAdmin;
        if (exportAuditLogsBtn) exportAuditLogsBtn.disabled = !isAdmin;
        if (importDataBtn) importDataBtn.disabled = !isAdmin;
        if (importSettingsBtn) importSettingsBtn.disabled = !isAdmin;
        if (auditLogViewBtn) auditLogViewBtn.classList.toggle('hidden', !isAdmin); 


        const canDelete = isAdmin; 
        document.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.classList.toggle('hidden', !canDelete);
        });
        document.querySelectorAll('#solutions-list button[data-action="edit"]').forEach(btn => {
            btn.classList.toggle('hidden', !isAdmin); 
        });
        document.getElementById('add-solution-btn')?.classList.toggle('hidden', !isAdmin); 
    }
    initEventListeners() { 
        console.log("NutriSoft.initEventListeners: Setting up event listeners...");

        const userNameInput = document.getElementById('user-name');
        userNameInput?.addEventListener('change', (event) => {
            this.userName = event.target.value.trim();
            this.dataManager.saveUserName(this.userName);
            AuditLogger.log('userNameChanged', { userName: this.userName });
            console.log("User name changed and saved:", this.userName);
        });

        document.getElementById('add-patient-btn')?.addEventListener('click', this.addPatient);
        document.getElementById('clear-patient-form-btn')?.addEventListener('click', this.clearPatientForm);
        document.getElementById('patient-dob')?.addEventListener('change', (e) => this.updateAgeDisplay(e.target.value));

        document.getElementById('calculate-formulation-btn')?.addEventListener('click', this.calculateFormulation);
        document.getElementById('save-prescription-btn')?.addEventListener('click', this.savePrescription);
        document.getElementById('print-prescription-btn')?.addEventListener('click', () => this.printPrescription(this.currentPrescriptionIndex));
        document.getElementById('suggest-needs-btn')?.addEventListener('click', () => this.applySuggestedNeeds());

        document.getElementById('save-settings-btn')?.addEventListener('click', this.saveSettings);
        ['auto-save-interval', 'enable-auto-save', 'enable-auto-export', 'access-level', 'perm-export', 'default-osmolarity-limit'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', this.saveSettings);
        });


        document.getElementById('view-audit-logs-btn')?.addEventListener('click', () => { this.showAuditLogsModal(); this.renderAuditLogs(); });
        document.getElementById('close-audit-logs-modal-btn')?.addEventListener('click', () => { this.hideAuditLogsModal(); });

        document.querySelectorAll('.nav-btn[id$="-nav-btn"]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault(); 
                const sectionId = btn.id.replace('-nav-btn', '');
                console.log(`NutriSoft.initEventListeners: Nav button clicked for section: '${sectionId}'. Setting hash.`);
                window.location.hash = sectionId; 
            });
        });

        document.getElementById('export-data-btn')?.addEventListener('click', () => this.confirmExportData('all'));
        document.getElementById('import-data-btn')?.addEventListener('click', () => document.getElementById('data-import-file')?.click());
        document.getElementById('export-settings-btn')?.addEventListener('click', () => this.dataManager.exportData('settings'));
        document.getElementById('import-settings-btn')?.addEventListener('click', () => document.getElementById('settings-import-file')?.click());
        document.getElementById('export-audit-logs-btn')?.addEventListener('click', () => this.dataManager.exportData('auditLogs'));

        document.getElementById('data-import-file')?.addEventListener('change', this.handleDataImport);
        document.getElementById('settings-import-file')?.addEventListener('change', this.handleSettingsImport);

        document.getElementById('prescription-history-table')?.addEventListener('click', this.handlePrescriptionAction);
        document.getElementById('reports-table')?.addEventListener('click', this.handleReportsAction);
        document.getElementById('solutions-list')?.addEventListener('click', this.handleSolutionsAction);
        document.getElementById('patients-list')?.addEventListener('click', this.handlePatientListAction.bind(this)); 

        document.getElementById('add-solution-btn')?.addEventListener('click', () => this.editSolution()); 
        document.getElementById('save-solution-btn')?.addEventListener('click', this.saveSolution);
        document.getElementById('cancel-solution-btn')?.addEventListener('click', () => this.clearSolutionForm(true)); 
        document.getElementById('solution-type')?.addEventListener('change', (event) => {
            this.updateSolutionFormFieldsVisibility(event.target.value);
        });

        document.getElementById('prescription-protocol')?.addEventListener('change', (e) => {
            this.applyProtocol(e.target.value);
        });

        const evolutionPatientSelect = document.getElementById('evolution-patient-select');
        evolutionPatientSelect?.addEventListener('change', () => {
             const patientId = evolutionPatientSelect.value;
             if (patientId) {
                 document.getElementById('patient-evolution-data')?.classList.remove('hidden');
                 this.renderPatientEvolution(parseInt(patientId));
                 this.renderPatientEvolutionChart(parseInt(patientId));
                 AuditLogger.log('viewEvolution', { patientId: patientId });
             } else {
                 document.getElementById('patient-evolution-data')?.classList.add('hidden');
                 if (this.evolutionChartInstance) {
                     this.evolutionChartInstance.destroy();
                     this.evolutionChartInstance = null;
                     const canvas = document.getElementById('evolutionChartCanvas');
                     if (canvas) {
                         const ctx = canvas.getContext('2d');
                         ctx.clearRect(0, 0, canvas.width, canvas.height);
                     }
                 }
                 const tbody = document.getElementById('patient-evolution-history');
                 if (tbody) tbody.innerHTML = '<tr class="no-results-row"><td colspan="7" class="p-3 text-center text-gray-500">Selecione um doente para ver a evolução.</td></tr>';
             }
        });

        const prescriptionForm = document.getElementById('prescription-form');
        if (prescriptionForm) {
            prescriptionForm.addEventListener('input', (event) => {
                if (event.target.matches('input, select')) {
                    console.log("Prescription input changed, disabling save/print buttons.");
                    const saveBtn = document.getElementById('save-prescription-btn');
                    const printBtn = document.getElementById('print-prescription-btn');
                    if (saveBtn) saveBtn.disabled = true;
                    if (printBtn) printBtn.disabled = true;
                    if (event.isTrusted && event.target.dataset && event.target.dataset.suggested) {
                        delete event.target.dataset.suggested;
                        event.target.classList.remove('suggested-field');
                    }
                }
            });
        }
        console.log("NutriSoft.initEventListeners: Listeners setup finished.");
    }
    handlePatientListAction(event) { 
         const button = event.target.closest('button.table-action-btn');
         if (!button) return;

         const action = button.dataset.action;
         const patientId = parseInt(button.dataset.id);

         if (isNaN(patientId)) {
             console.error("Invalid patient ID for action:", button.dataset.id);
             return;
         }

         if (action === 'edit') {
             this.editPatient(patientId);
             AuditLogger.log('initiateEditPatient', { patientId });
             document.getElementById('patient-name')?.focus();
         } else if (action === 'delete') {
             this.deletePatient(patientId);
         }
     }
    confirmExportData(dataType) { 
        if (confirm(`Deseja exportar ${dataType === 'all' ? 'todos os dados' : dataType === 'settings' ? 'as configurações' : 'os logs de auditoria'} para um ficheiro JSON?`)) {
            this.dataManager.exportData(dataType);
            AuditLogger.log('exportDataConfirmed', { type: dataType });
        } else {
            AuditLogger.log('exportDataCancelled', { type: dataType });
            this.dataManager.displayNotification('Exportação cancelada.', 'info');
        }
    }
    handleSolutionsAction(event) { 
        const button = event.target.closest('button.table-action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const solutionName = button.dataset.name;

        if (!solutionName) {
            console.error("Invalid solution name for action:", button.dataset.name);
            return;
        }

        if (action === 'edit') {
            this.editSolution(solutionName);
            AuditLogger.log('initiateEditSolution', { solutionName });
        } else if (action === 'delete') {
            this.deleteSolution(solutionName);
        }
    }
    handlePrescriptionAction(event) { 
        const button = event.target.closest('button.table-action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const reversedIndex = parseInt(button.dataset.index); 
        if (isNaN(reversedIndex)) {
            console.error("Invalid reversedIndex for prescription action:", button.dataset.index);
            return;
        }

        const originalIndex = this.prescriptions.length - 1 - reversedIndex;

        if (originalIndex < 0 || originalIndex >= this.prescriptions.length) {
            console.error("Invalid originalIndex for prescription action. Reversed:", reversedIndex, "Original:", originalIndex, "Total Prescriptions:", this.prescriptions.length);
            this.dataManager.displayNotification("Erro: Índice de prescrição inválido.", "error");
            return;
        }

        const prescription = this.prescriptions[originalIndex];
        const prepInfo = { prepId: prescription?.preparationNumber, index: originalIndex };
        AuditLogger.log(`initiatePrescription${action.charAt(0).toUpperCase() + action.slice(1)}`, prepInfo);

        switch (action) {
            case 'view': this.viewPrescription(originalIndex); break;
            case 'edit': this.editPrescription(originalIndex); break;
            case 'print': this.printPrescription(originalIndex); break;
            case 'delete': this.deletePrescription(originalIndex); break;
            default: console.warn("Unknown prescription action:", action);
        }
    }
    handleReportsAction(event) { 
         const button = event.target.closest('button.table-action-btn');
         if (!button) return;

         const action = button.dataset.action;
         const prepNumberStr = button.dataset.prepNumber;
         if (!prepNumberStr) {
             console.error("No data-prep-number attribute found on report action button.");
             this.dataManager.displayNotification("Erro ao identificar a prescrição para esta ação (sem nº prep).", "error");
             return;
         }
         const prepNumber = parseInt(prepNumberStr);


         if (prepNumber === null || isNaN(prepNumber)) {
             console.error("Could not find or parse preparation number for report action from table row or data attribute.");
             this.dataManager.displayNotification("Erro ao identificar a prescrição para esta ação.", "error");
             return;
         }

         const originalIndex = this.prescriptions.findIndex(p => p.preparationNumber === prepNumber);

         if (originalIndex === -1) {
             console.error(`Prescription with number ${prepNumber} not found in original data for report action.`);
             this.dataManager.displayNotification(`Prescrição #${prepNumber} não encontrada. Pode ter sido excluída ou os dados estão dessincronizados.`, 'error');
             return;
         }

         const prescription = this.prescriptions[originalIndex];
         const prepInfo = { prepId: prescription.preparationNumber, index: originalIndex };
         AuditLogger.log(`initiateReport${action.charAt(0).toUpperCase() + action.slice(1)}`, prepInfo);

         switch (action) {
             case 'view':
                 this.viewPrescription(originalIndex);
                 window.location.hash = 'prescription'; 
                 break;
             case 'edit': 
                 this.editPrescription(originalIndex);
                 window.location.hash = 'prescription';
                 break;
             case 'print':
                 this.printPrescription(originalIndex);
                 break;
             case 'delete':
                 this.deletePrescription(originalIndex); 
                 break;
             default: console.warn("Unknown report action:", action);
         }
     }
    handleDataImport(event) { 
        const file = event.target.files?.[0];
        if (!file) return;

        AuditLogger.log('importDataAttempt', { type: 'all', filename: file.name });
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileContent = e.target?.result;
                if (typeof fileContent !== 'string' || fileContent.trim() === "") {
                    throw new Error("File content is empty or invalid.");
                }
                const jsonData = JSON.parse(fileContent);

                if (confirm('Atenção: Importar dados substituirá TODOS os dados atuais (doentes, prescrições, soluções, configurações, logs). Deseja continuar?')) {
                    AuditLogger.log('importDataConfirmed', { type: 'all', filename: file.name });
                    if (this.dataManager.importData('all', jsonData)) {
                        this.loadInitialData();       
                        this.renderUIAllSections();   
                        this.loadSettings();          
                        this.updateUserNameDisplay(); 
                        this.checkAccessPermissions(); 
                        this.toggleAutoSave();        
                        this.dataManager.displayNotification('Dados importados com sucesso! A aplicação irá recarregar para garantir consistência.', 'success');
                        setTimeout(() => window.location.reload(), 2500);
                    } 
                } else {
                    AuditLogger.log('importDataCancelledByUser', { type: 'all', filename: file.name });
                    this.dataManager.displayNotification('Importação de dados cancelada.', 'info');
                }
            } catch (error) {
                console.error('Erro ao processar o ficheiro de importação de dados:', error);
                AuditLogger.log('importDataError', { type: 'all', filename: file.name, error: error.message });
                this.dataManager.displayNotification('Erro ao ler ou processar o ficheiro de importação. Verifique se é um JSON válido e o conteúdo esperado.', 'error');
            } finally {
                 event.target.value = ''; 
            }
        };
        reader.onerror = () => {
            console.error('Erro ao ler o ficheiro de importação.');
            AuditLogger.log('importDataError', { type: 'all', filename: file.name, error: 'FileReader error' });
            this.dataManager.displayNotification('Erro ao ler o ficheiro de importação.', 'error');
            event.target.value = ''; 
        };
        reader.readAsText(file);
    }
    handleSettingsImport(event) { 
        const file = event.target.files?.[0];
        if (!file) return;

        AuditLogger.log('importSettingsAttempt', { filename: file.name });
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileContent = e.target?.result;
                if (typeof fileContent !== 'string' || fileContent.trim() === "") {
                    throw new Error("File content is empty or invalid.");
                }
                const jsonData = JSON.parse(fileContent);

                if (confirm('Atenção: Importar configurações substituirá as configurações atuais. Deseja continuar?')) {
                     AuditLogger.log('importSettingsConfirmed', { filename: file.name });
                    if (this.dataManager.importData('settings', jsonData)) {
                        this.settings = this.dataManager.getSettings(); 
                        this.loadSettings(); 
                        this.checkAccessPermissions(); 
                        this.toggleAutoSave(); 
                        AuditLogger.log('importSettingsSuccess', { filename: file.name });
                        this.dataManager.displayNotification('Configurações importadas com sucesso!', 'success');
                    } 
                } else {
                    AuditLogger.log('importSettingsCancelledByUser', { filename: file.name });
                    this.dataManager.displayNotification('Importação de configurações cancelada.', 'info');
                }
            } catch (error) {
                console.error('Erro ao processar o ficheiro de importação de configurações:', error);
                AuditLogger.log('importSettingsError', { filename: file.name, error: error.message });
                this.dataManager.displayNotification('Erro ao ler ou processar o ficheiro de configurações. Verifique se é um JSON válido.', 'error');
            } finally {
                event.target.value = ''; 
            }
        };
         reader.onerror = () => {
            console.error('Erro ao ler o ficheiro de importação de configurações.');
            AuditLogger.log('importSettingsError', { type: 'settings', filename: file.name, error: 'FileReader error' });
            this.dataManager.displayNotification('Erro ao ler o ficheiro de importação de configurações.', 'error');
            event.target.value = ''; 
        };
        reader.readAsText(file);
    }
    renderUIAllSections() { 
        console.log("NutriSoft.renderUIAllSections: Rendering all dynamic UI content...");
        this.renderPatients();
        this.renderProtocolOptions();
        this.renderPatientsList();
        this.renderPrescriptionHistory();
        this.renderReports();
        this.renderPerformanceStats();
        this.renderSolutions();
        this.renderEvolutionPatientSelect();
        console.log("NutriSoft.renderUIAllSections: All sections rendering process initiated.");
    }
    renderSolutions() { 
        const tbody = document.getElementById('solutions-list');
        if (!tbody) {
            console.warn("renderSolutions: solutions-list tbody not found.");
            return;
        }

        const noResultsRowTemplate = tbody.querySelector('.no-results-row'); 
        tbody.innerHTML = ''; 
        if (noResultsRowTemplate) tbody.appendChild(noResultsRowTemplate.cloneNode(true)); 

        const sortedSolutionNames = Object.keys(this.solutions).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        const noResultsRow = tbody.querySelector('.no-results-row'); 

        if (sortedSolutionNames.length === 0) {
            noResultsRow?.classList.remove('hidden');
            return;
        }
        noResultsRow?.classList.add('hidden');


        sortedSolutionNames.forEach(name => {
            const details = this.solutions[name];
            const row = tbody.insertRow(tbody.rows.length - (noResultsRow ? 1 : 0) );
            row.classList.add('hover:bg-gray-50');

            let concentrationDetails = 'N/A';
            try {
                switch (details.type) {
                    case 'aminoacid': concentrationDetails = `N: ${details.nitrogen_concentration ?? '?'} g/L, Prot: ${details.protein_concentration ?? '?'} g/L`; break;
                    case 'glutamine': concentrationDetails = `Glut: ${details.glutamine_concentration ?? '?'} mg/ml, N: ${details.nitrogen_concentration ?? '?'} g/L`; break;
                    case 'glucose': concentrationDetails = `Gluc: ${details.glucose_concentration ?? '?'} g/L`; break;
                    case 'lipid': concentrationDetails = `Lip: ${details.lipid_concentration ?? '?'} mg/ml`; break;
                    case 'electrolyte':
                        concentrationDetails = [
                            details.sodium_concentration ? `Na: ${details.sodium_concentration} mEq/L` : null,
                            details.potassium_concentration ? `K: ${details.potassium_concentration} mEq/L` : null,
                            details.magnesium_concentration ? `Mg: ${details.magnesium_concentration} mEq/L` : null,
                            details.calcium_concentration ? `Ca: ${details.calcium_concentration} mEq/L` : null,
                            details.phosphorus_concentration ? `P: ${details.phosphorus_concentration} mmol/L` : null
                        ].filter(Boolean).join(', ') || 'N/A';
                        break;
                    case 'insulin': concentrationDetails = `Ins: ${details.insulin_concentration ?? '?'} UI/ml`; break;
                    case 'heparin': concentrationDetails = `Hep: ${details.heparin_concentration ?? '?'} UI/ml`; break;
                    case 'carnitine': concentrationDetails = `Carn: ${details.carnitine_concentration ?? '?'} mg/ml`; break;
                    case 'water': concentrationDetails = 'Veículo'; break;
                    case 'vitamin': concentrationDetails = 'Complexo Vitamínico'; break;
                    case 'oligoelement': concentrationDetails = 'Complexo Oligoelementos'; break;
                    default: concentrationDetails = details.type ? `Tipo: ${details.type}` : 'Tipo não especificado';
                }
                if (details.osmolarityContribution !== undefined && details.osmolarityContribution !== null) {
                    concentrationDetails += ` (Osm: ${details.osmolarityContribution} mOsm/L)`;
                }
            } catch (e) {
                console.error(`Error formatting solution details for ${name}:`, e);
                concentrationDetails = 'Erro nos detalhes';
            }

            row.innerHTML = `
                <td class="px-4 py-2 font-medium text-gray-900">${name}</td>
                <td class="px-4 py-2">${details.type || 'N/A'}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${concentrationDetails}</td>
                <td class="px-4 py-2 whitespace-nowrap text-right">
                    <button data-action="edit" data-name="${name}" class="table-action-btn text-blue-600 hover:text-blue-800 mr-2" title="Editar Solução"><i class="fas fa-edit"></i></button>
                    <button data-action="delete" data-name="${name}" class="table-action-btn text-red-600 hover:text-red-800" title="Eliminar Solução"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
        this.checkAccessPermissions(); 
    }
    renderPatients() { 
        const select = document.getElementById('prescription-patient');
        if (!select) {
            console.warn("renderPatients: prescription-patient select not found.");
            return;
        }

        const currentVal = select.value; 
        select.innerHTML = '<option value="">Selecione um doente...</option>'; 

        const sortedPatients = [...this.patients].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        sortedPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (${patient.idNumber || 'ID Interno:' + patient.id})`;
             if (String(patient.id) === currentVal) { 
                 option.selected = true;
             }
            select.appendChild(option);
        });
    }
    renderEvolutionPatientSelect() { 
        const select = document.getElementById('evolution-patient-select');
        if (!select) {
            console.warn("renderEvolutionPatientSelect: evolution-patient-select not found.");
            return;
        }

        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione um doente...</option>';
        const sortedPatients = [...this.patients].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        sortedPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (${patient.idNumber || 'ID Interno:' + patient.id})`;
             if (String(patient.id) === currentVal) {
                option.selected = true;
                document.getElementById('patient-evolution-data')?.classList.remove('hidden');
                this.renderPatientEvolution(parseInt(patient.id));
                this.renderPatientEvolutionChart(parseInt(patient.id));
             }
            select.appendChild(option);
        });
        if (!select.value) { 
             document.getElementById('patient-evolution-data')?.classList.add('hidden');
        }
    }
    renderPatientsList(filteredPatients = this.patients) { 
        const tbody = document.getElementById('patients-list');
        if (!tbody) {
            console.warn("renderPatientsList: patients-list tbody not found.");
            return;
        }
        const noResultsRowTemplate = tbody.querySelector('.no-results-row');
        tbody.innerHTML = '';
        if (noResultsRowTemplate) tbody.appendChild(noResultsRowTemplate.cloneNode(true));

        const noResultsRow = tbody.querySelector('.no-results-row');

        if (filteredPatients.length === 0) {
            noResultsRow?.classList.remove('hidden');
            return;
        }
        noResultsRow?.classList.add('hidden');

        const sortedPatients = [...filteredPatients].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        sortedPatients.forEach(patient => {
            const row = tbody.insertRow(tbody.rows.length - (noResultsRow ? 1 : 0));
            row.classList.add('hover:bg-gray-50');
            row.insertCell().textContent = patient.idNumber || '-';
            row.insertCell().textContent = patient.name;
            row.insertCell().textContent = patient.service || '-';
            row.insertCell().textContent = `${patient.weight ?? '?'} kg`;
            row.insertCell().textContent = patient.condition || '-';

            const actionsCell = row.insertCell();
            actionsCell.classList.add('whitespace-nowrap', 'p-3', 'text-right'); 
            actionsCell.innerHTML = `
                <button data-action="edit" data-id="${patient.id}" class="table-action-btn text-blue-600 hover:text-blue-800 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Editar Doente"><i class="fas fa-edit"></i></button>
                <button data-action="delete" data-id="${patient.id}" class="table-action-btn text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500" title="Eliminar Doente"><i class="fas fa-trash"></i></button>
            `;
        });
        this.checkAccessPermissions();
    }

    renderProtocolOptions() {
        const select = document.getElementById('prescription-protocol');
        if (!select) {
            console.warn("renderProtocolOptions: select not found.");
            return;
        }
        const currentVal = select.value;
        select.innerHTML = '<option value="">Nenhum</option>';
        (this.settings.protocols || []).forEach(proto => {
            const opt = document.createElement('option');
            opt.value = proto.id;
            opt.textContent = proto.name;
            if (proto.id === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    applyProtocol(protocolId) {
        if (!protocolId) return;
        const protocol = (this.settings.protocols || []).find(p => p.id === protocolId);
        if (!protocol) return;
        const template = protocol.dailyTemplates?.[0];
        if (!template?.inputs) return;
        const patient = this.getSelectedPatient();
        const weight = patient?.weight || 0;
        const inputs = template.inputs;
        if (inputs.nitrogen) this.setInputValue('nitrogen-admin', inputs.nitrogen);
        if (inputs.glucose) this.setInputValue('glucose-admin', inputs.glucose);
        if (inputs.lipids) this.setInputValue('lipid-admin', inputs.lipids);
        if (weight > 0) {
            if (inputs.sodium) this.setInputValue('sodium-needs', (inputs.sodium / weight).toFixed(2));
            if (inputs.potassium) this.setInputValue('potassium-needs', (inputs.potassium / weight).toFixed(2));
            if (inputs.magnesium) this.setInputValue('magnesium-needs', (inputs.magnesium / weight).toFixed(2));
            if (inputs.calcium) this.setInputValue('calcium-needs', (inputs.calcium / weight).toFixed(2));
        }
        if (inputs.phosphorus) this.setInputValue('phosphorus-needs', inputs.phosphorus);
        if (inputs.traceElements) this.setInputValue('oligoelements-volume', inputs.traceElements);
    }
    renderPatientEvolution(patientId) { 
         const tbody = document.getElementById('patient-evolution-history');
         if (!tbody) {
            console.warn("renderPatientEvolution: patient-evolution-history tbody not found.");
            return;
         }
         const noResultsRowTemplate = tbody.querySelector('.no-results-row');
         tbody.innerHTML = '';
         if (noResultsRowTemplate) tbody.appendChild(noResultsRowTemplate.cloneNode(true));

         const noResultsRow = tbody.querySelector('.no-results-row');

         const patientPrescriptions = this.prescriptions
             .filter(p => p.patientId === patientId)
             .sort((a, b) => new Date(b.date) - new Date(a.date)); 

         if (patientPrescriptions.length === 0) {
             noResultsRow?.classList.remove('hidden');
             return;
         }
         noResultsRow?.classList.add('hidden');

         patientPrescriptions.forEach(prescription => {
             const form = prescription.formulation;
             const row = tbody.insertRow(tbody.rows.length - (noResultsRow ? 1 : 0) );
             row.classList.add('hover:bg-gray-50');
             row.insertCell().textContent = prescription.preparationNumber || '#';
             row.insertCell().textContent = prescription.date ? new Date(prescription.date).toLocaleDateString() : 'N/A';
             row.insertCell().textContent = `${form?.volume?.toFixed(0) ?? '?'} ml`;
             row.insertCell().textContent = `${form?.proteins?.required?.toFixed(1) ?? '?'} g`;
             row.insertCell().textContent = `${form?.lipids?.required?.toFixed(1) ?? '?'} g`;
             row.insertCell().textContent = `${form?.glucose?.required?.toFixed(1) ?? '?'} g`;
             row.insertCell().textContent = `${form?.osmolarity?.toFixed(0) ?? '?'} mOsm/L`;
         });
     }
    renderPatientEvolutionChart(patientId) { 
        const canvas = document.getElementById('evolutionChartCanvas');
        if (!canvas) {
            console.warn("renderPatientEvolutionChart: evolutionChartCanvas not found.");
            return;
        }
        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded. Cannot render evolution chart.");
            canvas.parentElement.innerHTML = '<p class="text-red-500 text-center">Erro: Biblioteca de gráficos (Chart.js) não carregada.</p>';
            return;
        }

        const ctx = canvas.getContext('2d');

        if (this.evolutionChartInstance) {
            this.evolutionChartInstance.destroy(); 
            this.evolutionChartInstance = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height); 

        const patientPrescriptions = this.prescriptions
            .filter(p => p.patientId === patientId)
            .sort((a, b) => new Date(a.date) - new Date(b.date)); 

        if (patientPrescriptions.length === 0) {
             ctx.font = "16px Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
             ctx.fillStyle = "#6b7280"; 
             ctx.textAlign = "center";
             ctx.fillText("Sem dados de prescrição para exibir gráfico.", canvas.width / 2, canvas.height / 2);
            return;
        }

        const labels = patientPrescriptions.map(p => p.date ? new Date(p.date).toLocaleDateString() : 'N/A');
        const proteinData = patientPrescriptions.map(p => p.formulation?.proteins?.required ?? 0);
        const lipidData = patientPrescriptions.map(p => p.formulation?.lipids?.required ?? 0);
        const glucoseData = patientPrescriptions.map(p => p.formulation?.glucose?.required ?? 0);
        const volumeData = patientPrescriptions.map(p => p.formulation?.volume ?? 0);
        const patient = this.patients.find(p=>p.id === patientId);
        const patientName = patient?.name || patientPrescriptions[0]?.patientName || 'Doente';


        this.evolutionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Proteínas (g)', data: proteinData, borderColor: 'rgb(75, 192, 192)', tension: 0.1, yAxisID: 'yNutrients' },
                    { label: 'Lipídios (g)', data: lipidData, borderColor: 'rgb(255, 205, 86)', tension: 0.1, yAxisID: 'yNutrients' },
                    { label: 'Glucose (g)', data: glucoseData, borderColor: 'rgb(255, 99, 132)', tension: 0.1, yAxisID: 'yNutrients' },
                    { label: 'Volume (mL)', data: volumeData, borderColor: 'rgb(54, 162, 235)', tension: 0.1, yAxisID: 'yVolume', hidden: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    yNutrients: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Nutrientes (g)' } },
                    yVolume: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Volume (mL)' }, grid: { drawOnChartArea: false } } 
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Evolução Nutricional de ${patientName}` }
                }
            }
        });
    }
    validateInputs(section) { 
        let isValid = true;
        const fieldsToValidate = [];

        if (section === 'patient') {
            fieldsToValidate.push({ id: 'patient-name', required: true, message: 'Nome do doente é obrigatório.' });
            fieldsToValidate.push({ id: 'patient-weight', required: true, type: 'number', min: 0.1, message: 'Peso deve ser um número válido maior que zero.' });
            fieldsToValidate.push({ id: 'patient-height', required: true, type: 'number', min: 1, message: 'Altura deve ser um número válido maior que zero.' });
            fieldsToValidate.push({ id: 'patient-condition', required: true, message: 'Condição clínica é obrigatória.' });
            fieldsToValidate.push({ id: 'patient-dob', type: 'date', message: 'Data de nascimento inválida.' }); 
        } else if (section === 'prescription') {
            fieldsToValidate.push({ id: 'prescription-patient', required: true, message: 'Selecione o doente.' });
            fieldsToValidate.push({ id: 'total-volume', required: true, type: 'number', min: 1, message: 'Volume total deve ser um número válido maior que zero.' });
            fieldsToValidate.push({ id: 'infusion-hours', required: true, type: 'number', min: 1, message: 'Horas de perfusão devem ser um número válido maior que zero.' });
            fieldsToValidate.push({ id: 'protein-needs', required: true, type: 'number', min: 0, message: 'Necessidades proteicas devem ser >= 0.' });
            fieldsToValidate.push({ id: 'lipid-needs', required: true, type: 'number', min: 0, message: 'Necessidades lipídicas devem ser >= 0.' });
            fieldsToValidate.push({ id: 'glucose-rate', required: true, type: 'number', min: 0, message: 'Taxa de glucose deve ser >= 0.' });
            ['sodium-needs', 'potassium-needs', 'magnesium-needs', 'calcium-needs', 'phosphorus-needs',
             'oligoelements-volume', 'water-soluble-vitamins-volume', 'fat-soluble-vitamins-volume',
             'insulin-rate', 'heparin-rate', 'carnitine-needs'].forEach(id => {
                fieldsToValidate.push({ id: id, type: 'number', min: 0, message: 'Valor deve ser numérico e >= 0 se preenchido.' }); 
            });
        } else if (section === 'solution') {
            fieldsToValidate.push({ id: 'solution-name', required: true, message: 'Nome da solução é obrigatório.' });
            fieldsToValidate.push({ id: 'solution-type', required: true, message: 'Tipo de solução é obrigatório.' });
            fieldsToValidate.push({ id: 'osmolarity-contribution', type: 'number', min: 0, message: 'Osmolaridade deve ser numérica e >= 0 se preenchida.' });

            document.querySelectorAll('#concentration-fields > div:not(.hidden) input[type="number"]').forEach(inputField => {
                if (!inputField.id) return; 
                const labelText = inputField.labels?.[0]?.textContent || inputField.name || 'Concentração';
                fieldsToValidate.push({
                    id: inputField.id,
                    type: 'number',
                    min: 0, 
                    message: `${labelText}: valor deve ser numérico e >= 0 se preenchido.`
                });
            });
        }

        fieldsToValidate.forEach(field => {
            const inputField = document.getElementById(field.id);
            if (!inputField) {
                return;
            }
            const value = inputField.value;
            let fieldIsValid = true;
            let currentMessage = field.message; 

            if (field.required && (value === null || value.trim() === '')) {
                fieldIsValid = false;
            } else if (value.trim() !== '' && field.type === 'number') {
                if (!isValidNumericInput(value)) {
                    fieldIsValid = false; currentMessage = `${inputField.labels?.[0]?.textContent || 'Campo'} deve ser um número.`;
                } else {
                    const numValue = parseNum(value);
                    if (field.min !== undefined && numValue < field.min) {
                        fieldIsValid = false; currentMessage = `${inputField.labels?.[0]?.textContent || 'Campo'} deve ser no mínimo ${field.min}.`;
                    }
                    if (field.max !== undefined && numValue > field.max) {
                        fieldIsValid = false; currentMessage = `${inputField.labels?.[0]?.textContent || 'Campo'} deve ser no máximo ${field.max}.`;
                    }
                }
            } else if (value.trim() !== '' && field.type === 'date') { 
                 if (isNaN(new Date(value).getTime())) { 
                     fieldIsValid = false; currentMessage = `${inputField.labels?.[0]?.textContent || 'Campo'} contém uma data inválida.`;
                 }
            }

            if (!fieldIsValid) {
                this.showErrorMessage(inputField, currentMessage);
                isValid = false;
            } else {
                this.hideErrorMessage(inputField);
            }
        });

        if (!isValid) {
            this.dataManager.displayNotification('Existem erros no formulário. Por favor, corrija os campos marcados a vermelho.', 'warning');
        }
        return isValid;
    }
    showErrorMessage(inputElement, message) { 
        inputElement?.classList.add('error', 'border-red-500'); 
        const errorElementId = `${inputElement.id}-error`;
        const errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } 
    }
    hideErrorMessage(inputElement) { 
        inputElement?.classList.remove('error', 'border-red-500');
        const errorElement = document.getElementById(`${inputElement.id}-error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('hidden');
        }
    }
    calculateAge(dob) {
        if (!dob) return '';
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return '';
            const today = new Date();

            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();

            if (days < 0) {
                months--;
                days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`;
            if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
            if (days >= 0) return `${days} dia${days !== 1 ? 's' : ''}`; 
            return ''; 
        } catch (e) {
            console.error("Error calculating age for DOB:", dob, e);
            return '';
        }
    }
    updateAgeDisplay(dobValue) { 
        const ageDisplay = document.getElementById('patient-age-display');
        if (ageDisplay) {
            ageDisplay.textContent = this.calculateAge(dobValue);
        }
    }
    getPatientAgeInYears(patient) {
        if (!patient) return null;
        if (typeof patient.age === 'number' && Number.isFinite(patient.age)) {
            return patient.age;
        }
        const dob = patient.dob || patient.birthDate;
        if (!dob) return null;
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return null;
        const diffMs = Date.now() - birthDate.getTime();
        if (diffMs < 0) return 0;
        return diffMs / (1000 * 60 * 60 * 24 * 365.25);
    }
    determineGuidelineProfile(patient) {
        if (!patient) return DEFAULT_GUIDELINE_ID;
        if (patient.condition && GUIDELINE_TABLES[patient.condition]) {
            return patient.condition;
        }
        const ageYears = this.getPatientAgeInYears(patient);
        if (ageYears !== null) {
            if (ageYears < 1) return 'neonate';
            if (ageYears < 18) return 'pediatric';
        }
        return DEFAULT_GUIDELINE_ID;
    }
    applySuggestedNeeds() {
        const patient = this.getSelectedPatient();
        if (!patient) {
            this.dataManager.displayNotification('Selecione um doente para gerar sugestões.', 'warning');
            return;
        }

        const profileId = this.determineGuidelineProfile(patient);
        const profile = GUIDELINE_TABLES[profileId] || GUIDELINE_TABLES[DEFAULT_GUIDELINE_ID];
        const weight = Number(patient.weight) || 0;

        const setSuggested = (id, value, decimals = 2) => {
            if (!Number.isFinite(value) || value <= 0) return;
            const field = document.getElementById(id);
            if (!field) return;
            field.value = value.toFixed(decimals);
            field.dataset.suggested = 'true';
            field.classList.add('suggested-field');
            const evt = new Event('input', { bubbles: true });
            field.dispatchEvent(evt);
        };

        setSuggested('protein-needs', midpoint(profile.protein_g_per_kg || []));
        setSuggested('lipid-needs', midpoint(profile.lipid_g_per_kg || []));
        setSuggested('glucose-rate', midpoint(profile.glucose_mg_kg_min || []));
        setSuggested('sodium-needs', midpoint(profile.sodium_mEq_per_kg || []));
        setSuggested('potassium-needs', midpoint(profile.potassium_mEq_per_kg || []));
        setSuggested('magnesium-needs', midpoint(profile.magnesium_mEq_per_kg || []));
        setSuggested('calcium-needs', midpoint(profile.calcium_mEq_per_kg || []));

        if (weight > 0) {
            const phosphorusPerKg = midpoint(profile.phosphorus_mmol_per_kg || []);
            if (phosphorusPerKg > 0) {
                setSuggested('phosphorus-needs', phosphorusPerKg * weight, 0);
            }
        }

        this.dataManager.displayNotification(`Sugestões aplicadas (${profile.label || profileId}). Confirme e ajuste conforme necessário.`, 'info');
        AuditLogger.log('applySuggestedNeeds', { patientId: patient.id, profileId });
    }
    addPatient() { 
        console.log("NutriSoft.addPatient: Attempting to add/edit patient.");
        if (!this.validateInputs('patient')) {
            console.log("NutriSoft.addPatient: Validation failed.");
            return;
        }

        try {
            const patientIdInput = document.getElementById('patient-id'); 
            const editingId = patientIdInput?.value ? parseInt(patientIdInput.value) : null;
            const isEditing = editingId !== null;

            const patientData = {
                id: isEditing ? editingId : this.dataManager.getNextPatientId(),
                idNumber: document.getElementById('patient-id-number')?.value.trim() || null,
                name: document.getElementById('patient-name').value.trim(), 
                service: document.getElementById('patient-service')?.value.trim() || null,
                dob: document.getElementById('patient-dob')?.value || null,
                weight: parseNum(document.getElementById('patient-weight').value, 0),
                height: Math.round(parseNum(document.getElementById('patient-height').value, 0)),
                condition: document.getElementById('patient-condition').value, 
                createdAt: isEditing ? (this.patients.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            let userFeedback = ''; let logAction = '';
            if (isEditing) {
                const index = this.patients.findIndex(p => p.id === patientData.id);
                if (index !== -1) {
                    this.patients[index] = patientData;
                    userFeedback = `Doente "${patientData.name}" atualizado com sucesso!`;
                    logAction = 'editPatient';
                } else {
                     console.error(`NutriSoft.addPatient: Patient with ID ${patientData.id} not found for update.`);
                     this.dataManager.displayNotification('Erro: Doente a editar não encontrado nos dados da aplicação.', 'error'); return;
                }
            } else {
                this.patients.push(patientData);
                userFeedback = `Doente "${patientData.name}" adicionado com sucesso!`;
                logAction = 'addPatient';
            }

            this.dataManager.savePatients(this.patients);
            AuditLogger.log(logAction, { patientId: patientData.id, name: patientData.name });
            this.dataManager.displayNotification(userFeedback, 'success');
            this.renderPatients(); 
            this.renderPatientsList(); 
            this.renderEvolutionPatientSelect(); 
            this.clearPatientForm(); 
            console.log(`NutriSoft.addPatient: Patient ${logAction} successful. ID: ${patientData.id}`);
        } catch (error) {
            console.error("NutriSoft.addPatient: Error during add/edit patient:", error);
            this.dataManager.displayNotification('Erro ao salvar doente. Verifique os dados e tente novamente. Detalhes no console.', 'error');
            AuditLogger.log('addEditPatientError', { error: error.message, inputId: editingId });
        }
    }
    editPatient(patientId) { 
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) {
            this.dataManager.displayNotification('Doente não encontrado para editar.', 'warning'); return;
        }
        console.log("NutriSoft.editPatient: Populating form for patient ID:", patientId, patient);
        this.clearPatientForm(false); 
        document.getElementById('patient-id-number').value = patient.idNumber || '';
        document.getElementById('patient-name').value = patient.name || '';
        document.getElementById('patient-service').value = patient.service || '';
        document.getElementById('patient-dob').value = patient.dob || '';
        document.getElementById('patient-weight').value = patient.weight ?? '';
        document.getElementById('patient-height').value = patient.height ?? '';
        document.getElementById('patient-condition').value = patient.condition || '';
        document.getElementById('patient-id').value = patient.id; 

        this.updateAgeDisplay(patient.dob);
        document.getElementById('patients-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('patient-name')?.focus(); 
    }
    deletePatient(patientId) { 
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) {
             this.dataManager.displayNotification('Doente não encontrado para excluir.', 'warning'); return;
        }
        const associatedPrescriptions = this.prescriptions.filter(p => p.patientId === patientId).length;
        let confirmationMessage = `Tem a certeza que deseja excluir o doente "${patient.name}" (ID: ${patientId})?`;
        if (associatedPrescriptions > 0) {
            confirmationMessage += `\n\nAtenção: Esta ação irá também excluir ${associatedPrescriptions} prescrição(ões) associada(s) a este doente.`;
        }

        if (confirm(confirmationMessage)) {
            console.log(`NutriSoft.deletePatient: Deleting patient ID ${patientId} and associated prescriptions.`);
            const patientName = patient.name; 
            this.patients = this.patients.filter(p => p.id !== patientId);

            const originalPrescriptionCount = this.prescriptions.length;
            this.prescriptions = this.prescriptions.filter(p => p.patientId !== patientId);
            const deletedPrescriptionsCount = originalPrescriptionCount - this.prescriptions.length;

            this.dataManager.savePatients(this.patients);
            this.dataManager.savePrescriptions(this.prescriptions);

            AuditLogger.log('deletePatient', { patientId: patientId, patientName: patientName, deletedPrescriptions: deletedPrescriptionsCount });
            this.dataManager.displayNotification(`Doente "${patientName}" e ${deletedPrescriptionsCount} prescrição(ões) associada(s) foram excluído(s) com sucesso!`, 'success');

            this.renderPatientsList();
            this.renderPatients(); 
            this.renderEvolutionPatientSelect(); 
            this.renderReports();
            this.renderPrescriptionHistory();
            this.clearPatientForm(); 
        } else {
             AuditLogger.log('deletePatientCancelled', { patientId: patientId, patientName: patient.name });
             console.log(`NutriSoft.deletePatient: Deletion of patient ID ${patientId} cancelled by user.`);
        }
    }
    clearPatientForm(logAction = true) { 
        console.log("NutriSoft.clearPatientForm: Clearing patient form.");
        const form = document.getElementById('patient-form');
        if (form) {
            form.reset(); 
            const patientIdField = document.getElementById('patient-id');
            if (patientIdField) patientIdField.value = '';

            form.querySelectorAll('.input-field').forEach(input => {
                this.hideErrorMessage(input); 
            });
        }
        const ageDisplay = document.getElementById('patient-age-display');
        if (ageDisplay) ageDisplay.textContent = '';

        if (logAction) AuditLogger.log('clearPatientForm');
    }
    getSelectedPatient() { 
        const patientIdInput = document.getElementById('prescription-patient');
        const patientIdString = patientIdInput?.value;

        if (!patientIdString) {
            this.dataManager.displayNotification('Nenhum doente selecionado para a prescrição.', 'warning');
            if (patientIdInput) this.showErrorMessage(patientIdInput, 'É obrigatório selecionar um doente.');
            return null;
        }

        const patientId = parseInt(patientIdString);
        const patient = this.patients.find(p => p.id === patientId);

        if (!patient) {
            this.dataManager.displayNotification(`Doente com ID ${patientId} não encontrado nos registos. Poderá ter sido excluído.`, 'error');
            if (patientIdInput) this.showErrorMessage(patientIdInput, 'Doente selecionado é inválido ou não existe.');
            return null;
        }

        if (patientIdInput) this.hideErrorMessage(patientIdInput); 
        return patient;
    }
    getNumericInput(id, defaultValue = 0, isRequired = false) {
        const inputElement = document.getElementById(id);
        if (!inputElement) {
            return defaultValue;
        }
        const rawValue = inputElement.value;
        if (rawValue === null || rawValue.trim() === '') {
            return isRequired ? NaN : defaultValue;
        }
        if (!isValidNumericInput(rawValue)) {
            return isRequired ? NaN : defaultValue;
        }
        return parseNum(rawValue, defaultValue);
    }

    calculateProteins(patient) {
        const defaults = { required: 0, solution: '', volume: 0, nitrogen: 0, error: null };
        if (!patient?.weight) return { ...defaults, error: "Peso do doente não disponível." };

        const weight = patient.weight;
        const proteinNeedsPerKg = this.getNumericInput('protein-needs', 0, true);
        if (isNaN(proteinNeedsPerKg)) {
            return { ...defaults, error: "Necessidades proteicas inválidas." };
        }

        const recommendedProtein_g_day = proteinNeedsPerKg * weight;
        const recommendedNitrogen_g_day = recommendedProtein_g_day / 6.25;

        const nitrogenAdmin = this.getNumericInput('nitrogen-admin', 0, false);
        const hasDirectNitrogen = !isNaN(nitrogenAdmin) && nitrogenAdmin > 0;
        const nitrogenTarget_g_day = hasDirectNitrogen ? nitrogenAdmin : recommendedNitrogen_g_day;

        const aminoacidSolutionName = document.getElementById('amino-acids-solution')?.value;
        const aminoacidSolution = aminoacidSolutionName ? this.solutions[aminoacidSolutionName] : null;

        if (!aminoacidSolution || typeof aminoacidSolution.nitrogen_concentration !== 'number') {
            const errorMsg = `Solução de aminoácidos '${aminoacidSolutionName || 'Nenhuma'}' inválida ou sem concentração de azoto definida.`;
            return {
                ...defaults,
                solution: aminoacidSolutionName || '',
                nitrogen: nitrogenTarget_g_day,
                required: hasDirectNitrogen ? nitrogenTarget_g_day * 6.25 : recommendedProtein_g_day,
                recommended: recommendedProtein_g_day,
                error: errorMsg
            };
        }

        const nitrogenPerMl = aminoacidSolution.nitrogen_concentration / 1000;
        const rawVolume = nitrogenPerMl > 0 ? nitrogenTarget_g_day / nitrogenPerMl : 0;
        const roundedVolume = roundVolume(rawVolume);
        const nitrogenDelivered = nitrogenPerMl * roundedVolume;

        let proteinDelivered = 0;
        if (typeof aminoacidSolution.protein_concentration === 'number') {
            proteinDelivered = (aminoacidSolution.protein_concentration / 1000) * roundedVolume;
        } else {
            proteinDelivered = nitrogenDelivered * 6.25;
        }

        return {
            required: proteinDelivered,
            recommended: recommendedProtein_g_day,
            solution: aminoacidSolutionName || '',
            volume: roundedVolume,
            nitrogen: nitrogenDelivered,
            nitrogenTarget: nitrogenTarget_g_day,
            perKgTarget: proteinNeedsPerKg,
            source: hasDirectNitrogen ? 'direct' : 'perKg',
            error: null
        };
    }

    calculateGlutamine(patient, proteinData) { 
        const defaults = { required_g_dipeptide: 0, solution: 'DIPEPTIVEN 200mg/ml', volume: 0, nitrogen: 0, error: null };
        if (!patient || patient.condition !== 'critical' || !proteinData?.nitrogen || proteinData.nitrogen <= 0) {
            return defaults; 
        }

        const glutamineSolutionName = 'DIPEPTIVEN 200mg/ml'; 
        const glutamineSolution = this.solutions[glutamineSolutionName];
        if (!glutamineSolution || typeof glutamineSolution.nitrogen_concentration !== 'number' || typeof glutamineSolution.glutamine_concentration !== 'number') {
             const errorMsg = `Solução de glutamina '${glutamineSolutionName}' não encontrada ou com dados de concentração em falta.`;
             console.error(errorMsg);
             return { ...defaults, error: errorMsg };
        }

        const targetGlutamineNitrogenContribution = proteinData.nitrogen * 0.20; 

        // nitrogen_concentration is in g/L in this.solutions
        const glutamine_N_g_ml = glutamineSolution.nitrogen_concentration / 1000; 
        const glutamineVolume = glutamine_N_g_ml > 0 ? targetGlutamineNitrogenContribution / glutamine_N_g_ml : 0;
        const roundedGlutamineVolume = roundVolume(glutamineVolume);

        // glutamine_concentration is in mg/mL in this.solutions
        const glutamineProvided_g = (glutamineSolution.glutamine_concentration / 1000) * roundedGlutamineVolume;

        return {
            required_g_dipeptide: glutamineProvided_g,
            solution: glutamineSolutionName,
            volume: roundedGlutamineVolume,
            nitrogen: targetGlutamineNitrogenContribution,
            error: null
        };
    }

    calculateGlucose(patient, infusionHours = 24) {
        const defaults = { required: 0, solution: '', volume: 0, error: null };
        if (!patient?.weight) return { ...defaults, error: "Peso do doente não disponível." };

        const weight = patient.weight;
        const glucoseRate_mg_kg_min = this.getNumericInput('glucose-rate', 0, true);
        if (isNaN(glucoseRate_mg_kg_min)) return { ...defaults, error: "Taxa de infusão de glucose inválida." };

        const infusionMinutes = Math.max(1, parseNum(infusionHours, 24) * 60);
        const recommendedGlucose = (glucoseRate_mg_kg_min * weight * infusionMinutes) / 1000;

        const glucoseAdmin = this.getNumericInput('glucose-admin', 0, false);
        const hasDirectGlucose = !isNaN(glucoseAdmin) && glucoseAdmin > 0;
        const glucoseRequired_g_day = hasDirectGlucose ? glucoseAdmin : recommendedGlucose;

        const glucoseSolutionName = document.getElementById('glucose-solution')?.value;
        const glucoseSolution = glucoseSolutionName ? this.solutions[glucoseSolutionName] : null;

        if (!glucoseSolution || typeof glucoseSolution.glucose_concentration !== 'number') {
            const errorMsg = `Solução de glucose '${glucoseSolutionName || 'Nenhuma'}' inválida ou sem concentração definida.`;
            return {
                ...defaults,
                required: glucoseRequired_g_day,
                recommended: recommendedGlucose,
                solution: glucoseSolutionName || '',
                error: errorMsg
            };
        }

        const concentration_g_ml = glucoseSolution.glucose_concentration / 1000;
        const glucoseVolume = concentration_g_ml > 0 ? glucoseRequired_g_day / concentration_g_ml : 0;
        const roundedGlucoseVolume = roundVolume(glucoseVolume);

        return {
            required: glucoseRequired_g_day,
            recommended: recommendedGlucose,
            solution: glucoseSolutionName || '',
            volume: roundedGlucoseVolume,
            source: hasDirectGlucose ? 'direct' : 'rate',
            rate_mg_kg_min: glucoseRate_mg_kg_min,
            error: null
        };
    }

    calculateLipids(patient) {
        const defaults = { required: 0, solution: '', volume: 0, error: null };
        if (!patient?.weight) return { ...defaults, error: "Peso do doente não disponível." };

        const weight = patient.weight;
        const lipidNeedsPerKg = this.getNumericInput('lipid-needs', 0, true);
        if (isNaN(lipidNeedsPerKg)) return { ...defaults, error: "Necessidades lipídicas inválidas." };

        const recommendedLipids = lipidNeedsPerKg * weight;
        const lipidAdmin = this.getNumericInput('lipid-admin', 0, false);
        const hasDirectLipids = !isNaN(lipidAdmin) && lipidAdmin > 0;
        const lipidRequired_g = hasDirectLipids ? lipidAdmin : recommendedLipids;

        const lipidSolutionName = document.getElementById('lipids-solution')?.value;
        const lipidSolution = lipidSolutionName ? this.solutions[lipidSolutionName] : null;

        if (!lipidSolution || typeof lipidSolution.lipid_concentration !== 'number') {
            const errorMsg = `Solução lipídica '${lipidSolutionName || 'Nenhuma'}' inválida ou sem concentração definida.`;
            return {
                ...defaults,
                required: lipidRequired_g,
                recommended: recommendedLipids,
                solution: lipidSolutionName || '',
                error: errorMsg
            };
        }

        const concentration_g_ml = lipidSolution.lipid_concentration / 1000;
        const lipidVolume = concentration_g_ml > 0 ? lipidRequired_g / concentration_g_ml : 0;
        const roundedLipidVolume = roundVolume(lipidVolume);

        return {
            required: lipidRequired_g,
            recommended: recommendedLipids,
            solution: lipidSolutionName || '',
            volume: roundedLipidVolume,
            perKgTarget: lipidNeedsPerKg,
            source: hasDirectLipids ? 'direct' : 'perKg',
            error: null
        };
    }

    calculateElectrolytes(patient) {
        const electrolytes = {};
        const patientWeight = patient?.weight ?? 0;
        if (patientWeight <= 0) {
            console.warn("calculateElectrolytes: Patient weight is zero or invalid. Electrolyte calculation may be incorrect.");
        }

        const electrolyteConfig = [
            { key: 'sodium', needsId: 'sodium-needs', solutionId: 'nacl-solution', unit: 'mEq/kg', concentrationKey: 'sodium_concentration' },
            { key: 'potassium', needsId: 'potassium-needs', solutionId: 'kcl-solution', unit: 'mEq/kg', concentrationKey: 'potassium_concentration' },
            { key: 'magnesium', needsId: 'magnesium-needs', solutionId: 'mgso4-solution', unit: 'mEq/kg', concentrationKey: 'magnesium_concentration' },
            { key: 'calcium', needsId: 'calcium-needs', solutionId: 'cacl2-solution', unit: 'mEq/kg', concentrationKey: 'calcium_concentration' },
            { key: 'phosphorus', needsId: 'phosphorus-needs', solutionId: 'phosphorus-solution', unit: 'mmol/day', concentrationKey: 'phosphorus_concentration' }
        ];

        electrolyteConfig.forEach(config => {
            const needsValue = this.getNumericInput(config.needsId, 0);
            if (isNaN(needsValue)) {
                electrolytes[config.key] = { required: 0, solution: '', volume: 0, error: `Valor de necessidade para ${config.key} inválido.` };
                return;
            }

            let requiredAmount = (config.unit.includes('/kg') && patientWeight > 0) ? needsValue * patientWeight : needsValue;
            const solutionName = document.getElementById(config.solutionId)?.value;
            const solution = solutionName ? this.solutions[solutionName] : null;
            let volume = 0;
            let error = null;

            if (requiredAmount > 0) {
                if (solution && typeof solution[config.concentrationKey] === 'number') {
                    // Concentrations in this.solutions are per Liter (e.g., mEq/L, mmol/L)
                    const stockConcentrationUnidadesPerLiter = solution[config.concentrationKey]; 
                    
                    if (stockConcentrationUnidadesPerLiter === 0) {
                        error = `Concentração de stock para ${config.key} em '${solutionName}' é zero. Volume não pode ser calculado.`;
                    } else {
                        const concentrationUnidadesPerML = stockConcentrationUnidadesPerLiter / 1000;
                        if (concentrationUnidadesPerML > 0) {
                            volume = requiredAmount / concentrationUnidadesPerML;
                        } else {
                            error = `Concentração por mL calculada de ${config.key} em '${solutionName}' é zero ou negativa, impossível calcular volume.`;
                        }
                    }
                } else if (solution) {
                     error = `Concentração de ${config.key} ('${config.concentrationKey}') em '${solutionName}' não definida como número ou inválida.`;
                } else {
                    error = `Solução para ${config.key} ('${solutionName || 'Nenhuma'}') não encontrada ou não selecionada, mas ${requiredAmount.toFixed(2)} unidades são necessárias.`;
                }
            }

            const safeVolume = (isNaN(volume) || !isFinite(volume)) ? 0 : roundVolume(volume);
            electrolytes[config.key] = {
                required: requiredAmount,
                solution: solutionName || '',
                volume: safeVolume,
                error: error
            };
        });

        const phos = electrolytes['phosphorus'];
        if (phos && phos.volume > 0 && phos.solution === 'GLICEROFOSFATO SÓDIO') {
            const phosSol = this.solutions['GLICEROFOSFATO SÓDIO'];
            const extraNa = phos.volume * (phosSol.sodium_concentration / 1000);
            electrolytes['sodium'] = electrolytes['sodium'] || { required: 0, solution: document.getElementById('nacl-solution')?.value || '', volume: 0, error: null };
            electrolytes['sodium'].fromPhosphorus = (electrolytes['sodium'].fromPhosphorus || 0) + extraNa;
            electrolytes['sodium'].required = Math.max(0, (electrolytes['sodium'].required || 0) - extraNa);
        }
        if (electrolytes['sodium']) {
            electrolytes['sodium'].displayRequired = (electrolytes['sodium'].required || 0) + (electrolytes['sodium'].fromPhosphorus || 0);
        }

        return electrolytes;
    }

    calculateAdditives(patient, formulationData, totalVolumePrescribed) {
        const additives = {};
        const patientWeight = patient?.weight ?? 0;
        const glucoseRequired_g = formulationData?.glucose?.required ?? 0;

        if (isNaN(totalVolumePrescribed) || totalVolumePrescribed <= 0) {
            console.warn("calculateAdditives: totalVolumePrescribed is invalid. Some additive calculations might be affected.");
        }

        const additiveConfig = [
             { key: 'oligoelements', inputId: 'oligoelements-volume', unit: 'ml_fixed', solutionKey: 'oligoelements' }, 
             { key: 'water_soluble_vitamins', inputId: 'water-soluble-vitamins-volume', unit: 'ml_fixed', solutionKey: 'water_soluble_vitamins' }, 
             { key: 'fat_soluble_vitamins', inputId: 'fat-soluble-vitamins-volume', unit: 'ml_fixed', solutionKey: 'fat_soluble_vitamins' }, 
             { key: 'insulin', inputId: 'insulin-rate', unit: 'UI/g_glucose', concentrationKey: 'insulin_concentration', solutionKey: 'insulin' }, // insulin_concentration is UI/ml
             { key: 'heparin', inputId: 'heparin-rate', unit: 'UI/ml_total', concentrationKey: 'heparin_concentration', solutionKey: 'heparin' }, // heparin_concentration is UI/ml
             { key: 'carnitine', inputId: 'carnitine-needs', unit: 'mg/kg', concentrationKey: 'carnitine_concentration', solutionKey: 'carnitine' } // carnitine_concentration is mg/ml
        ];

        additiveConfig.forEach(config => {
            const inputValue = this.getNumericInput(config.inputId, 0); 
            if (isNaN(inputValue)) {
                additives[config.key] = { required: 0, solution: '', volume: 0, error: `Valor de entrada para ${config.key} inválido.` };
                return;
            }

            let requiredAmount = 0;
            let volume = 0;
            let error = null;

            switch(config.unit) {
                case 'ml_fixed':
                    requiredAmount = inputValue; 
                    volume = inputValue;
                    break;
                case 'UI/g_glucose':
                    requiredAmount = (glucoseRequired_g > 0) ? inputValue * glucoseRequired_g : 0;
                    break;
                case 'UI/ml_total':
                    requiredAmount = (totalVolumePrescribed > 0) ? inputValue * totalVolumePrescribed : 0;
                    break;
                case 'mg/kg':
                    requiredAmount = (patientWeight > 0) ? inputValue * patientWeight : 0;
                    break;
                default: 
                    requiredAmount = inputValue;
            }

            const solutionName = this.getDefaultAdditiveSolution(config.solutionKey, patient);
            const solution = solutionName ? this.solutions[solutionName] : null;

            if (requiredAmount > 0) {
                if (config.unit !== 'ml_fixed') { 
                    if (solution && typeof solution[config.concentrationKey] === 'number') {
                        const concentration = solution[config.concentrationKey]; 
                        if (concentration > 0) {
                            volume = requiredAmount / concentration;
                        } else {
                            error = `Concentração para ${config.key} em '${solutionName}' é zero ou inválida.`;
                            console.error(error);
                        }
                    } else if (solution) {
                        error = `Concentração para ${config.key} em '${solutionName}' não definida ou inválida.`;
                        console.error(error);
                    } else {
                        error = `Solução padrão para ${config.key} ('${solutionName || 'Nenhuma'}') não encontrada.`;
                    }
                }
            }

            const safeVolume = (isNaN(volume) || !isFinite(volume)) ? 0 : roundVolume(volume);
            additives[config.key] = {
                required: requiredAmount,
                solution: solutionName || '',
                volume: safeVolume,
                error: error
            };
        });
        return additives;
    }

    calculateEnergySummary(formulation) {
        const weight = Number(formulation.patient?.weight) || 0;
        const proteins_g = formulation.proteins?.required ?? 0;
        const glucose_g = formulation.glucose?.required ?? 0;
        const lipids_g = formulation.lipids?.required ?? 0;
        const infusionHours = Number(formulation.infusionHours) || 24;
        const infusionMinutes = Math.max(1, infusionHours * 60);

        const energyProteins = proteins_g * 4;
        const energyGlucose = glucose_g * 3.4;
        const energyLipids = lipids_g * 9;
        const totalEnergy = energyProteins + energyGlucose + energyLipids;

        const proteinPerKg = weight > 0 ? proteins_g / weight : 0;
        const glucosePerKg = weight > 0 ? glucose_g / weight : 0;
        const lipidsPerKg = weight > 0 ? lipids_g / weight : 0;
        const totalEnergyPerKg = weight > 0 ? totalEnergy / weight : 0;
        const GIR = weight > 0 ? (glucose_g * 1000) / (weight * infusionMinutes) : 0;
        const glucosePercent = formulation.volume > 0 ? (glucose_g / (formulation.volume / 100)) : 0;

        return {
            proteins: energyProteins,
            glucose: energyGlucose,
            lipids: energyLipids,
            total: totalEnergy,
            perKg: totalEnergyPerKg,
            proteinPerKg,
            glucosePerKg,
            lipidsPerKg,
            GIR,
            glucosePercent
        };
    }

    verifyComponentTotals(formulation, tolerance = 1) {
        const collectVolume = (value) => roundVolume(value ?? 0, 1);
        let total = collectVolume(formulation.proteins?.volume) +
                    collectVolume(formulation.glutamine?.volume) +
                    collectVolume(formulation.glucose?.volume) +
                    collectVolume(formulation.lipids?.volume) +
                    collectVolume(formulation.water?.volume);
        Object.values(formulation.electrolytes || {}).forEach(el => total += collectVolume(el?.volume));
        Object.values(formulation.additives || {}).forEach(ad => total += collectVolume(ad?.volume));
        const diff = Math.abs(total - collectVolume(formulation.volume));
        if (diff > tolerance) {
            formulation.warnings.push(`Soma dos volumes (${total.toFixed(1)} mL) difere do volume total (${(formulation.volume || 0).toFixed(1)} mL) em ${diff.toFixed(1)} mL.`);
        }
        return diff;
    }
    getDefaultAdditiveSolution(additiveTypeKey, patient) { 
        const weight = patient?.weight ?? 0;
        switch (additiveTypeKey) {
            case 'oligoelements':
                if (weight > 0 && weight <= 15 && this.solutions['PEDITRACE']) return 'PEDITRACE';
                if (weight > 0 && weight <= 40 && this.solutions['TRACUTIL']) return 'TRACUTIL'; 
                if (this.solutions['ADDAVEN']) return 'ADDAVEN';
                return ''; 
            case 'fat_soluble_vitamins':
                if (weight > 0 && weight <= 10 && this.solutions['VITALIPID INFANTIL']) return 'VITALIPID INFANTIL'; 
                if (this.solutions['VITALIPID ADULTO']) return 'VITALIPID ADULTO';
                return '';
            case 'water_soluble_vitamins':
                if (this.solutions['SOLUVIT N']) return 'SOLUVIT N';
                return '';
            case 'insulin':
                if (this.solutions['INSULINA ACTRAPID 100UI/ml']) return 'INSULINA ACTRAPID 100UI/ml';
                return '';
            case 'heparin':
                if (this.solutions['HEPARINA (5000UI/ml)']) return 'HEPARINA (5000UI/ml)';
                return '';
            case 'carnitine':
                if (this.solutions['CARNITINA (1g/5ml)']) return 'CARNITINA (1g/5ml)';
                return '';
            default:
                return '';
        }
    }
    checkCompatibility(formulation, errors, warnings) { 
        if (errors.some(e => e.toLowerCase().includes("precipitação"))) {
            return "Alto Risco de Precipitação Ca/P - Evitar misturar Gluconato de Cálcio com Fosfato.";
        }
        if (warnings.some(w => w.toLowerCase().includes("precipitação"))) {
            return "Possível incompatibilidade entre Gluconato de Cálcio e Fosfato. Monitorizar.";
        }
        return "Verificar visualmente a mistura final. Consultar literatura para interações não cobertas.";
    }
    calculateOsmolarity(formulation) {
        let totalOsmols = 0;
        let estimatedFallbackUsed = false;
        const totalVolumeL = (formulation.volume ?? 0) / 1000;

        if (totalVolumeL <= 0) return 0;

        const calculateComponentOsmols = (component) => {
            if (!component) return 0;
            const volumeML = component.volume ?? 0;
            const solutionName = component.solution;
            const solution = solutionName ? this.solutions[solutionName] : null;

            if (volumeML > 0 && solution && typeof solution.osmolarityContribution === 'number') {
                return (volumeML / 1000) * solution.osmolarityContribution;
            }

            // Conservative fallback using concentration when explicit osmolarity is missing
            if (volumeML > 0 && solution && solution.type === 'electrolyte') {
                const sodium = solution.sodium_concentration || 0;
                const potassium = solution.potassium_concentration || 0;
                const calcium = solution.calcium_concentration || 0;
                const magnesium = solution.magnesium_concentration || 0;
                const phosphate = solution.phosphorus_concentration || 0;
                const mEqTotal = sodium + potassium + calcium + magnesium + (phosphate * 2); // phosphate as divalent approx
                if (mEqTotal > 0) {
                    estimatedFallbackUsed = true;
                    const perL = mEqTotal * 2; // ~2 mOsm por mEq de sal forte
                    return (volumeML / 1000) * perL;
                }
            }
            return 0;
        };

        totalOsmols += calculateComponentOsmols(formulation.proteins);
        totalOsmols += calculateComponentOsmols(formulation.glutamine);
        totalOsmols += calculateComponentOsmols(formulation.glucose);
        totalOsmols += calculateComponentOsmols(formulation.lipids);
        totalOsmols += calculateComponentOsmols(formulation.water);

        Object.values(formulation.electrolytes ?? {}).forEach(el_comp => totalOsmols += calculateComponentOsmols(el_comp));
        Object.values(formulation.additives ?? {}).forEach(ad_comp => totalOsmols += calculateComponentOsmols(ad_comp));

        const finalOsmolarity = totalOsmols / totalVolumeL;
        if (estimatedFallbackUsed) {
            formulation.warnings = formulation.warnings || [];
            formulation.warnings.push('Osmolaridade estimada para alguns eletrólitos sem dado de rótulo — validar ficha técnica.');
        }
        return isNaN(finalOsmolarity) || !isFinite(finalOsmolarity) ? 0 : finalOsmolarity;
    }
    validateFormulationAdvanced(formulation, errors = [], warnings = []) { 
        const patient = formulation.patient;
        const totalVolumePrescription = formulation.volume || 0;

        if (!patient || totalVolumePrescription <= 0) {
             errors.push("Dados do doente ou volume total da prescrição são inválidos para validação avançada.");
             return; 
        }
        const weight = patient.weight;
        if (weight <= 0) {
            errors.push("Peso do doente inválido para validação avançada de doses.");
            return;
        }

        const protein_g_kg = (formulation.proteins?.required ?? 0) / weight;
        if (protein_g_kg > 4.0) warnings.push(`Dose de Proteínas (${protein_g_kg.toFixed(1)} g/kg) muito elevada. Verificar indicação.`);
        else if (protein_g_kg > 2.5) warnings.push(`Dose de Proteínas (${protein_g_kg.toFixed(1)} g/kg) elevada. Considerar ajuste.`);

        const glucose_g_day = formulation.glucose?.required ?? 0;
        const infusionMinutes = Math.max(1, parseNum(formulation.infusionHours, 24) * 60);
        const GIR_mg_kg_min = (glucose_g_day * 1000) / (weight * infusionMinutes);
        if (GIR_mg_kg_min > 14 && patient.condition !== 'pediatric' && patient.condition !== 'critical') warnings.push(`Taxa de Infusão de Glucose (GIR: ${GIR_mg_kg_min.toFixed(1)} mg/kg/min) muito elevada para adulto não crítico. Risco de hiperglicemia.`);
        else if (GIR_mg_kg_min > 7 && patient.condition !== 'pediatric' && patient.condition !== 'critical') warnings.push(`Taxa de Infusão de Glucose (GIR: ${GIR_mg_kg_min.toFixed(1)} mg/kg/min) elevada. Monitorizar glicemia.`);

        const lipid_g_kg = (formulation.lipids?.required ?? 0) / weight;
        if (lipid_g_kg > 4.0) warnings.push(`Dose de Lípidos (${lipid_g_kg.toFixed(1)} g/kg) muito elevada. Risco de hipertrigliceridemia.`);
        else if (lipid_g_kg > 2.5) warnings.push(`Dose de Lípidos (${lipid_g_kg.toFixed(1)} g/kg) elevada. Monitorizar triglicerídeos.`);


        const ca = formulation.electrolytes?.calcium;
        const phos = formulation.electrolytes?.phosphorus;
        const caSol = ca?.solution ? this.solutions[ca.solution] : null;
        const phosSol = phos?.solution ? this.solutions[phos.solution] : null;

        let caConcFinal_mEq_L = 0;
        if (ca?.volume > 0 && caSol?.calcium_concentration && totalVolumePrescription > 0) {
            caConcFinal_mEq_L = (ca.volume * (caSol.calcium_concentration / 1000)) / (totalVolumePrescription / 1000);
        }

        let phosConcFinal_mmol_L = 0;
        if (phos?.volume > 0 && phosSol?.phosphorus_concentration && totalVolumePrescription > 0) {
            phosConcFinal_mmol_L = (phos.volume * (phosSol.phosphorus_concentration / 1000)) / (totalVolumePrescription / 1000);
        }

        const caPhosSum = caConcFinal_mEq_L + phosConcFinal_mmol_L; 
        if (caConcFinal_mEq_L > 0 && phosConcFinal_mmol_L > 0) { 
            if (caPhosSum > 45) errors.push(`Risco Elevado de Precipitação Ca/P: Soma [Ca(mEq/L)+P(mmol/L)] = ${caPhosSum.toFixed(1)} > 45. Consultar curvas de compatibilidade.`);
            else if (caPhosSum > 30) warnings.push(`Atenção Risco Precipitação Ca/P: Soma [Ca(mEq/L)+P(mmol/L)] = ${caPhosSum.toFixed(1)} > 30. Considerar ordem de adição e tipo de AA.`);
        }

        const osmLimits = this.settings.osmolarityLimits || { peripheral: 900, central: 1500 };
        const route = formulation.route || 'central'; 
        const osmLimit = route === 'peripheral' ? osmLimits.peripheral : osmLimits.central;

        if (formulation.osmolarity > osmLimit) {
            errors.push(`ERRO Osmolaridade: ${formulation.osmolarity.toFixed(0)} mOsm/L excede o limite de ${osmLimit} mOsm/L para via ${route}. Risco de flebite/trombose.`);
        } else if (formulation.osmolarity > osmLimit * 0.90 && route === 'peripheral') { 
            warnings.push(`Aviso Osmolaridade: ${formulation.osmolarity.toFixed(0)} mOsm/L está próxima do limite (${osmLimit} mOsm/L) para via periférica.`);
        }

        this.applyClinicalGuidelines(patient, formulation, warnings, errors); 
    }
    applyClinicalGuidelines(patient, formulation, warnings, errors) { 
        if (!patient?.condition || !patient.weight || patient.weight <= 0) return;

        const weight = patient.weight;
        const proteinPerKg = (formulation.proteins?.required ?? 0) / weight;
        const glucose_g_day = formulation.glucose?.required ?? 0;
        const GIR_mg_kg_min = (glucose_g_day * 1000) / (weight * Math.max(1, parseNum(formulation.infusionHours, 24) * 60));

        if (patient.condition === 'renal') {
            if (proteinPerKg > 1.2) warnings.push(`Diretriz Renal: Dose de proteínas (${proteinPerKg.toFixed(1)} g/kg) pode necessitar de ajuste em insuficiência renal não dialítica.`);
            if (((formulation.electrolytes?.potassium?.required ?? 0) / weight) > 1.5) warnings.push(`Diretriz Renal: Potássio (${((formulation.electrolytes?.potassium?.required ?? 0) / weight).toFixed(1)} mEq/kg) pode estar elevado. Verificar função renal e K+ sérico.`);
            if ((formulation.electrolytes?.phosphorus?.required ?? 0) > 30) warnings.push(`Diretriz Renal: Fósforo (${(formulation.electrolytes?.phosphorus?.required ?? 0).toFixed(0)} mmol/dia) pode estar elevado. Verificar P sérico.`);
        }
        if (patient.condition === 'pediatric') {
            if (GIR_mg_kg_min > 12) warnings.push(`Diretriz Pediátrica: Taxa de glucose (GIR: ${GIR_mg_kg_min.toFixed(1)} mg/kg/min) pode estar elevada para algumas faixas etárias pediátricas. Ajustar conforme idade e tolerância.`);
        }
        if (patient.condition === 'hepatic' && proteinPerKg > 1.5) {
            warnings.push(`Diretriz Hepática: Dose de proteínas (${proteinPerKg.toFixed(1)} g/kg) pode necessitar de ajuste em encefalopatia hepática. Considerar AAR.`);
        }
        if (patient.condition === 'critical' && GIR_mg_kg_min < 2) {
            warnings.push(`Diretriz Crítico: Baixa GIR (${GIR_mg_kg_min.toFixed(1)} mg/kg/min) pode ser insuficiente em doente crítico. Avaliar stress metabólico.`);
        }
    }
    calculateFormulation() { 
        console.log("NutriSoft.calculateFormulation: Starting formulation calculation...");
        if (!this.validateInputs('prescription')) {
            console.log("NutriSoft.calculateFormulation: Prescription input validation failed.");
            document.getElementById('formulation-results')?.classList.add('hidden');
            document.getElementById('save-prescription-btn').disabled = true;
            document.getElementById('print-prescription-btn').disabled = true;
            return null;
        }

        const patient = this.getSelectedPatient();
        if (!patient) { 
            console.log("NutriSoft.calculateFormulation: No valid patient selected.");
            document.getElementById('formulation-results')?.classList.add('hidden');
            return null;
        }

        const totalVolumeInput = document.getElementById('total-volume');
        const totalVolume = this.getNumericInput('total-volume', 0, true);
        const infusionHoursInput = document.getElementById('infusion-hours');
        const infusionHours = this.getNumericInput('infusion-hours', 24, true);
        const administrationRoute = document.getElementById('administration-route')?.value || 'central';

        if (isNaN(totalVolume) || totalVolume <= 0) {
             this.dataManager.displayNotification("Volume total da prescrição é inválido ou não foi fornecido.", "error");
             if (totalVolumeInput) this.showErrorMessage(totalVolumeInput, "Volume total deve ser um número maior que 0.");
             document.getElementById('formulation-results')?.classList.add('hidden');
             return null;
        } else {
            if (totalVolumeInput) this.hideErrorMessage(totalVolumeInput);
        }

        if (isNaN(infusionHours) || infusionHours <= 0) {
            this.dataManager.displayNotification("Horas de perfusão inválidas ou não fornecidas.", "error");
            if (infusionHoursInput) this.showErrorMessage(infusionHoursInput, "Horas de perfusão devem ser maiores que 0.");
            document.getElementById('formulation-results')?.classList.add('hidden');
            return null;
        } else if (infusionHoursInput) {
            this.hideErrorMessage(infusionHoursInput);
        }

        try {
            const protocolId = document.getElementById('prescription-protocol')?.value || '';
            const formulation = {
                patient: patient,
                protocolId: protocolId,
                volume: totalVolume, // Prescribed total volume
                infusionHours: infusionHours,
                route: administrationRoute,
                proteins: this.calculateProteins(patient),
                glucose: this.calculateGlucose(patient, infusionHours),
                lipids: this.calculateLipids(patient),
                electrolytes: this.calculateElectrolytes(patient),
                water: { required: 0, solution: 'ÁGUA DESTILADA', volume: 0, error: null }, 
                osmolarity: 0,
                compatibility: '',
                warnings: [], 
                errors: []    
            };

            formulation.glutamine = this.calculateGlutamine(patient, formulation.proteins);
            formulation.additives = this.calculateAdditives(patient, formulation, totalVolume);

            let calculatedVolumeSum = (formulation.proteins?.volume || 0) +
                                      (formulation.glutamine?.volume || 0) +
                                      (formulation.glucose?.volume || 0) +
                                      (formulation.lipids?.volume || 0);

            Object.values(formulation.electrolytes || {}).forEach(el => calculatedVolumeSum += (el?.volume || 0));
            Object.values(formulation.additives || {}).forEach(ad => calculatedVolumeSum += (ad?.volume || 0));
            calculatedVolumeSum = isNaN(calculatedVolumeSum) ? 0 : Math.round(calculatedVolumeSum * 10) / 10;
            
            // formulation.volume here is the prescribed totalVolume
            const waterVolumeNeeded = formulation.volume - calculatedVolumeSum;
            const roundedWaterVolume = roundVolume(Math.max(0, waterVolumeNeeded));
            formulation.water = {
                required: waterVolumeNeeded,
                solution: 'ÁGUA DESTILADA',
                volume: roundedWaterVolume,
                error: null
            };

            if (waterVolumeNeeded < 0) {
                // Using the error message specified in the prompt
                formulation.errors.push(`Volume total excedido! Componentes: ${calculatedVolumeSum.toFixed(1)}mL (Limite: ${formulation.volume}mL).`);
                // Water volume is already set to Math.max(0, waterVolumeNeeded), so it will be 0 if negative.
            }

            this.verifyComponentTotals(formulation);

            [formulation.proteins, formulation.glutamine, formulation.glucose, formulation.lipids, ...Object.values(formulation.electrolytes ?? {}), ...Object.values(formulation.additives ?? {})].forEach(comp => {
                if (comp?.error) formulation.errors.push(comp.error);
            });


            formulation.energy = this.calculateEnergySummary(formulation);
            formulation.osmolarity = this.calculateOsmolarity(formulation);
            this.validateFormulationAdvanced(formulation, formulation.errors, formulation.warnings);
            formulation.compatibility = this.checkCompatibility(formulation, formulation.errors, formulation.warnings);

            this.displayResults(formulation);

            const saveBtn = document.getElementById('save-prescription-btn');
            const printBtn = document.getElementById('print-prescription-btn');
            const hasCriticalErrors = formulation.errors && formulation.errors.length > 0;

            if (saveBtn) saveBtn.disabled = hasCriticalErrors;
            if (printBtn) printBtn.disabled = hasCriticalErrors;

            AuditLogger.log('calculateFormulationSuccess', { patientId: patient.id, prepVolume: totalVolume, errors: formulation.errors.length, warnings: formulation.warnings.length });
            console.log("NutriSoft.calculateFormulation: Formulation calculated:", JSON.parse(JSON.stringify(formulation))); 
            return formulation;

        } catch (error) {
            console.error("NutriSoft.calculateFormulation: Fatal error during calculation:", error);
            this.dataManager.displayNotification('Erro inesperado e fatal durante o cálculo da formulação. Verifique o console.', 'error');
            AuditLogger.log('calculateFormulationFatalError', { patientId: patient?.id, error: error.message, stack: error.stack });
            document.getElementById('formulation-results')?.classList.add('hidden');
            return null;
        }
    }
    displayResults(formulation) { 
        const compDetails = document.getElementById('composition-details');
        const compatResults = document.getElementById('compatibility-results');
        const formWarnings = document.getElementById('formulation-warnings');
        const formErrors = document.getElementById('formulation-errors');
        const resultsSection = document.getElementById('formulation-results');

        if (compDetails && compatResults && formWarnings && formErrors && resultsSection) {
            try {
                compDetails.innerHTML = this.formatCompositionDetails(formulation);
                compatResults.innerHTML = `<p><strong>Compatibilidade e Estabilidade (Aviso):</strong> ${formulation.compatibility || 'N/A - Consultar literatura e protocolo local.'}</p>`;
                formWarnings.innerHTML = this.formatFormulationWarnings(formulation.warnings);
                formErrors.innerHTML = this.formatFormulationErrors(formulation.errors);

                formWarnings.classList.toggle('hidden', !formulation.warnings || formulation.warnings.length === 0);
                formErrors.classList.toggle('hidden', !formulation.errors || formulation.errors.length === 0);

                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (error) {
                console.error("Error displaying results:", error);
                compDetails.innerHTML = '<p class="text-red-600">Erro ao formatar resultados. Verifique o console.</p>';
                resultsSection.classList.remove('hidden'); 
            }
        } else {
            console.error('displayResults: One or more results display elements not found in DOM.');
        }
    }
    formatValue(value, unit = '', decimalPlaces = 2) { 
        if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return `--- ${unit}`; 
        return `${Number(value).toFixed(decimalPlaces)} ${unit}`;
    }
    formatCompositionDetails(formulation) {
        const patient = formulation.patient || {};
        const weight = Number(patient.weight) || 0;
        const energy = formulation.energy || {};
        const proteins = formulation.proteins || {};
        const glucose = formulation.glucose || {};
        const lipids = formulation.lipids || {};
        const sodium = formulation.electrolytes?.sodium;

        const macroRows = [
            {
                label: 'Aminoácidos',
                total: this.formatValue(proteins.required, 'g', 1),
                perKg: weight > 0 ? `${(proteins.required / weight).toFixed(2)} g/kg` : '---',
                energy: this.formatValue(energy.proteins, 'kcal', 0),
                notes: `N: ${this.formatValue(proteins.nitrogen, 'g', 2)}${proteins.source === 'direct' ? ' · Prescrito' : ''}`
            },
            {
                label: 'Glucose',
                total: this.formatValue(glucose.required, 'g', 1),
                perKg: weight > 0 ? `${(glucose.required / weight).toFixed(2)} g/kg` : '---',
                energy: this.formatValue(energy.glucose, 'kcal', 0),
                notes: `GIR: ${energy.GIR ? energy.GIR.toFixed(2) : '---'} mg/kg/min`
            },
            {
                label: 'Lípidos',
                total: this.formatValue(lipids.required, 'g', 1),
                perKg: weight > 0 ? `${(lipids.required / weight).toFixed(2)} g/kg` : '---',
                energy: this.formatValue(energy.lipids, 'kcal', 0),
                notes: lipids.source === 'direct' ? 'Prescrito' : ''
            },
            {
                label: 'Energia Total',
                total: this.formatValue(energy.total, 'kcal', 0),
                perKg: weight > 0 ? `${energy.perKg.toFixed(1)} kcal/kg` : '---',
                energy: '',
                notes: `Glicose %: ${energy.glucosePercent ? energy.glucosePercent.toFixed(1) : '---'}%`
            }
        ];

        const componentRows = [];
        const pushComponent = (label, component, options = {}) => {
            if (!component) return;
            const doseKey = options.doseKey || 'required';
            const volumeKey = options.volumeKey || 'volume';
            const dose = component[doseKey];
            const volume = component[volumeKey];
            const hasDose = Number.isFinite(dose) && dose !== 0;
            const hasVolume = Number.isFinite(volume) && volume !== 0;
            if (!hasDose && !hasVolume && !component.error) return;
            const doseUnit = options.doseUnit || '';
            const volumeUnit = options.volumeUnit || 'ml';
            const doseDp = options.doseDp ?? (doseUnit === 'mg' ? 0 : 2);
            const volumeDp = options.volumeDp ?? 1;
            const notes = [];
            if (component.recommended !== undefined && component.recommended !== null && doseKey !== 'volume') {
                if (Number.isFinite(component.recommended) && component.recommended > 0 && component.recommended !== dose) {
                    notes.push(`Alvo ${this.formatValue(component.recommended, doseUnit, doseDp)}`);
                }
            }
            if (component.source) {
                notes.push(component.source === 'direct' ? 'Dose prescrita' : 'Calculado a partir de metas');
            }
            if (component.fromPhosphorus && label.startsWith('Sódio')) {
                notes.push(`${this.formatValue(component.fromPhosphorus, 'mEq', 2)} do Fosfato`);
            }
            if (component.error) {
                notes.push(`⚠ ${component.error}`);
            }
            if (options.extraNote) notes.push(options.extraNote);

            componentRows.push({
                label,
                dose: this.formatValue(dose, doseUnit, doseDp),
                solution: component.solution || '',
                volume: this.formatValue(volume, volumeUnit, volumeDp),
                notes: notes.filter(Boolean).join(' · ')
            });
        };

        pushComponent('Aminoácidos', proteins, { doseUnit: 'g', doseDp: 1 });
        if (formulation.glutamine?.volume > 0) {
            pushComponent('Glutamina (Dipeptídeo)', formulation.glutamine, { doseKey: 'required_g_dipeptide', doseUnit: 'g', doseDp: 2 });
        }
        pushComponent('Glucose', glucose, { doseUnit: 'g', doseDp: 1 });
        pushComponent('Lípidos', lipids, { doseUnit: 'g', doseDp: 1 });
        pushComponent('Sódio (Total)', sodium, { doseKey: 'displayRequired', doseUnit: 'mEq', extraNote: sodium?.fromPhosphorus ? '' : undefined });
        pushComponent('Potássio', formulation.electrolytes?.potassium, { doseUnit: 'mEq' });
        pushComponent('Magnésio', formulation.electrolytes?.magnesium, { doseUnit: 'mEq' });
        pushComponent('Cálcio', formulation.electrolytes?.calcium, { doseUnit: 'mEq' });
        pushComponent('Fósforo', formulation.electrolytes?.phosphorus, { doseUnit: 'mmol' });
        pushComponent('Oligoelementos', formulation.additives?.oligoelements, { doseKey: 'volume', doseUnit: 'ml' });
        pushComponent('Vit. Hidrossolúveis', formulation.additives?.water_soluble_vitamins, { doseKey: 'volume', doseUnit: 'ml' });
        pushComponent('Vit. Lipossolúveis', formulation.additives?.fat_soluble_vitamins, { doseKey: 'volume', doseUnit: 'ml' });
        if (formulation.additives?.insulin?.required > 0) {
            pushComponent('Insulina', formulation.additives.insulin, { doseUnit: 'UI', volumeDp: 3 });
        }
        if (formulation.additives?.heparin?.required > 0) {
            pushComponent('Heparina', formulation.additives.heparin, { doseUnit: 'UI', volumeDp: 3 });
        }
        if (formulation.additives?.carnitine?.required > 0) {
            pushComponent('Carnitina', formulation.additives.carnitine, { doseUnit: 'mg' });
        }
        pushComponent('Água Estéril', formulation.water, { doseKey: 'volume', doseUnit: 'ml' });

        const macroTable = `
            <div class="mb-4">
                <h4 class="text-md font-semibold mb-2">Resumo Nutricional</h4>
                <table class="summary-table">
                    <thead>
                        <tr><th>Componente</th><th>Dose Total</th><th>Dose / kg</th><th>Energia</th><th>Notas</th></tr>
                    </thead>
                    <tbody>
                        ${macroRows.map(row => `<tr><th>${row.label}</th><td>${row.total}</td><td>${row.perKg}</td><td>${row.energy}</td><td>${row.notes || ''}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const componentsTable = `
            <div>
                <h4 class="text-md font-semibold mb-2">Componentes e Volumes (Volume Total: ${this.formatValue(formulation.volume, 'ml', 0)})</h4>
                <table class="component-table">
                    <thead><tr><th>Componente</th><th>Dose</th><th>Solução</th><th>Volume</th><th>Notas</th></tr></thead>
                    <tbody>
                        ${componentRows.map(row => `<tr><th>${row.label}</th><td>${row.dose}</td><td>${row.solution}</td><td>${row.volume}</td><td>${row.notes || ''}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const metricsBlock = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-4">
                <div class="metric-card"><span class="metric-label">Osmolaridade</span><span class="metric-value">${this.formatValue(formulation.osmolarity, 'mOsm/L', 0)}</span></div>
                <div class="metric-card"><span class="metric-label">Via</span><span class="metric-value">${formulation.route === 'peripheral' ? 'Periférica' : 'Central'}</span></div>
                <div class="metric-card"><span class="metric-label">Energia/kg</span><span class="metric-value">${weight > 0 ? `${energy.perKg.toFixed(1)} kcal/kg` : '---'}</span></div>
            </div>
        `;

        return `${macroTable}${componentsTable}${metricsBlock}`;
    }
    formatFormulationWarnings(warnings) { 
        if (!warnings || warnings.length === 0) return '<p class="text-green-600"><i class="fas fa-check-circle mr-2"></i>Sem avisos de formulação.</p>'; 
        const items = warnings.map(w => `<li class="text-orange-700 list-disc pl-5 text-sm">${w}</li>`).join('');
        return `<h4 class="text-orange-600 font-semibold mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Avisos de Formulação (${warnings.length}):</h4><ul class="space-y-1">${items}</ul>`;
    }
    formatFormulationErrors(errors) { 
        if (!errors || errors.length === 0) return ''; 
        const items = errors.map(e => `<li class="text-red-700 list-disc pl-5 text-sm">${e}</li>`).join('');
        return `<h4 class="text-red-600 font-semibold mb-2"><i class="fas fa-times-circle mr-2"></i>Erros Críticos (${errors.length}):</h4><ul class="space-y-1">${items}</ul><p class="text-red-600 text-sm font-medium mt-2">A prescrição NÃO pode ser salva ou impressa devido a erros críticos.</p>`;
    }
    generateInstructionLine(step, label, component, valueKey = 'volume', unit = 'ml', extraInfo = '') { 
        const value = component?.[valueKey];
        const solution = component?.solution ? `(${component.solution})` : '';
        const errorMark = component?.error ? ` [!! ${component.error.substring(0,30)}... !!]` : ''; 
        return `${String(step).padEnd(3)}${label}: ${this.formatValue(value, unit)} ${solution} ${extraInfo}${errorMark}\n`;
    }
    generateBagAInstructions(formulation) { 
        let map = "--- BOLSA A (Base Aquosa) ---\nOrdem de adição sugerida (verificar protocolo local e estabilidade):\n"; let step = 1;
        map += this.generateInstructionLine(step++, 'Aminoácidos', formulation.proteins);
        if (formulation.glutamine?.volume > 0) map += this.generateInstructionLine(step++, 'Glutamina', formulation.glutamine);
        map += this.generateInstructionLine(step++, 'Glucose', formulation.glucose);
        map += this.generateInstructionLine(step++, 'Fosfato', formulation.electrolytes?.phosphorus, 'volume', 'ml', '(Adicionar antes do Cálcio, se possível)');
        const partialWaterVol = (formulation.water?.volume ?? 0) * 0.5;
        map += this.generateInstructionLine(step++, 'Água (parcial)', {volume: partialWaterVol}, 'volume', 'ml', '(Agitar após cada eletrólito multivalente)');

        map += `${step++}. Eletrólitos (Monovalentes primeiro, depois divalentes, exceto Cálcio por último):\n`;
        map += this.generateInstructionLine('   a)', 'Sódio (NaCl)', formulation.electrolytes?.sodium);
        map += this.generateInstructionLine('   b)', 'Potássio (KCl)', formulation.electrolytes?.potassium);
        map += this.generateInstructionLine('   c)', 'Magnésio (MgSO₄)', formulation.electrolytes?.magnesium);

        map += this.generateInstructionLine(step++, 'Oligoelementos', formulation.additives?.oligoelements);
        if (formulation.additives?.carnitine?.required > 0 && formulation.additives?.carnitine?.volume > 0) map += this.generateInstructionLine(step++, 'Carnitina', formulation.additives?.carnitine);

        const remainingWaterForAqueous = (formulation.water?.volume ?? 0) - partialWaterVol;
        map += this.generateInstructionLine(step++, 'Água (restante p/ aquosa)', {volume: remainingWaterForAqueous}, 'volume', 'ml', '(Agitar bem)');

        map += this.generateInstructionLine(step++, 'Cálcio (Gluconato)', formulation.electrolytes?.calcium, 'volume', 'ml', '**ADICIONAR LENTAMENTE, SOB AGITAÇÃO VIGOROSA. OBSERVAR.**');

        map += `\n${step++}. ADITIVOS FINAIS (Adicionar imediatamente antes da administração, se política local permitir na bolsa A):\n`;
        if (formulation.additives?.water_soluble_vitamins?.volume > 0) map += this.generateInstructionLine('   a)', 'Vit. Hidrossolúveis', formulation.additives?.water_soluble_vitamins);
        if (formulation.additives?.heparin?.required > 0 && formulation.additives?.heparin?.volume > 0) map += this.generateInstructionLine('   b)', 'Heparina', formulation.additives?.heparin);
        if (formulation.additives?.insulin?.required > 0 && formulation.additives?.insulin?.volume > 0) map += this.generateInstructionLine('   c)', 'Insulina', formulation.additives?.insulin, 'volume', 'ml', `(${this.formatValue(formulation.additives.insulin.required, 'UI',0)})`);

        map += `\nVolume Final Estimado Bolsa A: (Calcular com base nos componentes adicionados à bolsa A)\n`;
        return map;
    }
    generateBagBInstructions(formulation) { 
        let map = "--- BOLSA B (Lípidos) ---\n"; let step = 1;
        map += this.generateInstructionLine(step++, 'Lípidos', formulation.lipids);
        if (formulation.additives?.fat_soluble_vitamins?.volume > 0) map += this.generateInstructionLine(step++, 'Vit. Lipossolúveis', formulation.additives?.fat_soluble_vitamins, 'volume', 'ml', '(Adicionar à emulsão lipídica ANTES de misturar com a bolsa A, se aplicável, ou conforme protocolo)');
        map += `\nVolume Final Estimado Bolsa B: (Calcular com base nos componentes adicionados à bolsa B)\n`;
        return map;
    }
    generateSingleBagInstructions(formulation) { 
        let map = "--- BOLSA ÚNICA (3 em 1) ---\n**Ordem Sugerida (VERIFICAR PROTOCOLO LOCAL E ESTABILIDADE):**\n"; let step = 1;
        map += this.generateInstructionLine(step++, 'Aminoácidos', formulation.proteins);
        if (formulation.glutamine?.volume > 0) map += this.generateInstructionLine(step++, 'Glutamina', formulation.glutamine);
        map += this.generateInstructionLine(step++, 'Glucose', formulation.glucose);
        map += this.generateInstructionLine(step++, 'Fosfato', formulation.electrolytes?.phosphorus, 'volume', 'ml', '(Adicionar antes do Cálcio)');

        const partialWaterVol = (formulation.water?.volume ?? 0) * 0.5; 
        map += this.generateInstructionLine(step++, 'Água (parcial)', {volume: partialWaterVol }, 'volume', 'ml', '(Agitar após cada eletrólito multivalente)');

        map += `${step++}. Eletrólitos (Monovalentes primeiro, depois Mg):\n`;
        map += this.generateInstructionLine('   a)', 'Sódio (NaCl)', formulation.electrolytes?.sodium);
        map += this.generateInstructionLine('   b)', 'Potássio (KCl)', formulation.electrolytes?.potassium);
        map += this.generateInstructionLine('   c)', 'Magnésio (MgSO₄)', formulation.electrolytes?.magnesium);

        map += this.generateInstructionLine(step++, 'Oligoelementos', formulation.additives?.oligoelements);
        if (formulation.additives?.carnitine?.required > 0 && formulation.additives?.carnitine?.volume > 0) map += this.generateInstructionLine(step++, 'Carnitina', formulation.additives?.carnitine);

        map += `${step++}. **APÓS AGITAÇÃO E VERIFICAÇÃO VISUAL (sem turvação/precipitação):**\n`;
        map += this.generateInstructionLine('   ', 'Cálcio (Gluconato)', formulation.electrolytes?.calcium, 'volume', 'ml', '**ADICIONAR LENTAMENTE, SOB AGITAÇÃO VIGOROSA. OBSERVAR.**');

        map += `${step++}. **ADICIONAR VITAMINAS E LÍPIDOS POR ÚLTIMO (Após confirmação de compatibilidade da base):**\n`;
        if (formulation.additives?.water_soluble_vitamins?.volume > 0) map += `   - ${this.generateInstructionLine('a)', 'Vit. Hidrossolúveis', formulation.additives?.water_soluble_vitamins)}`;
        if (formulation.additives?.fat_soluble_vitamins?.volume > 0) {
             map += `   - ${this.generateInstructionLine('b)', 'Vit. Lipossolúveis', formulation.additives?.fat_soluble_vitamins, 'volume', 'ml', '(Misturar com lípidos antes, se protocolo permitir)')}`;
        }
        map += `   - ${this.generateInstructionLine('c)', 'Lípidos', formulation.lipids, 'volume', 'ml', '**ADICIONAR LENTAMENTE, AGITAR BEM APÓS ADIÇÃO TOTAL. OBSERVAR.**')}`;

        map += `${step++}. **ADITIVOS FINAIS (se aplicável, adicionar à bolsa finalizada):**\n`;
        if (formulation.additives?.heparin?.required > 0 && formulation.additives?.heparin?.volume > 0) map += `   - ${this.generateInstructionLine('a)', 'Heparina', formulation.additives?.heparin)}`;
        if (formulation.additives?.insulin?.required > 0 && formulation.additives?.insulin?.volume > 0) map += `   - ${this.generateInstructionLine('b)', 'Insulina', formulation.additives?.insulin, 'volume', 'ml', `(${this.formatValue(formulation.additives.insulin.required, 'UI',0)})`)}`;

        const remainingWater = (formulation.water?.volume ?? 0) - partialWaterVol;
        map += this.generateInstructionLine(step++, 'Água (restante)', {volume: Math.max(0, remainingWater)}, 'volume', 'ml', `(q.s.p. ${this.formatValue(formulation.volume, 'ml', 0)})`);
        map += `\nVolume Final Estimado: ${this.formatValue(formulation.volume, 'ml', 0)}\n`;
        return map;
    }
    generatePreparationMap(formulation) { 
        if (!formulation?.patient?.weight) {
            console.error("NutriSoft.generatePreparationMap: Peso do doente inválido para gerar mapa de preparação.");
            return "Erro: Peso do doente inválido para gerar mapa.";
        }
        try {
            const useTwoBags = (formulation.patient.weight < 5 && formulation.patient.condition === 'pediatric') || (formulation.patient.condition === 'neonate'); 

            if (useTwoBags) {
                console.log("Generating 2-bag preparation map.");
                return this.generateBagAInstructions(formulation) + "\n\n" + this.generateBagBInstructions(formulation);
            } else {
                console.log("Generating single-bag (3-in-1) preparation map.");
                return this.generateSingleBagInstructions(formulation);
            }
        } catch (error) {
            console.error("NutriSoft.generatePreparationMap: Erro ao gerar mapa de preparação:", error);
            AuditLogger.log('generatePrepMapError', { patientId: formulation.patient.id, error: error.message, stack: error.stack });
            return "Erro interno ao gerar mapa de preparação. Verifique o console.";
        }
    }
    savePrescription() { 
        console.log("NutriSoft.savePrescription: Attempting to save prescription...");
        this.userName = document.getElementById('user-name')?.value.trim() || this.dataManager.getUserName();
        if(this.userName !== this.dataManager.getUserName()) { 
            this.dataManager.saveUserName(this.userName);
        }

        const formulation = this.calculateFormulation();

        if (!formulation) {
            this.dataManager.displayNotification('Falha no cálculo da formulação. Prescrição não pode ser salva.', 'error');
            return;
        }
        if (formulation.errors && formulation.errors.length > 0) {
            this.dataManager.displayNotification('Formulação contém ERROS CRÍTICOS. Não pode ser salva. Verifique os resultados.', 'error');
            document.getElementById('formulation-results')?.classList.remove('hidden'); 
            document.getElementById('formulation-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (formulation.warnings && formulation.warnings.length > 0) {
            if (!confirm(`A formulação calculada tem ${formulation.warnings.length} aviso(s).\n\nExemplo: "${formulation.warnings[0]}"\n\nDeseja salvar a prescrição mesmo assim?`)) {
                AuditLogger.log('savePrescriptionCancelledDueToWarnings', { patientId: formulation.patient.id, warningsCount: formulation.warnings.length });
                this.dataManager.displayNotification('Salvamento da prescrição cancelado pelo utilizador devido a avisos.', 'info');
                return;
            }
            AuditLogger.log('savePrescriptionConfirmedWithWarnings', { patientId: formulation.patient.id, warnings: formulation.warnings.length });
        }

        const isEditing = this.currentPrescriptionIndex !== null && this.currentPrescriptionIndex >= 0 && this.currentPrescriptionIndex < this.prescriptions.length;
        const existingPrescription = isEditing ? this.prescriptions[this.currentPrescriptionIndex] : null;

        const preparation = {
            preparationNumber: existingPrescription ? existingPrescription.preparationNumber : this.dataManager.getNextPreparationNumber(),
            patientId: formulation.patient.id,
            patientName: formulation.patient.name,
            protocolId: formulation.protocolId || '',
            date: new Date().toISOString().split('T')[0],
            volume: formulation.volume,
            osmolarity: formulation.osmolarity,
            preparationMap: this.generatePreparationMap(formulation), 
            formulation: formulation, 
            createdBy: this.userName,
            createdAt: existingPrescription ? existingPrescription.createdAt : new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
        };

        let logAction = ''; let userFeedback = '';
        if (isEditing) {
            this.prescriptions[this.currentPrescriptionIndex] = preparation;
            logAction = 'editPrescriptionSaved';
            userFeedback = `Prescrição #${preparation.preparationNumber} editada e salva com sucesso!`;
        } else {
            this.prescriptions.push(preparation);
            logAction = 'savePrescriptionNew';
            userFeedback = `Nova prescrição #${preparation.preparationNumber} salva com sucesso!`;
        }

        this.dataManager.savePrescriptions(this.prescriptions);
        AuditLogger.log(logAction, { prepId: preparation.preparationNumber, patientId: preparation.patientId });
        this.dataManager.displayNotification(userFeedback, 'success');

        this.renderPrescriptionHistory(); 
        this.renderReports(); 
        this.renderEvolutionPatientSelect(); 
        if (formulation.patient.id) { 
            this.renderPatientEvolution(formulation.patient.id);
            this.renderPatientEvolutionChart(formulation.patient.id);
        }

        this.currentPrescriptionIndex = null; 
        document.getElementById('save-prescription-btn').disabled = true;
        document.getElementById('print-prescription-btn').disabled = true;

        console.log(`NutriSoft.savePrescription: Prescription ${logAction} successful for prep #${preparation.preparationNumber}`);
    }
    renderPrescriptionHistory() { 
        const tbody = document.getElementById('prescriptions-history'); 
        if(!tbody) {
            console.warn("renderPrescriptionHistory: tbody 'prescriptions-history' not found.");
            return;
        }
        const noResultsRowTemplate = tbody.querySelector('.no-results-row');
        tbody.innerHTML = '';
        if (noResultsRowTemplate) tbody.appendChild(noResultsRowTemplate.cloneNode(true));

        const noResultsRow = tbody.querySelector('.no-results-row');

        if (this.prescriptions.length === 0) {
            noResultsRow?.classList.remove('hidden');
            return;
        }
        noResultsRow?.classList.add('hidden');

        const reversedPrescriptions = [...this.prescriptions].reverse();

        reversedPrescriptions.forEach((prescription, reversedIdx) => { 
             const patient = this.patients.find(p => p.id === prescription.patientId);
             const patientNameDisplay = patient ? patient.name : `(${prescription.patientName || 'Doente Excluído'})`;
            const row = tbody.insertRow(tbody.rows.length - (noResultsRow ? 1 : 0));
            row.classList.add('hover:bg-gray-50');
            row.innerHTML = `
                <td class="p-3">${prescription.preparationNumber || '-'}</td>
                <td class="p-3">${prescription.date ? new Date(prescription.date).toLocaleDateString() : '-'}</td>
                <td class="p-3">${patientNameDisplay}</td>
                <td class="p-3">${this.formatValue(prescription.volume, 'ml', 0)}</td>
                <td class="p-3">${this.formatValue(prescription.osmolarity, 'mOsm/L', 0)}</td>
                <td class="p-3">${prescription.createdBy || '-'}</td>
                <td class="p-3">${prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '-'}</td>
                <td class="p-3 whitespace-nowrap text-right">
                    <button data-action="view" data-index="${reversedIdx}" class="table-action-btn text-blue-600 hover:text-blue-800 mr-2" title="Visualizar Detalhes"><i class="fas fa-eye"></i></button>
                    <button data-action="edit" data-index="${reversedIdx}" class="table-action-btn text-yellow-600 hover:text-yellow-800 mr-2" title="Editar Prescrição"><i class="fas fa-edit"></i></button>
                    <button data-action="print" data-index="${reversedIdx}" class="table-action-btn text-green-600 hover:text-green-800 mr-2" title="Imprimir Prescrição"><i class="fas fa-print"></i></button>
                    <button data-action="delete" data-index="${reversedIdx}" class="table-action-btn text-red-600 hover:text-red-800" title="Eliminar Prescrição"><i class="fas fa-trash"></i></button>
                </td>`;
        });
        this.checkAccessPermissions(); 
    }
    renderReports(filteredPrescriptions = this.prescriptions) { 
        const reportsTbody = document.getElementById('reports-list-body');
        if (!reportsTbody) {
            console.warn("renderReports: reports-list-body tbody not found.");
            return;
        }
        const noResultsRowTemplate = reportsTbody.querySelector('.no-results-row');
        reportsTbody.innerHTML = '';
        if(noResultsRowTemplate) reportsTbody.appendChild(noResultsRowTemplate.cloneNode(true));

        const noResultsRow = reportsTbody.querySelector('.no-results-row');

        if (filteredPrescriptions.length === 0) {
            noResultsRow?.classList.remove('hidden');
            return;
        }
         noResultsRow?.classList.add('hidden');

        const sortedPrescriptions = [...filteredPrescriptions].sort((a, b) => (b.preparationNumber || 0) - (a.preparationNumber || 0));

        sortedPrescriptions.forEach((prescription) => { 
             const patient = this.patients.find(p => p.id === prescription.patientId);
             const patientNameDisplay = patient ? patient.name : `(${prescription.patientName || 'Doente Excluído'})`;
            const row = reportsTbody.insertRow(reportsTbody.rows.length - (noResultsRow ? 1 : 0));
            row.classList.add('hover:bg-gray-50');
            row.innerHTML = `
                <td class="p-3">${prescription.preparationNumber || '-'}</td>
                <td class="p-3">${prescription.date ? new Date(prescription.date).toLocaleDateString() : '-'}</td>
                <td class="p-3">${patientNameDisplay}</td>
                <td class="p-3">${this.formatValue(prescription.volume, 'ml', 0)}</td>
                <td class="p-3">${this.formatValue(prescription.osmolarity, 'mOsm/L', 0)}</td>
                <td class="p-3">${prescription.createdBy || '-'}</td>
                <td class="p-3">${prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '-'}</td>
                 <td class="p-3 whitespace-nowrap text-right">
                     <button data-action="view" data-prep-number="${prescription.preparationNumber}" class="table-action-btn text-blue-600 hover:text-blue-800 mr-2" title="Visualizar Detalhes"><i class="fas fa-eye"></i></button>
                     <button data-action="edit" data-prep-number="${prescription.preparationNumber}" class="table-action-btn text-yellow-600 hover:text-yellow-800 mr-2" title="Editar Prescrição"><i class="fas fa-edit"></i></button>
                     <button data-action="print" data-prep-number="${prescription.preparationNumber}" class="table-action-btn text-green-600 hover:text-green-800 mr-2" title="Imprimir Prescrição"><i class="fas fa-print"></i></button>
                     <button data-action="delete" data-prep-number="${prescription.preparationNumber}" class="table-action-btn text-red-600 hover:text-red-800" title="Eliminar Prescrição"><i class="fas fa-trash"></i></button>
                 </td>`;
        });
        this.checkAccessPermissions();
    }
    viewPrescription(originalIndex) { 
        if (originalIndex < 0 || originalIndex >= this.prescriptions.length) {
            console.error("NutriSoft.viewPrescription: Índice de prescrição inválido:", originalIndex);
            this.dataManager.displayNotification("Erro: Prescrição não encontrada para visualização.", "error");
            return;
        }
        const prescription = this.prescriptions[originalIndex];
        if (!prescription?.formulation) {
            this.dataManager.displayNotification('Dados da formulação inválidos ou ausentes para esta prescrição.', 'error');
            return;
        }
        console.log("NutriSoft.viewPrescription: Viewing prescription #", prescription.preparationNumber);
        this.populatePrescriptionForm(prescription.formulation, prescription.patientId);
        this.displayResults(prescription.formulation); 
        this.disablePrescriptionForm(true); 
        this.currentPrescriptionIndex = null; 
        window.location.hash = 'prescription'; 
        document.getElementById('prescription-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        AuditLogger.log('viewPrescription', { prepId: prescription.preparationNumber, patientId: prescription.patientId });
    }
    editPrescription(originalIndex) { 
        if (originalIndex < 0 || originalIndex >= this.prescriptions.length) {
            console.error("NutriSoft.editPrescription: Índice de prescrição inválido:", originalIndex);
            this.dataManager.displayNotification("Erro: Prescrição não encontrada para edição.", "error");
            return;
        }
        const prescription = this.prescriptions[originalIndex];
        if (!prescription?.formulation) {
            this.dataManager.displayNotification('Dados da formulação inválidos ou ausentes para edição.', 'error');
            return;
        }
        console.log("NutriSoft.editPrescription: Editing prescription #", prescription.preparationNumber);
        this.populatePrescriptionForm(prescription.formulation, prescription.patientId); 
        this.displayResults(prescription.formulation);
        this.disablePrescriptionForm(false); 
        document.getElementById('calculate-formulation-btn').disabled = false;
        document.getElementById('save-prescription-btn').disabled = true; 
        document.getElementById('print-prescription-btn').disabled = true; 

        this.currentPrescriptionIndex = originalIndex; 
        window.location.hash = 'prescription'; 
        document.getElementById('prescription-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        AuditLogger.log('editPrescriptionStarted', { prepId: prescription.preparationNumber, patientId: prescription.patientId });
    }
    disablePrescriptionForm(disable) { 
        const formSection = document.getElementById('prescription-section');
        if (!formSection) {
            console.warn("disablePrescriptionForm: prescription-section not found.");
            return;
        }
        formSection.querySelectorAll('#prescription-form input, #prescription-form select').forEach(el => {
            el.disabled = disable;
        });
        const calcBtn = document.getElementById('calculate-formulation-btn');
        const saveBtn = document.getElementById('save-prescription-btn');
        const printBtn = document.getElementById('print-prescription-btn');

        if (calcBtn) calcBtn.disabled = disable;
        if (saveBtn) saveBtn.disabled = disable ? true : saveBtn.disabled; 
        if (printBtn) printBtn.disabled = disable ? true : printBtn.disabled;

        const patientSelect = document.getElementById('prescription-patient');
        if (patientSelect) patientSelect.disabled = disable;
    }
    setInputValue(id, value, defaultValue = '') { 
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'SELECT') {
                const optionExists = Array.from(element.options).some(opt => opt.value == value); 
                if (optionExists) {
                    element.value = value;
                } else {
                    element.value = defaultValue; 
                }
            } else { 
                element.value = (value !== undefined && value !== null && (typeof value === 'string' || !isNaN(value))) ? String(value) : defaultValue;
            }
        } 
    }
    populatePrescriptionForm(formulation, patientId) { 
        console.log("NutriSoft.populatePrescriptionForm: Populating form with formulation data for patient ID:", patientId);
        const patientWeight = formulation.patient?.weight ?? 0;

        this.setInputValue('prescription-patient', patientId);
        this.setInputValue('total-volume', formulation.volume);
        this.setInputValue('infusion-hours', formulation.infusionHours ?? 24);
        this.setInputValue('administration-route', formulation.route || 'central');

        if (patientWeight > 0) {
            this.setInputValue('protein-needs', (formulation.proteins?.required / patientWeight).toFixed(2));
            this.setInputValue('lipid-needs', (formulation.lipids?.required / patientWeight).toFixed(2));
            const glucose_g_day = formulation.glucose?.required ?? 0;
            const infusionMinutes = Math.max(1, parseNum(formulation.infusionHours, 24) * 60);
            const GIR_mg_kg_min = (glucose_g_day * 1000) / (patientWeight * infusionMinutes);
            this.setInputValue('glucose-rate', GIR_mg_kg_min.toFixed(2));

            this.setInputValue('sodium-needs', (formulation.electrolytes?.sodium?.required / patientWeight).toFixed(2));
            this.setInputValue('potassium-needs', (formulation.electrolytes?.potassium?.required / patientWeight).toFixed(2));
            this.setInputValue('magnesium-needs', (formulation.electrolytes?.magnesium?.required / patientWeight).toFixed(2));
            this.setInputValue('calcium-needs', (formulation.electrolytes?.calcium?.required / patientWeight).toFixed(2));
            this.setInputValue('carnitine-needs', ((formulation.additives?.carnitine?.required ?? 0) / patientWeight).toFixed(2) || '20'); 
        } else { 
            ['protein-needs', 'lipid-needs', 'glucose-rate', 'sodium-needs', 'potassium-needs', 'magnesium-needs', 'calcium-needs', 'carnitine-needs'].forEach(id => this.setInputValue(id, ''));
        }
        this.setInputValue('phosphorus-needs', formulation.electrolytes?.phosphorus?.required ?? ''); 

        this.setInputValue('oligoelements-volume', formulation.additives?.oligoelements?.volume ?? '10');
        this.setInputValue('water-soluble-vitamins-volume', formulation.additives?.water_soluble_vitamins?.volume ?? '10');
        this.setInputValue('fat-soluble-vitamins-volume', formulation.additives?.fat_soluble_vitamins?.volume ?? '10');

        const insulinRequired = formulation.additives?.insulin?.required ?? 0;
        const glucoseRequired = formulation.glucose?.required ?? 0;
        const insulinRate = (glucoseRequired > 0 && insulinRequired > 0) ? (insulinRequired / glucoseRequired).toFixed(2) : '0.05';
        this.setInputValue('insulin-rate', insulinRate);

        const heparinRequired = formulation.additives?.heparin?.required ?? 0;
        const totalVol = formulation.volume ?? 0;
        const heparinRate = (totalVol > 0 && heparinRequired > 0) ? (heparinRequired / totalVol).toFixed(2) : '0.5';
        this.setInputValue('heparin-rate', heparinRate);


        this.setInputValue('amino-acids-solution', formulation.proteins?.solution);
        this.setInputValue('glucose-solution', formulation.glucose?.solution);
        this.setInputValue('lipids-solution', formulation.lipids?.solution);
        this.setInputValue('nacl-solution', formulation.electrolytes?.sodium?.solution);
        this.setInputValue('kcl-solution', formulation.electrolytes?.potassium?.solution);
        this.setInputValue('cacl2-solution', formulation.electrolytes?.calcium?.solution); 
        this.setInputValue('mgso4-solution', formulation.electrolytes?.magnesium?.solution);
        this.setInputValue('phosphorus-solution', formulation.electrolytes?.phosphorus?.solution);
        this.setInputValue('prescription-protocol', formulation.protocolId || '');
    }
    printPrescription(originalIndex = null) { 
        console.log("NutriSoft.printPrescription: Preparing to print. Original Index:", originalIndex);
        let formulationToPrint;
        let prepDetails = { prepNum: 'N/A (Não Salvo)', patientName: 'N/A', date: new Date().toISOString(), map: '' };
        let logDetails = {};

        try {
            if (originalIndex !== null && originalIndex >= 0 && originalIndex < this.prescriptions.length) {
                const p = this.prescriptions[originalIndex];
                if (!p?.formulation) throw new Error(`Dados da formulação inválidos para prescrição #${p?.preparationNumber}.`);
                formulationToPrint = p.formulation;
                prepDetails = {
                    prepNum: p.preparationNumber,
                    patientName: p.patientName || p.formulation.patient?.name || 'Desconhecido',
                    date: p.date || p.createdAt,
                    map: p.preparationMap || this.generatePreparationMap(p.formulation) 
                };
                logDetails = { prepId: prepDetails.prepNum, source: 'history', index: originalIndex };
                console.log("Printing existing prescription:", prepDetails.prepNum);
            } else { 
                console.log("Attempting to print current, unsaved formulation...");
                formulationToPrint = this.calculateFormulation(); 
                if (!formulationToPrint) {
                    this.dataManager.displayNotification('Não foi possível calcular a formulação para impressão. Verifique os dados e tente calcular primeiro.', 'warning');
                    return;
                }
                if (formulationToPrint.errors?.length > 0) {
                    this.dataManager.displayNotification('Formulação contém ERROS CRÍTICOS e não pode ser impressa. Corrija os erros.', 'error');
                    return;
                }
                const nextPrepNumEstimate = (this.dataManager.getData(this.dataManager.preparationCounterKey) || 0) + 1;
                prepDetails = {
                    prepNum: `(Não Salvo - Est. #${nextPrepNumEstimate})`,
                    patientName: formulationToPrint.patient?.name || 'Desconhecido',
                    date: new Date().toISOString(), 
                    map: this.generatePreparationMap(formulationToPrint)
                };
                logDetails = { patientId: formulationToPrint.patient?.id, source: 'current_calculation' };
                console.log("Printing newly calculated, unsaved formulation for patient:", prepDetails.patientName);
            }

            if (!window.jspdf || !window.jspdf.jsPDF) {
                console.error("jsPDF library is not loaded. Cannot generate PDF.");
                this.dataManager.displayNotification("Erro: Biblioteca jsPDF não carregada. PDF não pode ser gerado.", "error");
                AuditLogger.log('printPrescriptionError', { ...logDetails, error: 'jsPDF not loaded' });
                return;
            }

            AuditLogger.log('printPrescriptionInitiated', logDetails);
            this.exportPDF(formulationToPrint, prepDetails.map, prepDetails.prepNum, prepDetails.patientName, prepDetails.date);
            this.dataManager.displayNotification('Gerando PDF da prescrição...', 'info');

        } catch (error) {
            console.error("NutriSoft.printPrescription: Error during print preparation:", error);
            this.dataManager.displayNotification(`Erro ao preparar impressão: ${error.message}. Verifique o console.`, 'error');
            AuditLogger.log('printPrescriptionError', { ...logDetails, error: error.message, stack: error.stack });
        }
    }
    deletePrescription(originalIndex) { 
         if (originalIndex < 0 || originalIndex >= this.prescriptions.length) {
            console.error("NutriSoft.deletePrescription: Índice de prescrição inválido:", originalIndex);
            this.dataManager.displayNotification("Erro: Prescrição não encontrada para exclusão.", "error");
            return;
         }
        const p = this.prescriptions[originalIndex];
        if (confirm(`Tem a certeza que deseja excluir a prescrição #${p.preparationNumber} para "${p.patientName || 'Doente Desconhecido'}"? Esta ação é irreversível.`)) {
            console.log(`NutriSoft.deletePrescription: Deleting prescription ID ${p.preparationNumber}.`);
            this.prescriptions.splice(originalIndex, 1); 
            this.dataManager.savePrescriptions(this.prescriptions); 

            AuditLogger.log('deletePrescriptionConfirmed', { prepId: p.preparationNumber, patientId: p.patientId });
            this.dataManager.displayNotification(`Prescrição #${p.preparationNumber} excluída com sucesso!`, 'success');

            this.renderPrescriptionHistory();
            this.renderReports();
            const evolutionPatientSelect = document.getElementById('evolution-patient-select');
            if (evolutionPatientSelect && parseInt(evolutionPatientSelect.value) === p.patientId) {
                this.renderPatientEvolution(p.patientId);
                this.renderPatientEvolutionChart(p.patientId);
            }

            if (this.currentPrescriptionIndex === originalIndex) {
                this.currentPrescriptionIndex = null;
                this.disablePrescriptionForm(true); 
                document.getElementById('formulation-results')?.classList.add('hidden');
            } else if (this.currentPrescriptionIndex !== null && this.currentPrescriptionIndex > originalIndex) {
                this.currentPrescriptionIndex--; 
            }
        } else {
            AuditLogger.log('deletePrescriptionCancelled', { prepId: p.preparationNumber });
            console.log(`NutriSoft.deletePrescription: Deletion of prescription ID ${p.preparationNumber} cancelled by user.`);
        }
    }
    setupPatientSearch() { 
        const searchInput = document.getElementById('patient-search-input');
        searchInput?.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = this.patients.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                p.idNumber?.toLowerCase().includes(query) ||
                String(p.id).toLowerCase().includes(query) || 
                p.service?.toLowerCase().includes(query) ||
                p.condition?.toLowerCase().includes(query)
            );
            this.renderPatientsList(filtered);
        });
    }
    setupPrescriptionSearch() { 
        const searchInput = document.getElementById('search-input'); 
        searchInput?.addEventListener('input', () => this.filterTable('prescriptions-history', searchInput.value.toLowerCase().trim(), 8)); 
    }
    setupReportsSearch() { 
        const searchInput = document.getElementById('reports-search-input'); 
        searchInput?.addEventListener('input', () => this.filterTable('reports-list-body', searchInput.value.toLowerCase().trim(), 8)); 
    }
    filterTable(tbodyId, query, colspan) { 
        const tbody = document.getElementById(tbodyId);
        if (!tbody) {
            console.warn(`filterTable: tbody with ID '${tbodyId}' not found.`);
            return;
        }
        const rows = Array.from(tbody.querySelectorAll('tr')); 
        let foundMatch = false;
        const noResultsRow = tbody.querySelector('.no-results-row');

        rows.forEach(row => {
            if (row === noResultsRow) return; 

            let match = false;
            const cells = Array.from(row.querySelectorAll('td'));
            const cellsToSearch = cells.slice(0, cells.length > 1 ? cells.length -1 : cells.length);

            for (const cell of cellsToSearch) {
                if (cell.textContent?.toLowerCase().includes(query)) {
                    match = true;
                    break; 
                }
            }

            row.classList.toggle('hidden', !match);
            if (match) foundMatch = true;
        });

        if (noResultsRow) {
            noResultsRow.classList.toggle('hidden', foundMatch);
            if(!foundMatch){ 
                 const td = noResultsRow.querySelector('td');
                 if(td) td.colSpan = colspan;
            }
        }
    }
    exportPDF(formulation, preparationMap, preparationNumber, patientName, prescriptionDate) {
        try {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                console.error("jsPDF library is not loaded. Cannot generate PDF.");
                this.dataManager.displayNotification("Erro: Biblioteca jsPDF não carregada.", "error");
                return;
            }

            const doc = this.createPdfDocument();

            this.generateWorksheetPage(doc, formulation, preparationMap, preparationNumber, patientName, prescriptionDate);

            this.generateLabelsPage(doc, formulation, preparationNumber, patientName, prescriptionDate);

            const fileNameSafePatient = (patientName || 'doente').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `nutrisoft_${fileNameSafePatient}_prep${preparationNumber}_${timestamp}.pdf`;
            doc.save(filename);
            console.log("PDF generated:", filename);
        } catch (error) {
            console.error("NutriSoft.exportPDF: Erro ao gerar PDF:", error);
            this.dataManager.displayNotification(`Erro ao gerar PDF: ${error.message}. Verifique o console.`, 'error');
            AuditLogger.log('exportPDFError', { prepId: preparationNumber, error: error.message, stack: error.stack });
        }
    }

    createPdfDocument() {
        const { jsPDF } = window.jspdf;
        return new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    }

    pdfEnsureSpace(doc, currentY, requiredHeight) {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (currentY + requiredHeight <= pageHeight - PDF_THEME.margins.bottom) return { y: currentY, pageAdded: false };
        doc.addPage();
        return { y: PDF_THEME.margins.top, pageAdded: true };
    }

    pdfFitText(doc, text, x, y, maxWidth, baseSize, minSize = 6.5, style = 'normal') {
        doc.setFont(PDF_THEME.fonts.family, style);
        let size = baseSize;
        while (size >= minSize) {
            doc.setFontSize(size);
            if (doc.getTextWidth(text) <= maxWidth) {
                doc.text(text, x, y);
                return size;
            }
            size -= 0.4;
        }
        doc.setFontSize(minSize);
        doc.text(text, x, y, { maxWidth });
        return minSize;
    }

    pdfDrawSafeArea(doc, template, startX, startY) {
        const { safeArea } = template;
        if (!safeArea) return;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.setLineDash([1, 1], 0);
        doc.rect(startX + safeArea.x, startY + safeArea.y, safeArea.w, safeArea.h);
        doc.setLineDash();
    }

    pdfCalibrationMarks(doc, template, startX, startY) {
        const size = 2.5;
        const marks = [
            [startX, startY],
            [startX + template.width, startY],
            [startX, startY + template.height],
            [startX + template.width, startY + template.height]
        ];
        doc.setDrawColor(120, 120, 120);
        marks.forEach(([mx, my]) => {
            doc.line(mx - size, my, mx + size, my);
            doc.line(mx, my - size, mx, my + size);
        });
        doc.setFontSize(6);
        doc.text('Imprimir a 100% · Validar recorte', startX + 2, startY + template.height - 2);
    }

    pdfDrawTable(doc, startX, startY, headers, rows, widths, options = {}) {
        const headerHeight = options.headerHeight || 7;
        const rowHeight = options.rowHeight || 6;
        let y = startY;
        const maxWidth = doc.internal.pageSize.getWidth() - PDF_THEME.margins.right;

        const drawHeader = () => {
            let x = startX;
            doc.setFontSize(PDF_THEME.fonts.small);
            doc.setFont(PDF_THEME.fonts.family, 'bold');
            doc.setDrawColor(...PDF_THEME.palette.subtleBorder);
            doc.setFillColor(...PDF_THEME.palette.headerFill);
            headers.forEach((header, idx) => {
                const width = widths[idx];
                doc.rect(x, y, width, headerHeight, 'FD');
                doc.text(String(header), x + 1.5, y + headerHeight - 2);
                x += width;
            });
            y += headerHeight;
        };

        const drawRow = (row) => {
            let x = startX;
            doc.setFont(PDF_THEME.fonts.family, options.bodyFontStyle || 'normal');
            doc.setFontSize(PDF_THEME.fonts.small);
            row.forEach((cell, idx) => {
                const width = widths[idx];
                const text = cell === undefined || cell === null ? '' : String(cell);
                doc.rect(x, y, width, rowHeight);
                doc.text(text, x + 1.5, y + rowHeight - 2, { maxWidth: width - 3 });
                x += width;
            });
            y += rowHeight;
        };

        drawHeader();
        rows.forEach(row => {
            if (startX + widths.reduce((a, b) => a + b, 0) > maxWidth) {
                console.warn('Tabela excedeu largura, ajuste de colunas necessário.');
            }
            const ensured = this.pdfEnsureSpace(doc, y, rowHeight + PDF_THEME.margins.bottom);
            if (ensured.pageAdded) {
                y = ensured.y;
                drawHeader();
            } else {
                y = ensured.y;
            }
            drawRow(row);
        });
        return y;
    }

    generateWorksheetPage(doc, formulation, preparationMap, prepNumber, patientName, prescriptionDate) {
        const margin = PDF_THEME.margins.left;
        const usableWidth = doc.internal.pageSize.getWidth() - PDF_THEME.margins.left - PDF_THEME.margins.right;
        let y = PDF_THEME.margins.top;
        const patient = formulation.patient || {};
        const energy = formulation.energy || {};
        const weight = Number(patient.weight) || 0;
        const headerText = 'Ficha de Preparação Farmacêutica';

        const safeDate = (() => {
            try {
                const d = prescriptionDate ? new Date(prescriptionDate) : new Date();
                return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } catch (err) {
                console.warn('Erro a formatar data da prescrição', err);
                return 'N/A';
            }
        })();

        try {
            doc.addImage('ULSSMsgtf.jpg', 'JPEG', PDF_THEME.margins.left, y - 4, 26, 12);
        } catch (err) {
            console.warn('Logótipo não carregado no PDF', err);
        }

        doc.setFont(PDF_THEME.fonts.family, 'bold');
        doc.setFontSize(PDF_THEME.fonts.title);
        doc.text('NutriSoft · Nutrição Parentérica', doc.internal.pageSize.getWidth() / 2, y + 2, { align: 'center' });
        doc.setFontSize(PDF_THEME.fonts.section);
        doc.text(headerText, doc.internal.pageSize.getWidth() / 2, y + 8, { align: 'center' });
        y += 14;

        const headerBoxHeight = 36;
        doc.setDrawColor(...PDF_THEME.palette.border);
        doc.rect(margin, y, usableWidth * 0.68, headerBoxHeight);
        doc.setFont(PDF_THEME.fonts.family, 'normal');
        doc.setFontSize(PDF_THEME.fonts.base);
        const headerLines = [
            [`#Prep: ${prepNumber}`, `Data: ${safeDate}`],
            [`Paciente: ${patientName || '---'}`, `Processo: ${patient.processNumber || patient.admissionNumber || '---'}`],
            [`Condição: ${patient.condition || '---'}`, `Médico: ${patient.physician || '---'}`],
            [`Peso: ${this.formatValue(patient.weight, 'kg', 1)}`, `Via: ${formulation.route === 'peripheral' ? 'Periférica' : 'Central'}`]
        ];
        let infoY = y + 6;
        headerLines.forEach(line => {
            doc.text(line[0], margin + 3, infoY);
            doc.text(line[1], margin + usableWidth * 0.35, infoY);
            infoY += 7;
        });

        const barcodeBoxX = margin + usableWidth * 0.7;
        const barcodeBoxW = usableWidth * 0.3;
        doc.setDrawColor(...PDF_THEME.palette.subtleBorder);
        doc.rect(barcodeBoxX, y, barcodeBoxW, headerBoxHeight);
        doc.setFontSize(PDF_THEME.fonts.small);
        doc.setFont(PDF_THEME.fonts.family, 'italic');
        doc.text('Código/QR da Preparação', barcodeBoxX + barcodeBoxW / 2, y + headerBoxHeight / 2, { align: 'center' });
        y += headerBoxHeight + 6;

        const proteins = formulation.proteins || {};
        const glucose = formulation.glucose || {};
        const lipids = formulation.lipids || {};
        const macroRows = [
            [
                'Aminoácidos',
                this.formatValue(proteins.required, 'g', 1),
                weight > 0 ? `${(proteins.required / weight).toFixed(2)} g/kg` : '---',
                this.formatValue(energy.proteins, 'kcal', 0),
                `N: ${this.formatValue(proteins.nitrogen, 'g', 2)}`
            ],
            [
                'Glucose',
                this.formatValue(glucose.required, 'g', 1),
                weight > 0 ? `${(glucose.required / weight).toFixed(2)} g/kg` : '---',
                this.formatValue(energy.glucose, 'kcal', 0),
                `GIR: ${energy.GIR ? energy.GIR.toFixed(2) : '---'} mg/kg/min`
            ],
            [
                'Lípidos',
                this.formatValue(lipids.required, 'g', 1),
                weight > 0 ? `${(lipids.required / weight).toFixed(2)} g/kg` : '---',
                this.formatValue(energy.lipids, 'kcal', 0),
                ''
            ],
            [
                'Energia Total',
                this.formatValue(energy.total, 'kcal', 0),
                weight > 0 ? `${energy.perKg.toFixed(1)} kcal/kg` : '---',
                '',
                `Glucose %: ${energy.glucosePercent ? energy.glucosePercent.toFixed(1) : '---'}%`
            ]
        ];

        doc.setFont(PDF_THEME.fonts.family, 'bold');
        doc.setFontSize(PDF_THEME.fonts.section);
        doc.text('Macronutrientes e Energia', margin, y - 2);
        y = this.pdfDrawTable(doc, margin, y, ['Componente', 'Dose', 'Dose/kg', 'Energia', 'Notas'], macroRows, [40, 30, 30, 30, usableWidth - 130]);
        y += 4;

        const componentRows = [];
        const pushRow = (label, component, options = {}) => {
            if (!component) return;
            const doseKey = options.doseKey || 'required';
            const volumeKey = options.volumeKey || 'volume';
            const dose = component[doseKey];
            const volume = component[volumeKey];
            const hasDose = Number.isFinite(dose) && dose !== 0;
            const hasVolume = Number.isFinite(volume) && volume !== 0;
            if (!hasDose && !hasVolume && !component.error) return;
            const doseUnit = options.doseUnit || '';
            const volumeUnit = options.volumeUnit || 'ml';
            const noteParts = [];
            if (component.recommended !== undefined && component.recommended !== null && doseKey !== 'volume') {
                if (Number.isFinite(component.recommended) && component.recommended > 0 && component.recommended !== dose) {
                    noteParts.push(`Alvo ${this.formatValue(component.recommended, doseUnit, 2)}`);
                }
            }
            if (component.source) noteParts.push(component.source === 'direct' ? 'Prescrito' : 'Calculado');
            if (component.fromPhosphorus && label.startsWith('Sódio')) {
                noteParts.push(`${this.formatValue(component.fromPhosphorus, 'mEq', 2)} do Fosfato`);
            }
            if (component.error) noteParts.push(`⚠ ${component.error}`);
            componentRows.push([
                label,
                component.solution || '---',
                this.formatValue(dose, doseUnit, options.doseDp ?? 2),
                this.formatValue(volume, volumeUnit, options.volumeDp ?? 1),
                noteParts.join(' · ')
            ]);
        };

        pushRow('Aminoácidos', proteins, { doseUnit: 'g', doseDp: 1 });
        if (formulation.glutamine?.volume > 0) {
            pushRow('Glutamina (Dipeptídeo)', formulation.glutamine, { doseKey: 'required_g_dipeptide', doseUnit: 'g', doseDp: 2 });
        }
        pushRow('Glucose', glucose, { doseUnit: 'g', doseDp: 1 });
        pushRow('Lípidos', lipids, { doseUnit: 'g', doseDp: 1 });
        const sodium = formulation.electrolytes?.sodium;
        pushRow('Sódio (Total)', sodium, { doseKey: 'displayRequired', doseUnit: 'mEq' });
        pushRow('Potássio', formulation.electrolytes?.potassium, { doseUnit: 'mEq' });
        pushRow('Magnésio', formulation.electrolytes?.magnesium, { doseUnit: 'mEq' });
        pushRow('Cálcio', formulation.electrolytes?.calcium, { doseUnit: 'mEq' });
        pushRow('Fósforo', formulation.electrolytes?.phosphorus, { doseUnit: 'mmol' });
        pushRow('Oligoelementos', formulation.additives?.oligoelements, { doseKey: 'volume', doseUnit: 'ml' });
        pushRow('Vit. Hidrossolúveis', formulation.additives?.water_soluble_vitamins, { doseKey: 'volume', doseUnit: 'ml' });
        pushRow('Vit. Lipossolúveis', formulation.additives?.fat_soluble_vitamins, { doseKey: 'volume', doseUnit: 'ml' });
        if (formulation.additives?.insulin?.required > 0) {
            pushRow('Insulina', formulation.additives.insulin, { doseUnit: 'UI', volumeDp: 3 });
        }
        if (formulation.additives?.heparin?.required > 0) {
            pushRow('Heparina', formulation.additives.heparin, { doseUnit: 'UI', volumeDp: 3 });
        }
        if (formulation.additives?.carnitine?.required > 0) {
            pushRow('Carnitina', formulation.additives.carnitine, { doseUnit: 'mg' });
        }
        pushRow('Água Estéril', formulation.water, { doseKey: 'volume', doseUnit: 'ml' });

        doc.setFont(PDF_THEME.fonts.family, 'bold');
        doc.setFontSize(PDF_THEME.fonts.section);
        doc.text('Ingredientes da Nutrição Parentérica', margin, y - 2);
        y = this.pdfDrawTable(doc, margin, y, ['Componente', 'Stock/Concentração', 'Dose', 'Volume (ml)', 'Observações'], componentRows, [40, 42, 26, 28, usableWidth - 136]);
        y += 4;

        const properties = [
            ['Volume Total', this.formatValue(formulation.volume, 'ml', 0)],
            ['Osmolaridade', this.formatValue(formulation.osmolarity, 'mOsm/L', 0)],
            ['Energia/kg', weight > 0 ? `${energy.perKg.toFixed(1)} kcal/kg` : '---'],
            ['GIR', energy.GIR ? `${energy.GIR.toFixed(2)} mg/kg/min` : '---'],
            ['Glucose %', energy.glucosePercent ? `${energy.glucosePercent.toFixed(1)}%` : '---'],
            ['Perfusão', `${formulation.infusionHours || 24} h`]
        ];

        const propWidth = (usableWidth - 4) / 2;
        doc.setFont(PDF_THEME.fonts.family, 'bold');
        doc.setFontSize(PDF_THEME.fonts.section);
        doc.text('Propriedades da Administração', margin, y - 2);
        doc.setFont(PDF_THEME.fonts.family, 'normal');
        doc.setFontSize(PDF_THEME.fonts.small);
        let propY = y;
        properties.forEach((row, idx) => {
            const x = margin + (idx % 2) * (propWidth + 4);
            const currentY = propY + Math.floor(idx / 2) * 7;
            doc.rect(x, currentY, propWidth, 7);
            doc.text(`${row[0]}: ${row[1]}`, x + 2, currentY + 4.5);
        });
        y = propY + Math.ceil(properties.length / 2) * 7 + 8;

        if (preparationMap) {
            const ensured = this.pdfEnsureSpace(doc, y, 30);
            y = ensured.y;
            if (ensured.pageAdded) {
                doc.setFont(PDF_THEME.fonts.family, 'bold');
                doc.setFontSize(PDF_THEME.fonts.section);
                doc.text(headerText, margin, y - 4);
            }
            doc.setFont(PDF_THEME.fonts.family, 'bold');
            doc.setFontSize(PDF_THEME.fonts.section);
            doc.text('Mapa de Preparação (Ordem de Aditivos)', margin, y);
            y += 4;
            doc.setFont(PDF_THEME.fonts.family, 'normal');
            doc.setFontSize(PDF_THEME.fonts.small);
            const prepLines = doc.splitTextToSize(preparationMap, usableWidth);
            prepLines.forEach(line => {
                doc.text(line, margin, y);
                y += 4;
            });
        }

        const drawStackedBox = (title, items, color) => {
            if (!items || !items.length) return;
            const ensured = this.pdfEnsureSpace(doc, y, 14 + items.length * 4);
            y = ensured.y;
            if (ensured.pageAdded) {
                doc.setFont(PDF_THEME.fonts.family, 'bold');
                doc.setFontSize(PDF_THEME.fonts.section);
                doc.text(headerText, margin, y - 4);
            }
            doc.setFont(PDF_THEME.fonts.family, 'bold');
            doc.setFontSize(PDF_THEME.fonts.section);
            doc.setFillColor(...color);
            doc.rect(margin, y, usableWidth, 8, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text(title, margin + 2, y + 5);
            y += 10;
            doc.setFont(PDF_THEME.fonts.family, 'normal');
            doc.setFontSize(PDF_THEME.fonts.small);
            items.forEach(msg => {
                doc.text(`• ${msg}`, margin + 2, y, { maxWidth: usableWidth - 4 });
                y += 4;
            });
            y += 2;
        };

        drawStackedBox('Avisos de Formulação', formulation.warnings || [], PDF_THEME.palette.warning);
        drawStackedBox('Erros Críticos', formulation.errors || [], PDF_THEME.palette.error);

        const ensuredSign = this.pdfEnsureSpace(doc, y, 16);
        y = ensuredSign.y;
        if (ensuredSign.pageAdded) {
            doc.setFont(PDF_THEME.fonts.family, 'bold');
            doc.setFontSize(PDF_THEME.fonts.section);
            doc.text(headerText, margin, y - 4);
        }
        doc.setFont(PDF_THEME.fonts.family, 'italic');
        doc.setFontSize(PDF_THEME.fonts.small);
        doc.text('Preparado por: ___________________________', margin, y);
        doc.text('Conferido por: ___________________________', margin + usableWidth / 2, y);
        y += 6;
        doc.text('Data/Hora de Revisão: ___________________________', margin, y);
        y += 6;
        doc.text(`Software NutriSoft · versão local · Hash prescrição: ${formulation.hash || '—'}`, margin, y);
    }


    formatCompositionDetailsForPDF(formulation) {
        const details = [];
        const formatLine = (label, component, valueKey = 'volume', unit = 'ml', dp = 2) => {
             if (!component || component[valueKey] === undefined || component[valueKey] === null || (component[valueKey] === 0 && (label.toLowerCase().includes('volume') || unit ==='ml'))) return null;
             const recommended = component.recommended && valueKey !== 'volume' ? component.recommended : null;
             const recommendedText = (recommended !== null && component[valueKey] !== recommended) ? ` [alvo ${this.formatValue(recommended, unit, dp)}]` : '';
             const extra = component.fromPhosphorus && label.startsWith('Sódio') ? ` (incl. ${this.formatValue(component.fromPhosphorus, 'mEq', dp)} do Fosfato)` : '';
             const solText = component.solution && !label.toLowerCase().includes('volume') ? `(${component.solution})` : '';
             return `- ${label}: ${this.formatValue(component[valueKey], unit, dp)}${recommendedText}${extra} ${solText}`;
        };

        details.push(`- Volume Total Prescrito: ${this.formatValue(formulation.volume, 'ml', 0)}`);
        details.push(`- Via de Administração: ${formulation.route === 'peripheral' ? 'Periférica' : 'Central'}`);
        details.push(`- Osmolaridade Calculada: ${this.formatValue(formulation.osmolarity, 'mOsm/L', 0)}`);
        details.push(''); 

        details.push('-- Macronutrientes --');
        details.push(formatLine('Aminoácidos (total)', formulation.proteins, 'required', 'g'));
        details.push(formatLine('  ↳ Volume AA', formulation.proteins, 'volume', 'ml'));
        if(formulation.glutamine?.volume > 0) {
            details.push(formatLine('Glutamina (Dipeptídeo)', formulation.glutamine, 'required_g_dipeptide', 'g'));
            details.push(formatLine('  ↳ Volume Glutamina', formulation.glutamine, 'volume', 'ml'));
        }
        details.push(formatLine('Glucose (total)', formulation.glucose, 'required', 'g'));
        details.push(formatLine('  ↳ Volume Glucose', formulation.glucose, 'volume', 'ml'));
        details.push(formatLine('Lípidos (total)', formulation.lipids, 'required', 'g'));
        details.push(formatLine('  ↳ Volume Lipídios', formulation.lipids, 'volume', 'ml'));
        details.push('');

        details.push('-- Eletrólitos --');
        Object.entries(formulation.electrolytes ?? {}).forEach(([key, comp]) => {
            const name = key.charAt(0).toUpperCase() + key.slice(1);
            const unit = (key === 'phosphorus') ? 'mmol' : 'mEq';
            const valueKey = key === 'sodium' ? 'displayRequired' : 'required';
            const line1 = formatLine(`${name} (total)`, comp, valueKey, unit);
            if (line1) details.push(line1);
            if (key === 'sodium' && comp.fromPhosphorus) {
                details.push(`   ↳ ${this.formatValue(comp.fromPhosphorus, 'mEq', 2)} do Fosfato`);
            }
            const line2 = formatLine(`  ↳ Volume ${name}`, comp, 'volume', 'ml');
            if (line2) details.push(line2);
        });
        details.push('');

        details.push('-- Aditivos --');
        Object.entries(formulation.additives ?? {}).forEach(([key, comp]) => {
            if (comp.volume > 0 || (comp.required !== undefined && comp.required > 0)) { 
                const name = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                let unit = 'ml'; let valueKey = 'volume';
                if(key === 'insulin' || key === 'heparin') { unit = 'UI'; valueKey = 'required';}
                else if (key === 'carnitine') { unit = 'mg'; valueKey = 'required';}

                const line1 = formatLine(`${name} ${key === 'oligoelements' || key.includes('vitamin') ? '' : '(total)'}`, comp, valueKey, unit);
                if(line1) details.push(line1);

                if (key !== 'oligoelements' && !key.includes('vitamin')) { 
                     const line2 = formatLine(`  ↳ Volume ${name}`, comp, 'volume', 'ml', (key === 'insulin' || key === 'heparin') ? 3 : 2);
                     if(line2) details.push(line2);
                }
            }
        });
        details.push('');
        details.push(formatLine('Água Estéril Adicionada', formulation.water, 'volume', 'ml'));

        return details.filter(line => line !== null).join('\n');
    }
    generateLabelsPage(doc, formulation, prepNum, patientName, prescriptionDate) {
        const template = LABEL_TEMPLATES.main;
        const isTwoBags = (formulation.patient?.weight < 5 && formulation.patient?.condition === 'pediatric') || (formulation.patient?.condition === 'neonate');
        const labels = isTwoBags ? [false, false, true, true] : [false, false, false, false];
        doc.addPage();
        labels.forEach((isLipids, idx) => {
            if (idx > 0 && idx % 4 === 0) doc.addPage();
            const col = idx % 2;
            const row = Math.floor((idx % 4) / 2);
            const x = template.pageMarginX + col * (template.width + template.gapX);
            const y = template.pageMarginY + row * (template.height + template.gapY);
            this.addLabelContent(doc, formulation, x, y, isLipids, prepNum, patientName, prescriptionDate, template);
        });
    }
    addLabelContent(doc, formulation, startX, startY, isLipidsLabel, preparationNumber, patientName, prescriptionDate, template = LABEL_TEMPLATES.main) {
        const padding = template.padding;
        const textStartX = startX + padding;
        const safeWidth = template.safeArea ? template.safeArea.w - 2 : template.width - padding * 2;
        let currentY = startY + padding;
        const lineSpacingLabel = 4;

        doc.setDrawColor(...PDF_THEME.palette.border);
        doc.setLineWidth(0.35);
        doc.rect(startX, startY, template.width, template.height);
        this.pdfDrawSafeArea(doc, template, startX, startY);
        this.pdfCalibrationMarks(doc, template, startX, startY);

        // Header and identity
        doc.setFontSize(9); doc.setFont(PDF_THEME.fonts.family, 'italic');
        doc.text('ULSSM · SG TF', textStartX, currentY); currentY += lineSpacingLabel * 0.9;

        const prepTag = `#Prep: ${preparationNumber}`;
        this.pdfFitText(doc, prepTag, textStartX, currentY, safeWidth, 12, template.minFont, 'bold');
        currentY += lineSpacingLabel * 1.3;

        doc.setFont(PDF_THEME.fonts.family, 'bold');
        this.pdfFitText(doc, `Paciente: ${patientName || 'Doente'}`, textStartX, currentY, safeWidth, 10, template.minFont, 'bold');
        currentY += lineSpacingLabel * 1.05;
        if (formulation.patient?.service) {
            doc.setFontSize(8); doc.setFont(PDF_THEME.fonts.family, 'normal');
            this.pdfFitText(doc, `Serviço: ${formulation.patient.service}`, textStartX, currentY, safeWidth, 8, template.minFont);
            currentY += lineSpacingLabel;
        }

        // Bag summary block
        doc.setFontSize(8); doc.setFont(PDF_THEME.fonts.family, 'bold');
        let bagType = 'BOLSA ÚNICA (3-em-1)';
        if (isLipidsLabel) { bagType = 'BOLSA DE LÍPIDOS (B)'; doc.setTextColor(0,100,0); }
        else if (formulation.patient?.weight < 5 || formulation.patient?.condition === 'neonate') {
            bagType = 'BOLSA AQUOSA (A)'; doc.setTextColor(0,0,139);
        }
        this.pdfFitText(doc, bagType, textStartX, currentY, safeWidth, 9, template.minFont, 'bold');
        doc.setTextColor(0,0,0);
        currentY += lineSpacingLabel;

        doc.setFont(PDF_THEME.fonts.family, 'normal');
        let dDate = 'N/A', dTime = 'N/A';
        try {
            const d = prescriptionDate ? new Date(prescriptionDate) : new Date();
            if(!isNaN(d.getTime())){
                dDate=d.toLocaleDateString();
                dTime=d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            }
        } catch {}
        const summaryLines = [];
        summaryLines.push(`Data Prep.: ${dDate}  Hora: ${dTime}`);
        let bagVol = formulation.volume;
        if (formulation.patient?.weight < 5 || formulation.patient?.condition === 'neonate') {
            const lipidVol = (formulation.lipids?.volume??0) + (formulation.additives?.fat_soluble_vitamins?.volume??0);
            bagVol = isLipidsLabel ? lipidVol : formulation.volume - lipidVol;
        }
        summaryLines.push(`Volume: ${this.formatValue(bagVol, 'ml', 0)} · Via: ${formulation.administrationRoute || 'N/D'}`);
        const infusion = formulation.infusionRate ? `${formulation.infusionRate.toFixed(0)} ml/h` : 'N/D';
        const osm = Number.isFinite(formulation.osmolarity) ? `${formulation.osmolarity.toFixed(0)} mOsm/L` : 'Estimado';
        summaryLines.push(`Infusão: ${infusion} · Osm: ${osm}`);
        const totalEnergy = formulation.energy?.total;
        if (Number.isFinite(totalEnergy) && totalEnergy > 0) summaryLines.push(`Energia: ${totalEnergy.toFixed(0)} kcal`);
        summaryLines.push('Estabilidade até: ____ às ____h');
        summaryLines.push('Conservar 2–8°C · Proteger da luz · Uso IV');
        summaryLines.forEach(line => { doc.text(line, textStartX, currentY); currentY += lineSpacingLabel; });
        doc.text('Escala de impressão: 100% (sem fit-to-page)', textStartX, currentY); currentY += lineSpacingLabel;

        // Composition table (compact and deterministic)
        doc.setFontSize(7); doc.setFont(PDF_THEME.fonts.family, 'bold');
        const col1 = textStartX, col2 = textStartX + 18, col3 = textStartX + 44, col4 = startX + template.width - padding;
        doc.text('Comp', col1, currentY);
        doc.text('Dose', col2, currentY);
        doc.text('Solução', col3, currentY);
        doc.text('Vol', col4, currentY, {align:'right'}); currentY += lineSpacingLabel;
        doc.setFont(PDF_THEME.fonts.family,'normal');

        const maxY = startY + template.height - padding;
        const tableRows = [
            ['AA', this.formatValue(formulation.proteins?.required,'g',0), formulation.proteins?.solution||'', this.formatValue(formulation.proteins?.volume,'ml',0)],
            ['Glu', this.formatValue(formulation.glucose?.required,'g',0), formulation.glucose?.solution||'', this.formatValue(formulation.glucose?.volume,'ml',0)],
            ['Líp', this.formatValue(formulation.lipids?.required,'g',0), formulation.lipids?.solution||'', this.formatValue(formulation.lipids?.volume,'ml',0)],
            ['Na', this.formatValue(formulation.electrolytes?.sodium?.displayRequired,'mEq',0), formulation.electrolytes?.sodium?.solution||'', this.formatValue(formulation.electrolytes?.sodium?.volume,'ml',0)],
            ['K', this.formatValue(formulation.electrolytes?.potassium?.required,'mEq',0), formulation.electrolytes?.potassium?.solution||'', this.formatValue(formulation.electrolytes?.potassium?.volume,'ml',0)],
            ['Ca', this.formatValue(formulation.electrolytes?.calcium?.required,'mEq',0), formulation.electrolytes?.calcium?.solution||'', this.formatValue(formulation.electrolytes?.calcium?.volume,'ml',0)],
            ['Mg', this.formatValue(formulation.electrolytes?.magnesium?.required,'mEq',0), formulation.electrolytes?.magnesium?.solution||'', this.formatValue(formulation.electrolytes?.magnesium?.volume,'ml',0)],
            ['P', this.formatValue(formulation.electrolytes?.phosphorus?.required,'mmol',0), formulation.electrolytes?.phosphorus?.solution||'', this.formatValue(formulation.electrolytes?.phosphorus?.volume,'ml',0)]
        ];

        for (const r of tableRows) {
            if (currentY + lineSpacingLabel > maxY) {
                doc.setFontSize(7); doc.setFont(PDF_THEME.fonts.family, 'italic');
                doc.text('… ver detalhes no mapa de preparação/PDF completo', textStartX, maxY - 1);
                break;
            }
            this.pdfFitText(doc, r[0], col1, currentY, 12, 7, template.minFont);
            this.pdfFitText(doc, r[1], col2, currentY, 20, 7, template.minFont);
            const solutionLines = doc.splitTextToSize(r[2], safeWidth - 36);
            doc.text(solutionLines, col3, currentY, { maxWidth: safeWidth - 36 });
            doc.text(r[3], col4, currentY, {align:'right'});
            currentY += Math.max(lineSpacingLabel, solutionLines.length * 3.2);
        }

        doc.setFontSize(7); doc.setFont(PDF_THEME.fonts.family, 'italic');
        doc.text('Ass. Preparador: _________   Ass. Revisor: _________', textStartX, currentY); currentY += lineSpacingLabel;
        doc.text('Vigiar sítio de punção e parâmetros metabólicos.', textStartX, currentY);
        doc.rect(startX + template.width - padding - 20, startY + template.height - padding - 15, 18, 13);
        doc.text('[QR/BC]', startX + template.width - padding - 18, startY + template.height - padding - 5, {align: 'left'});
    }
    showAuditLogsModal() { 
        const modal = document.getElementById('audit-logs-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; 
        } else {
            console.warn("showAuditLogsModal: audit-logs-modal not found.");
        }
    }
    hideAuditLogsModal() { 
        const modal = document.getElementById('audit-logs-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; 
        }
    }
    renderAuditLogs() { 
        const tbody = document.getElementById('audit-logs-list');
        if (!tbody) {
            console.warn("renderAuditLogs: audit-logs-list tbody not found.");
            return;
        }
        const noResultsRowTemplate = tbody.querySelector('.no-results-row');
        tbody.innerHTML = '';
        if(noResultsRowTemplate) tbody.appendChild(noResultsRowTemplate.cloneNode(true));

        const noResultsRow = tbody.querySelector('.no-results-row');
        const logs = this.dataManager.getAuditLogs().reverse(); 

        if (logs.length === 0) {
            noResultsRow?.classList.remove('hidden');
            return;
        }
        noResultsRow?.classList.add('hidden');

        logs.forEach(log => {
            const row = tbody.insertRow(tbody.rows.length - (noResultsRow ? 1 : 0));
            row.classList.add('hover:bg-gray-50');
            let detailsText = '';
            try {
                detailsText = JSON.stringify(log.details);
                if (detailsText.length > 150) detailsText = detailsText.substring(0, 147) + '...';
            } catch {
                detailsText = '[Erro ao serializar detalhes]';
            }
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.user || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${log.action || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500 break-all max-w-xs" title="${JSON.stringify(log.details, null, 2)}">${detailsText}</td>`;
        });
    }

    getPerformanceStats() {
        const logs = this.dataManager.getAuditLogs() || [];
        const currentUser = this.dataManager.getUserName();
        const stats = {
            addedPatients: 0,
            editedPatients: 0,
            deletedPatients: 0,
            newPrescriptions: 0,
            editedPrescriptions: 0,
            deletedPrescriptions: 0
        };

        logs.forEach(log => {
            if (log.user !== currentUser) return;
            switch (log.action) {
                case 'addPatient': stats.addedPatients++; break;
                case 'editPatient': stats.editedPatients++; break;
                case 'deletePatient': stats.deletedPatients++; break;
                case 'savePrescriptionNew': stats.newPrescriptions++; break;
                case 'editPrescriptionSaved': stats.editedPrescriptions++; break;
                case 'deletePrescriptionConfirmed': stats.deletedPrescriptions++; break;
            }
        });

        return stats;
    }

    renderPerformanceStats() {
        const container = document.getElementById('performance-stats');
        if (!container) {
            console.warn('renderPerformanceStats: performance-stats container not found.');
            return;
        }
        const stats = this.getPerformanceStats();
        container.innerHTML = `
            <p><strong>Doentes Adicionados:</strong> ${stats.addedPatients}</p>
            <p><strong>Doentes Editados:</strong> ${stats.editedPatients}</p>
            <p><strong>Doentes Excluídos:</strong> ${stats.deletedPatients}</p>
            <p><strong>Prescrições Novas:</strong> ${stats.newPrescriptions}</p>
            <p><strong>Prescrições Editadas:</strong> ${stats.editedPrescriptions}</p>
            <p><strong>Prescrições Excluídas:</strong> ${stats.deletedPrescriptions}</p>
        `;
    }
    editSolution(solutionName = null) {
        console.log(`NutriSoft.editSolution: Opening solution form. Editing: ${solutionName || 'New Solution'}`);
        const isEditing = !!solutionName;
        const solution = isEditing ? (this.solutions[solutionName] || {}) : {};

        this.clearSolutionForm(false); 
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = isEditing ? `Editar Solução: ${solutionName}` : 'Adicionar Nova Solução';

        this.setInputValue('solution-name', solutionName || '');
        document.getElementById('solution-name').disabled = false;

        this.setInputValue('solution-type', solution.type || '');
        this.setInputValue('osmolarity-contribution', solution.osmolarityContribution ?? '');

        this.setInputValue('nitrogen-concentration', solution.nitrogen_concentration ?? '');
        this.setInputValue('protein-concentration', solution.protein_concentration ?? '');
        this.setInputValue('glutamine-concentration', solution.glutamine_concentration ?? '');
        this.setInputValue('nitrogen-concentration-glutamine', solution.type === 'glutamine' ? (solution.nitrogen_concentration ?? '') : '');
        this.setInputValue('glucose-concentration', solution.glucose_concentration ?? '');
        this.setInputValue('lipid-concentration', solution.lipid_concentration ?? '');
        this.setInputValue('sodium-concentration', solution.sodium_concentration ?? '');
        this.setInputValue('potassium-concentration', solution.potassium_concentration ?? '');
        this.setInputValue('magnesium-concentration', solution.magnesium_concentration ?? '');
        this.setInputValue('calcium-concentration', solution.calcium_concentration ?? '');
        this.setInputValue('phosphorus-concentration', solution.phosphorus_concentration ?? '');
        this.setInputValue('insulin-concentration', solution.insulin_concentration ?? '');
        this.setInputValue('heparin-concentration', solution.heparin_concentration ?? '');
        this.setInputValue('carnitine-concentration', solution.carnitine_concentration ?? '');

        const originalNameField = document.getElementById('original-solution-name');
        if (originalNameField) originalNameField.value = solutionName || '';

        this.updateSolutionFormFieldsVisibility(solution.type || ''); 
        document.getElementById('solution-form-modal')?.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 

        AuditLogger.log(isEditing ? 'editSolutionFormOpened' : 'addSolutionFormOpened', { solutionName: solutionName });
    }
    updateSolutionFormFieldsVisibility(solutionType) { 
        document.querySelectorAll('#concentration-fields > div[id$="-fields"]').forEach(groupDiv => {
            groupDiv.classList.add('hidden'); 
        });

        if (solutionType) {
            const groupToShow = document.getElementById(`${solutionType}-fields`);
            if (groupToShow) {
                groupToShow.classList.remove('hidden'); 
            } 
        }
    }
    saveSolution() { 
        console.log("NutriSoft.saveSolution: Attempting to save solution.");
        if (!this.validateInputs('solution')) {
             console.log("NutriSoft.saveSolution: Solution validation failed.");
             return;
        }

        const originalNameInput = document.getElementById('original-solution-name');
        const originalName = originalNameInput?.value || null; 
        const newNameInput = document.getElementById('solution-name');
        const newName = newNameInput?.value.trim();
        const solutionType = document.getElementById('solution-type')?.value;

        if (!newName) { 
             this.showErrorMessage(newNameInput, 'Nome da solução não pode ser vazio.'); return;
        }

        const isEditing = !!originalName;
        if ((!isEditing && this.solutions[newName]) || (isEditing && originalName !== newName && this.solutions[newName])) {
             this.showErrorMessage(newNameInput, `O nome de solução '${newName}' já existe.`); return;
        } else {
            if(newNameInput) this.hideErrorMessage(newNameInput);
        }

        let solutionDetails = {
            type: solutionType,
            osmolarityContribution: this.getNumericInput('osmolarity-contribution', NaN) 
        };
        if (isNaN(solutionDetails.osmolarityContribution)) solutionDetails.osmolarityContribution = null;


        const addConc = (key, elementId) => {
            const value = this.getNumericInput(elementId, NaN); 
            if (!isNaN(value)) { 
                solutionDetails[key] = value;
            } else {
                solutionDetails[key] = null; 
            }
        };

        switch (solutionType) {
            case 'aminoacid': addConc('nitrogen_concentration', 'nitrogen-concentration'); addConc('protein_concentration', 'protein-concentration'); break;
            case 'glutamine': addConc('glutamine_concentration', 'glutamine-concentration'); addConc('nitrogen_concentration', 'nitrogen-concentration-glutamine'); break; 
            case 'glucose': addConc('glucose_concentration', 'glucose-concentration'); break;
            case 'lipid': addConc('lipid_concentration', 'lipid-concentration'); break;
            case 'electrolyte':
                ['sodium', 'potassium', 'magnesium', 'calcium', 'phosphorus'].forEach(el => {
                    addConc(`${el}_concentration`, `${el}-concentration`);
                });
                break;
            case 'insulin': addConc('insulin_concentration', 'insulin-concentration'); break;
            case 'heparin': addConc('heparin_concentration', 'heparin-concentration'); break;
            case 'carnitine': addConc('carnitine_concentration', 'carnitine-concentration'); break;
        }

        let solutionsUpdate = { ...this.solutions };
        let logAction = '';
        let userFeedback = '';
        let logDetails = { newName, details: solutionDetails };

        if (isEditing) {
            if (originalName && originalName !== newName && solutionsUpdate[originalName]) {
                delete solutionsUpdate[originalName]; 
                logDetails.oldName = originalName;
            }
            solutionsUpdate[newName] = solutionDetails;
            logAction = 'editSolutionSaved';
            userFeedback = `Solução "${newName}" atualizada com sucesso!`;
        } else {
            solutionsUpdate[newName] = solutionDetails;
            logAction = 'addSolutionSaved';
            userFeedback = `Solução "${newName}" adicionada com sucesso!`;
        }
        this.solutions = solutionsUpdate; 
        this.dataManager.saveSolutions(this.solutions); 

        AuditLogger.log(logAction, logDetails);
        this.dataManager.displayNotification(userFeedback, 'success');
        this.renderSolutions(); 
        this.clearSolutionForm(true); 
        console.log(`NutriSoft.saveSolution: Solution ${logAction} successful for:`, newName);
    }
    deleteSolution(solutionName) { 
        if (!this.solutions[solutionName]) {
            this.dataManager.displayNotification('Solução não encontrada para exclusão.', 'warning');
            return;
        }
        if (confirm(`Tem a certeza que deseja excluir a solução "${solutionName}"? Esta ação não pode ser desfeita.`)) {
            console.log(`NutriSoft.deleteSolution: Deleting solution: ${solutionName}`);
            let solutionsUpdate = { ...this.solutions };
            delete solutionsUpdate[solutionName];
            this.solutions = solutionsUpdate; 
            this.dataManager.saveSolutions(this.solutions); 

            AuditLogger.log('deleteSolutionConfirmed', { solutionName });
            this.dataManager.displayNotification(`Solução "${solutionName}" excluída com sucesso!`, 'success');
            this.renderSolutions(); 
        } else {
            AuditLogger.log('deleteSolutionCancelled', { solutionName });
            console.log(`NutriSoft.deleteSolution: Deletion of solution ${solutionName} cancelled by user.`);
        }
    }
    clearSolutionForm(hideModal = true) { 
        console.log("NutriSoft.clearSolutionForm: Clearing solution form. Hide modal:", hideModal);
        const form = document.getElementById('solution-form');
        if (form) {
            form.reset(); 
            form.querySelectorAll('.input-field').forEach(input => {
                this.hideErrorMessage(input); 
            });
        }

        const solutionNameField = document.getElementById('solution-name');
        if (solutionNameField) solutionNameField.disabled = false;

        this.updateSolutionFormFieldsVisibility(''); 

        const originalNameField = document.getElementById('original-solution-name');
        if (originalNameField) originalNameField.value = '';

        if (hideModal) {
            const modal = document.getElementById('solution-form-modal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = ''; 
            AuditLogger.log('clearSolutionFormAndModal');
        } 
    }
} 


// --- Application Initialization --- //
let app; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    try {
        app = new NutriSoft();
        app.init();
        console.log("NutriSoft application instance created and initialized successfully.");

        if (!window.location.hash || window.location.hash === "#") {
            console.log("Initial hash is empty or '#', forcing to #patients for robust startup.");
            window.location.hash = 'patients';
        }

    } catch (error) {
        console.error("FATAL: Error initializing NutriSoft application:", error);
        const body = document.body;
        if (body) {
            let errorHtml = '<div style="padding: 20px; text-align: center; color: red; font-family: sans-serif; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999;">';
            errorHtml += '<h1>Erro Crítico na Aplicação NutriSoft</h1>';
            errorHtml += '<p>Ocorreu um erro grave que impede o funcionamento da aplicação.</p>';
            if (error && error.message) {
                 const sanitizedMessage = String(error.message).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                 errorHtml += '<p style="font-size: 0.9em; color: #555;">Detalhe: ' + sanitizedMessage + '</p>';
            }
             errorHtml += '<p style="margin-top: 1em;">Por favor, tente <button onclick="window.location.reload()" style="padding:8px 15px; background-color:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; font-size: 1em;">Recarregar a Aplicação</button>.</p>';
            errorHtml += '</div>';
            body.innerHTML = errorHtml;
        }
    }
});