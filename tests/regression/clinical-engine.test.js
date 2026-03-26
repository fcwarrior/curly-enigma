const test = require('node:test');
const assert = require('node:assert/strict');

require('../../src/shared/utils/number.js');
require('../../src/domain/calculations/clinical-validation.engine.js');
require('../../src/domain/calculations/guideline.service.js');

const number = globalThis.NutriSoftSharedNumber;
const engine = globalThis.NutriSoftClinicalEngine;
const guideline = globalThis.NutriSoftGuidelineService;

test('number parsing never leaks NaN', () => {
  assert.equal(number.parseNum('10,5'), 10.5);
  assert.equal(number.parseNum('x', 7), 7);
  assert.equal(number.roundVolume(-1), 0);
  assert.equal(number.isValidNumericInput('12.3'), true);
  assert.equal(number.isValidNumericInput('abc'), false);
});

test('guideline defaults are deterministic', () => {
  assert.equal(guideline.DEFAULT_GUIDELINE_ID, 'adult');
  assert.equal(guideline.midpoint([1, 3]), 2);
  assert.equal(guideline.GUIDELINE_TABLES.pediatric.label, 'Pediátrico');
});

test('clinical engine computes GIR and risk thresholds', () => {
  const gir = engine.calculateGIR({ glucoseG: 200, weightKg: 70, infusionHours: 24 });
  assert.ok(gir > 1 && gir < 2.5);

  const risk = engine.calculateCaPhosRisk({ calciumMEq: 10, phosphorusMmol: 20, volumeMl: 2000 });
  assert.ok(Number.isFinite(risk.product));

  const result = engine.validateClinicalThresholds(
    { glucoseG: 300, weightKg: 50, infusionHours: 12, calciumMEq: 20, phosphorusMmol: 20, volumeMl: 1000, osmolarity: 980, peripheralLimit: 900 },
    {
      gir: { warning: 4, highWarning: 5 },
      caPhos: { warning: 250, hard: 350 },
      peripheralOsmAlertRatio: 1
    }
  );

  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
  assert.ok(Number.isFinite(result.derived.gir));
  assert.ok(Number.isFinite(result.derived.caPhos));
  assert.ok(Number.isFinite(result.derived.osmRatio));
});
