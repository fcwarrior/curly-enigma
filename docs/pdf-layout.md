# Layout PDF (NutriSoft)

## Objetivo
Documentar o layout determinístico dos PDFs (Mapa de Preparação e Etiquetas), garantindo consistência de impressão e ausência de cortes/overflows.

## Unidade e grelha
- Unidade base: **mm** (jsPDF com `unit: 'mm'`).
- Conversões: usar `mm` diretamente, evitando px.
- Margens globais A4: `PDF_THEME.margins`.

## Etiquetas (label templates)
Localização: `LABEL_TEMPLATES` em `script.js`.

### Template principal
- Dimensão: **90 × 50 mm** (4 por página A4).
- Safe area: **86 × 46 mm** com offset **2 mm**.
- Padding interno: **1.5 mm** (em `addLabelContent`).
- Caixa QR/BC: **18 × 13 mm** (canto inferior direito dentro da safe area).
- Reservas: rodapé + QR calculados para impedir sobreposição.

### Regras de layout
- Todo o conteúdo deve ficar dentro da `safeArea`.
- Linha/altura calculada com base no tamanho de fonte (`lineHeight`), sem valores fixos.
- `pdfFitText` reduz a fonte quando necessário (mínimo: `template.minFont`).
- Blocos longos são truncados com indicação “ver detalhes no mapa de preparação”.

### Instruções de impressão
- Imprimir a **100%** (sem “fit to page”).
- Validar marcas de calibração nos quatro cantos.

## Mapa de Preparação
- Tabelas com altura de linha dinâmica (`pdfDrawTable`) para evitar corte de texto.
- Cabeçalhos repetidos após quebra de página.

## Ajustes futuros
- Atualizar dimensões em `LABEL_TEMPLATES`.
- Manter `safeArea` e `reservedBottom` consistentes com novos blocos.
- Se adicionar campos, validar: (1) safe area, (2) linha dinâmica, (3) truncagem.
