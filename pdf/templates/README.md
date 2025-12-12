# Templates de PDF do NutriSoft

Esta pasta centraliza tamanhos e convenções gráficas para o mapa de preparação e rótulos.

## Ajustar fontes, margens e grelha
- Edite `PDF_THEME` em `script.js` para alterar margens, paleta de cores e tamanhos tipográficos.
- `labelLayout` define largura/altura (mm), espaçamento entre etiquetas e padding interno.
- Sempre mantenha margens internas de pelo menos 5 mm para evitar cortes em impressoras térmicas.

## Adicionar novos tipos de etiqueta
1. Crie um preset adicional em `PDF_THEME.labelLayout` ou adicione um novo objeto aqui.
2. Atualize `generateLabelsPage`/`addLabelContent` em `script.js` para usar o preset.
3. Gere PDFs de exemplo (ver abaixo) para validar alinhamentos.

## Fluxo de geração
- O PDF final inclui a ficha de preparação (A4) e, em seguida, as etiquetas (duas colunas, até 4 etiquetas por página).
- Os valores críticos são formatados com vírgula decimal e realçados na tabela principal.

## Como gerar PDFs de teste
No navegador, calcule uma formulação e use o botão de impressão. Para gerar ficheiros offline com dados fictícios, adicione fixtures em `examples/` e adapte a chamada a `exportPDF`.

