# Plano de Migração Arquitetural (Faseado)

## Objetivo
Separar domínio clínico, aplicação, infraestrutura e UI sem regressões clínicas.

## Fase 1 (nesta entrega)
- Extração de utilitários numéricos para `src/shared/utils/number.js`.
- Extração de guidelines para `src/domain/calculations/guideline.service.js`.
- Introdução de motor clínico puro inicial para validações/GIR em `src/domain/calculations/clinical-validation.engine.js`.
- Introdução de contratos tipados (JSDoc) em `src/domain/types/contracts.js`.
- Ligação não disruptiva ao `script.js` via módulos globais, com fallback para implementação legacy.
- Testes de regressão iniciais em `tests/regression/clinical-engine.test.js`.

## Fase 2
- Extrair formulação/osmolaridade/compatibilidade para módulos puros completos.
- Congelar fixtures clínicas (adulto, renal, hepático, crítico, pediátrico, neonato).

## Fase 3
- Extrair DataManager para `infrastructure/storage/*` (adapters localStorage/IndexedDB + backup service).

## Fase 4
- Extrair PDF map/label para `infrastructure/pdf/*` preservando layout e tokens.

## Fase 5
- Dividir UI por secções em `ui/sections/*` e `ui/dom/*`.

## Fase 6
- Testes de regressão ponta-a-ponta (navegação, persistência, produção, impressão).
