# Layout PDF (NutriSoft)

## Diagnóstico da causa raiz
Os cortes/sobreposições observados nos rótulos vinham de uma combinação de:
- excesso de texto em etiquetas de 90x50 mm sem reserva rígida de rodapé/QR;
- alturas de linha parcialmente fixas em vez de derivadas da fonte;
- blocos de resumo + tabela a competir pelo mesmo espaço útil;
- variação de impressão quando o utilizador aplicava *fit-to-page*.

## Estratégia aplicada (determinística)
- Motor mantido em **jsPDF nativo** (sem HTML->PDF).
- Unidade global em **mm** (`new jsPDF({ unit: 'mm' })`).
- Templates em `LABEL_TEMPLATES` com **safe area explícita**.
- Blocos com dimensões fixas e hierarquia estável (header, meta, tabela, banda lateral, rodapé, QR).

## Etiquetas principais (90 × 50 mm, 4-up em A4)
- Dimensão do rótulo: `90 x 50 mm`.
- Safe area: `86 x 46 mm` (offset 2 mm).
- Banda lateral fixa: `16 mm` (texto vertical “PROTEGER DA LUZ”).
- Caixa QR/BC fixa: `17 x 12 mm`.
- Rodapé reservado para assinaturas e conservação.

## Regras de overflow
- Texto crítico passa por `pdfFitText` com mínimo de fonte controlado.
- Linhas de metadados usam `lineHeight(fontSize)` para evitar sobreposição.
- Quadro nutricional só desenha se houver altura útil mínima.
- Conteúdo longo prioriza campos críticos e preserva legibilidade.

## Mapa de preparação
- `pdfDrawTable` usa altura de linha dinâmica por célula (`splitTextToSize`).
- Cabeçalho reaparece após quebra de página.
- Evita quebra de item a meio quando a altura necessária não cabe na página.

## Instruções de impressão
- Imprimir sempre a **100%**.
- Desativar *fit to page* / *shrink to fit*.
- Confirmar marcas de calibração de canto e recorte.

## Ficheiros relevantes
- `script.js`: `generateWorksheetPage`, `generateLabelsPage`, `addLabelContent`, `pdfDrawTable`.
- `scripts/pdf-check.sh`: verificações estruturais mínimas de regressão.
