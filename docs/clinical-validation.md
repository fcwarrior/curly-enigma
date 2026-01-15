# Validação Clínica (NutriSoft)

## Objetivo
Listar regras clínicas atuais de validação e onde são aplicadas, para auditoria e manutenção.

## Regras implementadas (resumo)
- **Compatibilidade Ca/P**: avisos e erros baseados na soma `[Ca mEq/L + P mmol/L]`.
- **Osmolaridade**: cálculo e comparação com limites por via de administração (periférica/central).
- **Limites por condição clínica**: avisos para insuficiência renal/hepática e doente crítico.
- **Volume total**: validação contra somatório de volumes com aviso/erro quando excedido.

## Observações
- As regras utilizam settings internos e são registadas em `formulation.warnings` e `formulation.errors`.
- O output PDF lista avisos e erros na “Ficha de Preparação Farmacêutica”.

## Próximos passos sugeridos
- Parametrizar limites e regras num ficheiro externo (JSON) com versionamento.
- Incluir regras adicionais por protocolo institucional.
