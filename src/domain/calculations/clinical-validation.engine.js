(function (global) {
  'use strict';

  const num = global.NutriSoftSharedNumber || { parseNum: (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d) };

  function calculateGIR({ glucoseG = 0, weightKg = 0, infusionHours = 24 }) {
    const g = num.parseNum(glucoseG, 0);
    const w = Math.max(num.parseNum(weightKg, 0), 0);
    const h = Math.max(num.parseNum(infusionHours, 0), 0);
    if (!w || !h) return 0;
    return (g * 1000) / (w * h * 60);
  }

  function calculateCaPhosRisk({ calciumMEq = 0, phosphorusMmol = 0, volumeMl = 0 }) {
    const calcium = num.parseNum(calciumMEq, 0);
    const phosphorus = num.parseNum(phosphorusMmol, 0);
    const volume = Math.max(num.parseNum(volumeMl, 0), 1);
    const product = (calcium * phosphorus) / (volume / 1000);
    return { product, riskScore: product };
  }

  function calculatePeripheralOsmRatio({ osmolarity = 0, peripheralLimit = 900 }) {
    const osm = num.parseNum(osmolarity, 0);
    const limit = Math.max(num.parseNum(peripheralLimit, 900), 1);
    return osm / limit;
  }

  function validateClinicalThresholds(input, thresholds) {
    const warnings = [];
    const errors = [];
    const gir = calculateGIR(input);
    const caPhos = calculateCaPhosRisk(input).riskScore;
    const osmRatio = calculatePeripheralOsmRatio({ osmolarity: input.osmolarity, peripheralLimit: input.peripheralLimit });

    if (gir >= thresholds.gir.highWarning) errors.push(`GIR elevado (${gir.toFixed(2)} mg/kg/min).`);
    else if (gir >= thresholds.gir.warning) warnings.push(`GIR acima do recomendado (${gir.toFixed(2)} mg/kg/min).`);

    if (caPhos >= thresholds.caPhos.hard) errors.push(`Produto Ca/P crítico (${caPhos.toFixed(1)}).`);
    else if (caPhos >= thresholds.caPhos.warning) warnings.push(`Produto Ca/P elevado (${caPhos.toFixed(1)}).`);

    if (osmRatio >= thresholds.peripheralOsmAlertRatio) warnings.push('Osmolaridade próxima/acima do limite periférico.');

    return { warnings, errors, derived: { gir, caPhos, osmRatio } };
  }

  global.NutriSoftClinicalEngine = {
    calculateGIR,
    calculateCaPhosRisk,
    calculatePeripheralOsmRatio,
    validateClinicalThresholds
  };
})(typeof window !== 'undefined' ? window : globalThis);
