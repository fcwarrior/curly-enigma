(function (global) {
  'use strict';

  const GUIDELINE_TABLES = {
    adult: { label: 'Adulto', protein_g_per_kg: [1.0, 1.3], glucose_mg_kg_min: [3, 4.5], lipid_g_per_kg: [0.7, 1.0], sodium_mEq_per_kg: [1.0, 2.0], potassium_mEq_per_kg: [0.8, 1.2], magnesium_mEq_per_kg: [0.1, 0.2], calcium_mEq_per_kg: [0.05, 0.2], phosphorus_mmol_per_kg: [0.3, 0.6] },
    renal: { label: 'Insuficiência Renal', protein_g_per_kg: [0.8, 1.2], glucose_mg_kg_min: [3, 4], lipid_g_per_kg: [0.7, 1.0], sodium_mEq_per_kg: [0.5, 1.0], potassium_mEq_per_kg: [0.5, 1.0], magnesium_mEq_per_kg: [0.05, 0.1], calcium_mEq_per_kg: [0.05, 0.12], phosphorus_mmol_per_kg: [0.2, 0.4] },
    hepatic: { label: 'Insuficiência Hepática', protein_g_per_kg: [1.2, 1.5], glucose_mg_kg_min: [3, 4.5], lipid_g_per_kg: [0.7, 1.0], sodium_mEq_per_kg: [1.0, 1.5], potassium_mEq_per_kg: [0.7, 1.0], magnesium_mEq_per_kg: [0.1, 0.2], calcium_mEq_per_kg: [0.05, 0.15], phosphorus_mmol_per_kg: [0.3, 0.5] },
    critical: { label: 'Doente Crítico', protein_g_per_kg: [1.5, 2.0], glucose_mg_kg_min: [4, 5.5], lipid_g_per_kg: [1.0, 1.5], sodium_mEq_per_kg: [1.0, 2.0], potassium_mEq_per_kg: [1.0, 1.5], magnesium_mEq_per_kg: [0.15, 0.25], calcium_mEq_per_kg: [0.08, 0.2], phosphorus_mmol_per_kg: [0.4, 0.7] },
    pediatric: { label: 'Pediátrico', protein_g_per_kg: [1.5, 2.5], glucose_mg_kg_min: [4, 6], lipid_g_per_kg: [1.5, 2.5], sodium_mEq_per_kg: [2.0, 4.0], potassium_mEq_per_kg: [1.5, 3.0], magnesium_mEq_per_kg: [0.2, 0.3], calcium_mEq_per_kg: [0.2, 0.35], phosphorus_mmol_per_kg: [0.7, 1.2] },
    neonate: { label: 'Neonato', protein_g_per_kg: [2.5, 3.5], glucose_mg_kg_min: [5, 8], lipid_g_per_kg: [2.0, 3.0], sodium_mEq_per_kg: [2.0, 4.0], potassium_mEq_per_kg: [1.5, 3.0], magnesium_mEq_per_kg: [0.3, 0.4], calcium_mEq_per_kg: [0.25, 0.45], phosphorus_mmol_per_kg: [1.0, 1.5] }
  };

  const DEFAULT_GUIDELINE_ID = 'adult';

  function midpoint(range = []) {
    if (!Array.isArray(range) || range.length === 0) return 0;
    if (range.length === 1) return range[0];
    return (range[0] + range[range.length - 1]) / 2;
  }

  global.NutriSoftGuidelineService = { GUIDELINE_TABLES, DEFAULT_GUIDELINE_ID, midpoint };
})(typeof window !== 'undefined' ? window : globalThis);
