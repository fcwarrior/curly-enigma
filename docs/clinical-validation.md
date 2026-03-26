# Validação Clínica (NutriSoft)

## Objetivo
Definir as validações clínicas usadas no motor de cálculo/segurança e os respetivos limites configuráveis.

## Limites configuráveis (`settings.clinicalValidation`)
- `protein.warning` / `protein.highWarning` (g/kg)
- `lipid.warning` / `lipid.highWarning` (g/kg)
- `gir.warning` / `gir.highWarning` (mg/kg/min)
- `caPhos.warning` / `caPhos.hard` ([Ca mEq/L + P mmol/L])
- `peripheralOsmAlertRatio` (fração do limite periférico para aviso antecipado)

Estes limites são inicializados em `DataManager.getSettings()` e podem ser ajustados no objeto de settings local.

## Regras ativas
1. **Macronutrientes por peso**
   - Proteína e lípidos acima de limiares emitem avisos graduados.
2. **GIR**
   - Aviso/alto aviso para GIR fora de intervalo em adultos não críticos.
3. **Compatibilidade Ca/P**
   - Aviso e erro crítico pela soma final de concentrações.
4. **Osmolaridade por via**
   - Erro quando ultrapassa limite da via selecionada.
   - Aviso antecipado para via periférica com margem configurável.
5. **Diretrizes clínicas por condição**
   - Regras adicionais renal/hepática/pediátrica/crítico via `applyClinicalGuidelines`.

## Notas de segurança
- Avisos e erros são registados em `formulation.warnings` e `formulation.errors`.
- Os mesmos alertas são impressos no worksheet, reforçando validação farmacêutica.
