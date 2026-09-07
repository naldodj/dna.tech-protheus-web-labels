# DNATech Protheus Web Labels

Exemplo técnico de geração de rótulos no TOTVS Protheus usando tecnologias Web
especializadas: SVG para layout, JsBarcode para códigos de barras,
html2canvas para captura e jsPDF para consolidação do documento.

O projeto também documenta uma descoberta importante sobre `CpyF2Web` e
`TWebEngine`: recursos publicados no mesmo contexto do HTML devem ser
referenciados por `./nome-do-arquivo.ext`, e não pelo caminho completo devolvido
por `CpyF2Web`.

## Por que este projeto existe

APIs genéricas de impressão são adequadas para relatórios tradicionais, mas
rótulos industriais exigem controle rigoroso de:

- dimensões físicas e orientação;
- códigos de barras verticais ou horizontais;
- alinhamento e distribuição visual;
- textos variáveis de comprimentos muito diferentes;
- fontes, limites e redução automática;
- geração de centenas de páginas em uma única operação.

A solução transfere o layout para SVG e deixa o Protheus responsável pelos
dados, pela publicação temporária e pela integração com a interface. O
navegador executa as tarefas para as quais suas bibliotecas são especializadas.

## Arquitetura

```text
TLPP
 ├─ grava HTML e template SVG no AppServer
 ├─ publica primeiro o SVG com CpyF2Web
 ├─ publica o HTML hospedeiro com CpyF2Web
 └─ abre o HTML no TWebEngine + TWebChannel
      │
      └─ Navegador
          ├─ fetch("./template.svg")
          ├─ preenche os IDs do SVG
          ├─ ajusta fontes com getBBox()
          ├─ gera o barcode com JsBarcode
          ├─ captura uma página por vez com html2canvas
          ├─ acrescenta as páginas ao jsPDF
          └─ abre o PDF por Blob ou baixa como fallback
```

O SVG não é convertido para Base64. Isso reduz drasticamente o conteúdo
transportado em strings AdvPL/TLPP e evita que a quantidade de rótulos fique
limitada pelo `MaxStringSize` apenas por causa das imagens.

## A descoberta sobre CpyF2Web

Considere um HTML aberto em endereço semelhante a:

```text
https://servidor:porta/webapp/<sessao>/cache/<ambiente>/pagina.html?...parametros...
```

E o retorno de `CpyF2Web` para um SVG:

```text
<sessao>/cache/<ambiente>/template.svg
```

Resolver esse retorno contra `document.baseURI` duplica segmentos:

```text
/webapp/<sessao>/cache/<ambiente>/<sessao>/cache/<ambiente>/template.svg
```

O resultado é HTTP 404. Como HTML e SVG foram publicados no mesmo diretório
Web temporário, a referência correta é:

```javascript
fetch("./template.svg")
```

Os parâmetros adicionados pelo `TWebEngine` à query string não impedem esse
acesso. O navegador resolve `./template.svg` relativamente ao diretório do
HTML.

## Conteúdo do repositório

```text
assets/templates/product-label-130x115.svg  template editável
docs/SVG_TEMPLATE_CONTRACT.md               contrato dos IDs e propriedades
resources/README.md                         dependências que devem estar no RPO
src/DNATechWebLabelsDemo.tlpp               geração do PDF consolidado
src/DNATechCpyF2WebProbe.tlpp               diagnóstico de URLs do CpyF2Web
```

## Pré-requisitos

- TOTVS Protheus com `TWebEngine`, `TWebChannel` e `CpyF2Web` disponíveis;
- permissão para criar arquivos em `\system\dnatech-web-labels\`;
- os quatro recursos JavaScript descritos em [resources/README.md](resources/README.md)
  compilados no RPO;
- WebAgent conectado durante a execução.

## Instalação

1. Compile os dois fontes da pasta `src` no RPO.
2. Inclua as bibliotecas JavaScript no RPO com os nomes documentados.
3. Execute primeiro `U_DNWPROBE`.
4. Confirme que **arquivo relativo ao HTML** retorna HTTP 200.
5. Execute `U_DNWLABEL` para gerar o PDF demonstrativo.

As funções possuem nomes curtos para que também possam ser chamadas por menu,
caso a versão utilizada ainda imponha restrições a nomes TLPP longos.

## Exemplo de publicação segura

```advpl
cSVGWeb:=CpyF2Web(cSVGFile,.F.,.F.,.F.,.F.)
cTemplateURL:=DNWCpyRelative(cSVGWeb) // ./template.svg
```

Pontos importantes:

- `lIsUserDiskDir=.F.` porque o arquivo foi criado no filesystem do AppServer;
- o recurso deve ser publicado antes do HTML que irá carregá-lo;
- query string e fragmento devem ser removidos ao extrair o nome;
- o retorno completo continua sendo usado para `TWebEngine:Navigate()` do HTML;
- somente assets irmãos usam a URL relativa.

## Recursos demonstrados pela engine

- template SVG como proprietário do layout;
- campos opcionais por ID;
- volume e espécie tratados independentemente;
- ocultação de grupos sem conteúdo;
- redução automática de fonte por largura e altura;
- EAN-13 e Code 128;
- preservação de `x`, `y`, `width`, `height` e `preserveAspectRatio` do barcode;
- espera por fontes e ciclos de pintura do Chromium;
- renderização sequencial para reduzir pressão de memória;
- PDF multipágina consolidado;
- abertura por Blob ao final do lote;
- fallback para download quando pop-ups estiverem bloqueados;
- retorno de sucesso ou erro ao TLPP via `bJSToAdvPL`.

## Adaptando para produção

O array `LABELS` do exemplo é fixo. Em uma implementação real, monte JSON no
TLPP a partir de dados já validados e substitua o conteúdo do array no HTML.
Não concatene valores sem escape para JavaScript/JSON.

Para novos modelos:

1. duplique o template SVG;
2. defina dimensões físicas e `viewBox`;
3. reposicione os elementos no Inkscape;
4. preserve os IDs documentados;
5. configure os limites `data-fit-*`;
6. mantenha `preserveAspectRatio="xMidYMid meet"` no SVG raiz e no barcode;
7. teste textos curtos, longos, maiúsculos e campos vazios.

Consulte [o contrato completo do SVG](docs/SVG_TEMPLATE_CONTRACT.md).

## Segurança e operação

- Os arquivos publicados são temporários e não devem conter segredos.
- Valide e escape todo dado inserido no HTML/JavaScript.
- Restrinja formatos e caminhos aceitos para templates externos.
- Não permita que dados de usuário escolham caminhos arbitrários no servidor.
- Trate falhas HTTP antes de gerar o PDF; não aceite páginas sem arte.
- Exclua os arquivos de origem temporários após o fechamento da tela.
- Avalie política de retenção do cache Web conforme a versão do Protheus.

## Limitações do exemplo

- Os dados são demonstrativos e não acessam tabelas Protheus.
- O template também está embutido no fonte para facilitar a primeira execução;
  o arquivo em `assets/templates` é a versão editável de referência.
- Bibliotecas de terceiros não são distribuídas neste repositório.
- Impressoras, margens físicas e calibração do equipamento não fazem parte da
  geração do PDF e devem ser homologadas separadamente.

## Origem e privacidade

Este projeto foi extraído de uma solução real e generalizado. Nomes de cliente,
layouts proprietários, produtos, regras comerciais e demais informações
específicas foram removidos. Os arquivos fornecidos são exemplos autorais para
estudo e adaptação.

## Licença

Código disponibilizado sob a [MIT License](LICENSE). Bibliotecas de terceiros
mantêm suas respectivas licenças.
