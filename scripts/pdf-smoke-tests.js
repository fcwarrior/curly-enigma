#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  setTimeout,
  clearTimeout,
  window: { location: { search: '' } },
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    addEventListener: () => {},
    createElement: (tag) => {
      if (tag !== 'canvas') return {};
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '#000',
          strokeStyle: '#000',
          lineWidth: 1,
          fillRect: () => {},
          strokeRect: () => {},
          fillText: () => {}
        }),
        toDataURL: () => 'data:image/png;base64,AA=='
      };
    }
  },
  Image: class {
    set src(_v) { setTimeout(() => this.onerror && this.onerror(new Error('no image')), 0); }
  },
  URLSearchParams,
  confirm: () => true,
  AuditLogger: { log: () => {} }
};
vm.createContext(context);
const source = fs.readFileSync('script.js', 'utf8');
vm.runInContext(source, context);

const NutriSoft = vm.runInContext('NutriSoft', context);
const app = Object.create(NutriSoft.prototype);
app.settings = { clinicalValidation: {}, osmolarityLimits: { peripheral: 900, central: 1500 } };
app.solutions = {};
app.formatValue = NutriSoft.prototype.formatValue;
app.generateInstructionLine = NutriSoft.prototype.generateInstructionLine;
app.generateSingleBagInstructions = NutriSoft.prototype.generateSingleBagInstructions;
app.generateBagAInstructions = NutriSoft.prototype.generateBagAInstructions;
app.generateBagBInstructions = NutriSoft.prototype.generateBagBInstructions;
app.generatePreparationMap = NutriSoft.prototype.generatePreparationMap;
app.buildLabelPayload = NutriSoft.prototype.buildLabelPayload;
app.validatePdfPayload = NutriSoft.prototype.validatePdfPayload;
app.validateSelectedLots = NutriSoft.prototype.validateSelectedLots;
app.computeLotStatus = NutriSoft.prototype.computeLotStatus;
app.isLotNearExpiry = NutriSoft.prototype.isLotNearExpiry;
app.normalizeFormulationRoutes = NutriSoft.prototype.normalizeFormulationRoutes;

const fullFormulation = {
  volume: 1500,
  route: 'central',
  administrationRoute: 'Central',
  infusionRate: 62.5,
  osmolarity: 1100,
  patient: { id: 1, name: 'João', weight: 70, condition: 'adult', service: 'Cirurgia' },
  proteins: { required: 85, volume: 850, solution: 'AA' },
  glucose: { required: 180, volume: 360, solution: 'G50' },
  lipids: { required: 55, volume: 275, solution: 'L20' },
  electrolytes: {
    sodium: { displayRequired: 80, required: 80, volume: 10, solution: 'NaCl' },
    potassium: { required: 40, volume: 8, solution: 'KCl' },
    calcium: { required: 10, volume: 5, solution: 'Ca' },
    magnesium: { required: 8, volume: 4, solution: 'Mg' },
    phosphorus: { required: 12, volume: 6, solution: 'Phos' }
  },
  additives: { water_soluble_vitamins: { volume: 10 }, fat_soluble_vitamins: { volume: 5 } },
  water: { volume: 0 },
  energy: { total: 2200 }
};

const v1 = app.validatePdfPayload(fullFormulation, 'MAPA TESTE', '123');
assert(v1.ok, 'Schema completo deveria ser válido');

const v2 = app.validatePdfPayload({ patient: null }, '', '');
assert(!v2.ok && v2.issues.length >= 2, 'Schema incompleto deveria falhar');

const map = app.generatePreparationMap(fullFormulation);
assert(typeof map === 'string' && map.includes('BOLSA'), 'Mapa de preparação inválido');


const lotFormulation = { warnings: [], errors: [], preparationMeta: { componentLots: { proteins: { lotNumber: 'L1', expiry: '2000-01-01' } } } };
app.validateSelectedLots(lotFormulation);
assert(lotFormulation.errors.length > 0, 'Lotes expirados devem bloquear preparação');

const routeFormulation = { route: 'Periférica', administrationRoute: 'Central' };
app.normalizeFormulationRoutes(routeFormulation);
assert(routeFormulation.route === 'peripheral' && routeFormulation.administrationRoute === 'peripheral', 'Normalização de via falhou');

const label = app.buildLabelPayload(fullFormulation, '123', 'João', '2026-01-15T00:00:00Z');
assert(label.prep === '123', 'Label payload prep inválido');
assert(label.patient === 'João', 'Label payload doente inválido');
assert(label.volume.includes('ml'), 'Label payload volume inválido');

console.log('PDF smoke tests: OK');
