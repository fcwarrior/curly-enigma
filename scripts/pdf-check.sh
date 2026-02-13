#!/usr/bin/env bash
set -euo pipefail

echo "[pdf:check] Syntax check"
node -c script.js >/dev/null

echo "[pdf:check] Checking reference artifacts"
for f in \
  examples/outputs/adult_example.pdf \
  examples/outputs/lipid_split_example.pdf \
  examples/outputs/pediatria_high_electrolytes.pdf
  do
  if [[ ! -s "$f" ]]; then
    echo "Missing or empty artifact: $f" >&2
    exit 1
  fi
done

echo "[pdf:check] Validating deterministic template geometry"
node <<'NODE'
const fs = require('fs');
const txt = fs.readFileSync('script.js', 'utf8');
const required = [
  'unit: \'mm\'',
  'safeArea',
  'PROTEGER',
  'DA LUZ',
  'generateLabelsPage',
  'pdfDrawTable'
];
for (const token of required) {
  if (!txt.includes(token)) {
    throw new Error(`Missing token: ${token}`);
  }
}
console.log('geometry tokens ok');
NODE

echo "[pdf:check] OK"
