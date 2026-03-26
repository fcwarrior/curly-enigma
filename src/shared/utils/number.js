(function (global) {
  'use strict';

  function normalizeNumberString(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/\s+/g, '').replace(',', '.');
  }

  function parseNum(value, defaultValue = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const normalized = normalizeNumberString(value);
    if (normalized === '') return defaultValue;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  function isValidNumericInput(value) {
    const normalized = normalizeNumberString(value);
    if (normalized === '') return false;
    return Number.isFinite(Number(normalized));
  }

  function roundVolume(value, decimalPlaces = 1) {
    const parsed = parseNum(value, 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(parsed * factor) / factor;
  }

  global.NutriSoftSharedNumber = {
    normalizeNumberString,
    parseNum,
    isValidNumericInput,
    roundVolume
  };
})(typeof window !== 'undefined' ? window : globalThis);
