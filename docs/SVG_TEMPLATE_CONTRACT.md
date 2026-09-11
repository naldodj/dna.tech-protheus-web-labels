# Contrato e manutenção do template SVG

O template define a arte, as caixas e as faixas de fonte. O TLPP fornece os
dados; o navegador mede os textos, ajusta as fontes e posiciona volume e
espécie antes de gerar o PDF. Este guia usa o modelo genérico
`assets/templates/product-label-130x115.svg`.

## Comece pela unidade física

Defina `width` e `height` em milímetros e um `viewBox` proporcional:

```xml
<svg width="130mm" height="115mm" viewBox="0 0 130 115"
     preserveAspectRatio="xMidYMid meet">
```

Nesse modelo, uma unidade SVG corresponde a um milímetro. As coordenadas
`x`/`y`, dimensões de caixas e `data-fit-width`/`data-fit-height` usam unidades
locais do SVG. Um grupo com `transform="scale(...)"` altera essa relação.
Prefira manter o `viewBox` com os mesmos valores de largura e altura em mm.
Para usar fontes `pt`/`raster` ou espaçamento em mm, a engine exige `height`
em mm, `viewBox` válido e transformações sem escala zero.

Ao mudar as dimensões da etiqueta, ajuste também o tamanho de `#stage`, o
formato do `jsPDF`, `addPage()` e as dimensões de `addImage()` no HTML gerado
pelo TLPP. A demonstração usa 130 × 115 mm nesses pontos.

## Elementos e IDs

| ID ou atributo | Função |
|---|---|
| `product` | Descrição/código do produto. |
| `batch` | Lote. |
| `manufacture` | Data de fabricação. |
| `expiration` | Data de validade. |
| `weight` | Peso. |
| `volume` | Volume destacado. |
| `species` | Espécie da embalagem. |
| `volume-species` | Grupo de volume, espécie e caixa guia. |
| `data-container` | Grupo dos demais dados e sua caixa guia. |
| `barcode` | SVG interno reservado ao JsBarcode. |
| `data-label-for="batch"` | Associa um título fixo ao campo indicado, para ocultá-los juntos. |

Preserve um único elemento com cada ID dentro do template. A validação agrega
duplicidades dos IDs de campos reconhecidos e de `volume-species`; mantenha
também os demais IDs únicos. As consultas de layout ficam restritas ao SVG
recebido em `root`, sem procurar campos no restante da página.

Campos textuais ausentes são opcionais. Valores vazios ocultam o texto e seu
título associado por `data-label-for`; volume e espécie vazios ocultam o grupo
inteiro. `barcode` é obrigatório quando o registro fornece GTIN. Preserve suas
propriedades `x`, `y`, `width`, `height` e `preserveAspectRatio="xMidYMid meet"`.

## Faixas de fonte e compatibilidade com impressão raster

A função comum de layout é:

```javascript
const layout = createSVGLabelLayout(root, templateName, 4 / 3);
// Preencher os textos e definir a visibilidade antes do ajuste.
await layout.fit();
// Só então gerar barcode e capturar a página.
```

`root` deve ser o SVG já inserido no documento. `templateName` identifica o
arquivo nas mensagens. `rasterFontFactor` é opcional, tem padrão `4 / 3` e
deve ser positivo e finito. Ele representa a conversão histórica adotada pelo
sistema de origem, e não a conversão CSS usual de pixels para pontos.

| `data-font-unit` | Interpretação dos limites de fonte |
|---|---|
| `svg`, ou ausente | Unidades locais do SVG. Preserva o comportamento de templates anteriores. |
| `pt` | Pontos tipográficos: 1 pt = 25,4 / 72 mm. |
| `raster` | Valor da faixa histórica multiplicado por `rasterFontFactor`, em pontos, e convertido para o SVG. |

No modelo sem transformação, a conversão é:

```text
fonte SVG = valor raster × (4 / 3) × (25,4 / 72)
23 raster = 30,6667 pt CSS = 10,8185 mm = 10,8185 unidades SVG
```

O perfil de referência 1 está configurado assim:

| Campo | Mínimo raster | Máximo raster | Mínimo SVG neste modelo | Máximo SVG neste modelo |
|---|---:|---:|---:|---:|
| Volume | 14 | 23 | 6,5852 | 10,8185 |
| Espécie | 5 | 15 | 2,3519 | 7,0556 |

`data-font-profile="1"` identifica esse perfil na arte. A engine lê os limites
de cada campo; não consulta uma tabela de fontes no ERP e não altera faixas
ao trocar apenas o número do perfil. Para reproduzir outro perfil não SVG,
copie o mínimo e o máximo correspondentes da tabela para os atributos e
homologue as caixas e a fonte. Os atributos da raiz `data-font-profile`,
`data-volume-mode` e `data-hide-empty-fields` são metadados descritivos nesta
demonstração; não são seletores adicionais de comportamento.

## Como configurar um texto variável

```xml
<text id="volume" x="65" y="90" text-anchor="middle"
      font-family="Arial,sans-serif" font-size="10.818519"
      font-weight="900" font-style="italic"
      data-fit-width="112" data-fit-height="16.227778"
      data-min-font-size="14" data-max-font-size="23"
      data-font-unit="raster" data-font-scale-x="0.945"
      dominant-baseline="alphabetic">20 KG</text>
```

| Atributo | O que pode ser ajustado |
|---|---|
| `data-fit-width` | Largura máxima do texto, em unidades SVG locais; deve ser maior que zero. |
| `data-fit-height` | Altura máxima da caixa do texto, em unidades SVG locais; deve ser maior que zero. |
| `data-min-font-size` | Tamanho mínimo preferencial, na unidade declarada; deve ser maior que zero. |
| `data-max-font-size` | Tamanho máximo, na mesma unidade; deve ser maior ou igual ao mínimo. |
| `data-font-unit` | `svg`, `pt` ou `raster`. O padrão é `svg`. |
| `data-font-scale-x` | Fator horizontal positivo; padrão `1`. O exemplo usa `0.945`. |
| `font-size` | Tamanho inicial para edição/prévia; o ajuste de execução aplica o tamanho calculado. |

Use números sem sufixo e com ponto decimal nos atributos `data-*`: `7.25`,
não `7.25px`, `7.25pt` ou `7,25`. Se declarar qualquer um dos quatro atributos
de ajuste de caixa/faixa, informe todos os quatro.

O fator `0.945` comprime a largura dos glifos em 5,5%, mantendo a altura. A
engine aplica `textLength` e `lengthAdjust="spacingAndGlyphs"` a partir da
largura original em cada medição, sem acumular a compressão. Não preencha
esses dois atributos manualmente em campos que usam `data-font-scale-x`.

`fit()` aguarda o carregamento das fontes antes de medir o conteúdo com
`getBBox()`. Primeiro procura o maior tamanho que caiba na faixa. Se nem o
mínimo couber, reduz abaixo dele para preservar o conteúdo dentro da caixa,
registrando `data-fit-below-min="true"`. O mínimo, portanto, é preferencial;
texto muito extenso pode perder legibilidade. Amplie a caixa ou reveja o
conteúdo quando esse indicador aparecer. Se ainda não houver encaixe após as
tentativas de ajuste, a geração retorna erro.

No modelo, lote, fabricação, validade e peso têm esta configuração:

```xml
<text id="batch" x="121" y="37" text-anchor="end"
      data-fit-width="32" data-fit-height="5"
      data-min-font-size="1.5" data-max-font-size="3.4">L240001</text>
```

Esses limites usam a unidade padrão `svg`. A largura de 32 separa o valor do
título à esquerda; a altura de 5 preserva o intervalo entre linhas. Use a
mesma atenção para textos de lote extensos e valores com unidade de medida.

## Distância entre volume e espécie

```xml
<g id="volume-species"
   data-volume-gap="0.57"
   data-volume-align="center"
   data-species-use-volume-font="true">
  <rect x="6" y="77" width="118" height="27" rx="1.5"
        fill="#f8fafb" stroke="#b4c2c9" stroke-width="0.3"/>
  <!-- volume e species devem ser filhos diretos deste grupo -->
</g>
```

`data-volume-gap` define, em milímetros físicos, o vão visual entre a base
dos glifos do volume e o topo dos glifos da espécie. O padrão usado no modelo
é `0.57` mm. Não é a diferença entre os valores `y` das linhas: essas posições
são recalculadas depois do ajuste de fonte. A medição usa os contornos
visíveis da fonte quando o navegador fornece essas métricas, com `getBBox()`
como alternativa. Mantenha `dominant-baseline="alphabetic"` para a medição
óptica utilizada pelo exemplo.

`data-volume-align` posiciona **verticalmente o conjunto** na caixa guia:

| Valor | Posição |
|---|---|
| `start` | Topo da caixa. |
| `center` | Centro vertical; também é o padrão quando o atributo está ausente. |
| `end` | Base da caixa. |

O alinhamento horizontal continua definido por `x` e `text-anchor`; a engine
corrige a posição horizontal se a caixa do texto ultrapassar a guia.

Volume e espécie devem ser elementos `<text>` filhos diretos de
`volume-species`, com `x` e `y` numéricos. Aplique eventuais transformações ao
grupo, não a esses textos. O primeiro `<rect>` filho direto é a caixa guia e
precisa ter largura e altura positivas. O gap deve ser menor que a altura
física da caixa. Se o conjunto não couber, ambas as fontes podem diminuir,
mantendo o gap solicitado.

Com `data-species-use-volume-font="true"`, espécie preenchida e volume vazio,
a espécie usa a faixa de fonte do volume. Ela conserva a própria caixa de
ajuste e o próprio fator horizontal; assim, o tamanho final ainda pode ser
menor que o máximo do volume. Remova o atributo ou use `false` para conservar
sempre a faixa própria da espécie. A configuração do campo volume deve existir
no mesmo grupo para a herança funcionar. Com somente um campo visível, não há
gap reservado; o campo é alinhado sozinho na caixa.

Templates sem `data-volume-gap` mantêm as coordenadas existentes de volume e
espécie. Adicionar o atributo ativa o reposicionamento automático.

## Caixa guia e recorte

Os grupos `volume-species` e `data-container` são recortados pelo primeiro
`rect` filho direto, preservando `x`, `y`, `width`, `height`, `rx` e `ry`.
O recorte impede que o desenho escape da região, mas não substitui a
configuração correta de fonte e caixa. Em `data-container`, a engine ajusta
os textos com `data-fit-*` e preserva suas coordenadas; não redistribui linhas.

Para uma guia invisível, use `fill="none" stroke="none"` e conserve suas
dimensões. Não remova o retângulo para esconder a borda. Considere uma margem
interna para evitar que glifos toquem a borda ou os cantos arredondados.

A engine cria um `clipPath` com identificador próprio por grupo/instância.
Mantenha o SVG fonte livre dos atributos temporários de execução.

## Como interpretar um erro

A falha de um rótulo informa sua posição no lote, produto e template. A
validação reúne os problemas encontrados nos campos e no grupo, permitindo
corrigir mais de um campo por execução. Exemplo ilustrativo:

```text
Template SVG [./product-label-130x115.svg]: 2 configuracao(oes) invalida(s).
- #volume: data-max-font-size="7.25px". Informe um numero sem unidade, com ponto decimal (ex.: 7.25); nao use px, pt ou virgula.
- #species: data-fit-width=112, data-fit-height=10.583333, data-min-font-size=5, data-max-font-size=3, data-font-scale-x=0.945. Largura, altura, minimo e escala devem ser maiores que zero; o maximo deve ser maior ou igual ao minimo.
```

O arquivo identifica qual modelo editar; `#volume` identifica o elemento;
o atributo e seu valor mostram o problema; a frase seguinte indica a
correção. A validação registra o primeiro erro detectado em cada campo; um
mesmo campo pode revelar outro erro depois da primeira correção.

| Mensagem ou sintoma | Correção |
|---|---|
| Número inválido, com unidade ou vírgula | Retire sufixos e use ponto decimal nos atributos `data-*`. |
| Máximo menor que mínimo | Corrija a faixa sem trocar a unidade por engano. |
| `data-font-unit` inválido | Use exatamente `svg`, `pt` ou `raster`. |
| ID duplicado e quantidade de ocorrências | Remova a duplicidade; duplicar um desenho no editor pode copiar seus IDs. |
| Ausência de `rect` válido | Inclua a guia como filho direto do grupo, com dimensões positivas. |
| Gap ocupa toda a altura | Diminua `data-volume-gap` ou aumente a caixa. |
| `data-volume-align` inválido | Use `start`, `center` ou `end`. |
| Texto não cabe | Amplie `data-fit-width`/`data-fit-height`, ajuste a guia ou reduza o conteúdo. |
| Fontes pt/raster exigem geometria válida | Confira `height="...mm"`, `viewBox` e transformações. |
| `#barcode` ausente com GTIN preenchido | Reponha o SVG interno e suas dimensões. |
| HTTP ao buscar template | Confira a publicação do SVG e a referência relativa ao HTML. |

Para diagnóstico no navegador, inspecione os atributos após `await fit()`:

| Atributo de execução | Significado |
|---|---|
| `data-applied-font-size` | Fonte calculada em unidades SVG locais, já convertida. |
| `data-fit-below-min="true"` | Foi necessário reduzir abaixo do mínimo preferencial efetivo. |
| `data-applied-volume-gap` | Gap solicitado, em mm; `0` quando só há um campo visível. |
| `data-runtime-clip="true"` | Grupo com recorte aplicado pela engine. |

Não use esses valores como configuração no arquivo mestre. Os atributos
`data-runtime-*`, `data-applied-*` e `data-fit-below-min` são resultados da
execução.

## Rotina de edição e publicação

1. Faça uma cópia do modelo antes de editar.
2. No Inkscape, preserve dimensões, IDs e os textos variáveis como `<text>`.
   Converta em curvas somente os textos fixos da arte.
3. Reposicione caixas e campos; altere os atributos `data-*` no editor XML.
   Nomes de camada não substituem IDs.
4. Preserve as faixas da tabela raster desejada, a unidade declarada e o gap.
5. Salve como SVG simples e confira os atributos após a exportação. Uma
   prévia estática no editor não executa o ajuste JavaScript.
6. Sincronize a versão editável com o bloco de `DNWLabelTemplate()`:

   ```powershell
   node tools/sync-template.js
   ```

7. Execute a validação local descrita abaixo e revise os resultados.
8. Recompile `src/DNATechWebLabelsDemo.tlpp` no RPO. A demonstração publica o
   SVG a partir da versão embutida; a edição do arquivo externo isoladamente
   não muda o rótulo executado no ERP.
9. Gere o PDF no ambiente de homologação e compare com a impressão não SVG
   usando os mesmos dados, fonte, papel e impressora. Imprima em tamanho real
   (100%), confira dimensões físicas, leitura do código e legibilidade.

O arquivo externo e o template embutido devem permanecer idênticos. Em uma
adaptação que passe a carregar modelos externos diretamente no servidor,
documente o caminho de publicação usado pela aplicação; essa troca de fluxo
não é feita apenas pela edição do SVG.

## Validação local e homologação

O teste usa Chromium e as bibliotecas fornecidas pelo operador. Não requer
ERP ou compilação TLPP. Coloque `JsBarcode.all.min.js`, `html2canvas.min.js`
e `jspdf.umd.min.js` na pasta indicada:

```powershell
node tests/svg-layout.test.js --libs "C:/caminho/bibliotecas"
```

Os parâmetros opcionais permitem escolher o navegador e verificar a mesma
engine no fonte do exemplo 034:

```powershell
node tests/svg-layout.test.js --libs "C:/caminho/bibliotecas" --browser "C:/caminho/chrome.exe" --fw-source "C:/caminho/fw.webex.example.034.tlpp"
```

A rotina verifica conteúdo curto, extenso e vazio, faixas/unidades de fonte,
gap e alinhamento, herança de fonte, contenção, IDs e configurações inválidas.
Também exercita a captura e a geração efetiva de um PDF de três páginas.
O resultado de cada execução determina quais verificações passaram; este guia
não substitui o relatório de execução.

Para cada modelo de produção, inclua amostras com volume e espécie curtos,
ambos extensos, apenas espécie, apenas volume, ambos vazios, lotes extensos e
caracteres acentuados. Confira especialmente os campos marcados abaixo do
mínimo preferencial. A conversão e o espaçamento aproximam o comportamento
raster, mas fontes instaladas, navegador e driver podem alterar o resultado
físico. A compilação no Protheus e a homologação na impressora são etapas
separadas da validação local.
