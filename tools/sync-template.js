/* Sincroniza a arte editavel com o SVG embutido usado na primeira execucao.
 * node tools/sync-template.js [--check]
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/DNATechWebLabelsDemo.tlpp');
const assetPath = path.join(root, 'assets/templates/product-label-130x115.svg');
const source = fs.readFileSync(sourcePath, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const normalize = text => text.replaceAll('\r\n', '\n').trim();
const svg = normalize(fs.readFileSync(assetPath, 'utf8').replace(/^\s*<\?xml[^>]*\?>\s*/, ''));
const pattern = /(static function DNWLabelTemplate\(\)[\s\S]*?BeginContent var cSVG\r?\n)([\s\S]*?)(\r?\n\s*EndContent)/;
const match = source.match(pattern);
if (!match) throw new Error('Bloco DNWLabelTemplate/BeginContent var cSVG nao encontrado.');
if (!/^<svg\b/.test(svg) || !/<\/svg>$/.test(svg)) throw new Error('A arte deve conter uma raiz SVG completa.');
if (normalize(match[2]) === svg) {
    console.log('Template editavel e embutido estao sincronizados.');
} else if (process.argv.includes('--check')) {
    console.error('Template divergente: execute node tools/sync-template.js e recompile o TLPP.');
    process.exitCode = 1;
} else {
    const updated = source.replace(pattern, (_, before, oldSVG, after) => before + svg.replaceAll('\n', newline) + after);
    fs.writeFileSync(sourcePath, updated, 'utf8');
    console.log('SVG embutido atualizado. Recompile DNATechWebLabelsDemo.tlpp para utiliza-lo.');
}
