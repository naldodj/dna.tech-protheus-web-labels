# Contrato do template SVG

O template é o proprietário do layout. O TLPP fornece dados e o navegador faz
o ajuste final antes da captura. Isso elimina coordenadas específicas de cada
modelo no código AdvPL/TLPP.

## Dimensões

Defina `width` e `height` em milímetros, `viewBox` compatível e
`preserveAspectRatio="xMidYMid meet"`:

```xml
<svg width="130mm" height="115mm" viewBox="0 0 130 115"
     preserveAspectRatio="xMidYMid meet">
```

## IDs reconhecidos

| ID | Conteúdo |
|---|---|
| `product` | descrição/código do produto |
| `batch` | lote |
| `manufacture` | fabricação |
| `expiration` | validade |
| `weight` | peso |
| `volume` | volume destacado |
| `species` | espécie da embalagem |
| `barcode` | SVG interno reservado ao JsBarcode |

Campos textuais ausentes são opcionais. `barcode` é obrigatório somente quando
o registro solicita código de barras.

## Ajuste de fonte

Textos variáveis podem declarar:

```xml
<text id="species"
      data-fit-width="112"
      data-fit-height="6"
      data-min-font-size="2"
      data-max-font-size="7">BOMBONA</text>
```

O exemplo usa busca binária e `getBBox()` para encontrar o maior tamanho que
caiba na caixa. Volume e espécie são ajustados independentemente.

## Recomendações para o Inkscape

1. Preserve os IDs; nomes de camada não substituem `id`.
2. Converta apenas textos fixos em curvas. Dados variáveis devem continuar
   como elementos `<text>`.
3. Não aplique transformação ao `#barcode` se `x`, `y`, `width` e `height`
   forem suficientes.
4. Mantenha `preserveAspectRatio="xMidYMid meet"` no barcode.
5. Salve como SVG simples/otimizado e valide o XML antes de publicar.
