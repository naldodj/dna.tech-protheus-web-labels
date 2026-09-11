/* Testa o JavaScript real extraido dos fontes TLPP, usando Chromium local.
 * node tests/svg-layout.test.js --libs C:/bibliotecas [--fw-source C:/...034.tlpp]
 * Bibliotecas do operador: JsBarcode.all.min.js, html2canvas.min.js, jspdf.umd.min.js.
 * Nenhum recurso do ERP e acessado. Saidas ficam na pasta temporaria do sistema.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const libs = argument('--libs') || process.env.WEB_LABELS_JS_DIR;
if (!libs) throw new Error('Informe --libs com a pasta das tres bibliotecas JavaScript.');
const browser = argument('--browser') || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const asset = fs.readFileSync(path.join(root, 'assets/templates/product-label-130x115.svg'), 'utf8').replace(/^\s*<\?xml[^>]*\?>\s*/, '').trim();
const embedded = source => source.match(/BeginContent var cSVG\s*\r?\n([\s\S]*?)\r?\n\s*EndContent/)[1].trim().replaceAll('\r\n','\n');
const source = fs.readFileSync(path.join(root, 'src/DNATechWebLabelsDemo.tlpp'), 'utf8').replaceAll('\r\n','\n');
assert.equal(embedded(source), asset.replaceAll('\r\n','\n'), 'Sincronize o template com node tools/sync-template.js');
const main = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const TEMPLATE_URL='));
assert(main, 'Script principal DNA nao encontrado');
const exposeDNA = main.slice(0, main.indexOf('function connect()')) + '\nwindow.__test={prepare,run,labels:LABELS,createSVGLabelLayout};';
const fixtures = [{name:'DNATech',script:exposeDNA,svg:asset,status:'status',stage:'stage',button:null}];
const fwSourcePath = argument('--fw-source');
if (fwSourcePath) {
    const fwSource = fs.readFileSync(fwSourcePath,'utf8').replaceAll('\r\n','\n');
    const app = fwSource.match(/BeginContent var cAppScript\s*\n([\s\S]*?)\n\s*EndContent/)[1];
    const expose = app.slice(0,app.indexOf('    function init()'))+'\nwindow.__test={prepare,run:generate,labels,createSVGLabelLayout};\n})();';
    fixtures.push({name:'FWWebEx034',script:expose,svg:embedded(fwSource),status:'fwwebex-example-034-status',stage:'fwwebex-example-034-stage',button:'fwwebex-example-034-generate'});
    const factory = (text,next) => text.slice(text.indexOf('function createSVGLabelLayout'),text.indexOf(next)).split('\n').map(line=>line.trim()).join('\n').trim();
    assert.equal(factory(main,'function barcode('),factory(app,'function createBarcode('),'As factories dos dois exemplos divergiram');
}
fixtures.forEach(f=>new Function(f.script.replaceAll('__TEMPLATE_URL__','./fixture.svg')));
const vendor = ['JsBarcode.all.min.js','html2canvas.min.js','jspdf.umd.min.js'].map(name=>fs.readFileSync(path.join(libs,name),'utf8'));
const payload = JSON.stringify(fixtures).replaceAll('<','\\u003c');
const tests = String.raw`
const failures=[],results=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const base={product:'PA000001 - PRODUTO DE TESTE',batch:'L260001',manufacture:'10/09/2026',expiration:'10/09/2028',weight:'20,000 KG',volume:'20 KG',species:'BOMBONA',gtin:'7891234567895'};
const contents=[{volume:'20',species:'KG'},{volume:'20 KG',species:'BOMBONA'},
 {volume:'1.000 L',species:'CONTAINER IBC'},{volume:'2,5 kg',species:'GALAO / EMBALAGEM'},
 {volume:'20.000 KG',species:'BOMBONA PLASTICA RETORNAVEL '.repeat(12)},
 {volume:'',species:'CAIXA'},{volume:'20 KG',species:''},{volume:'',species:''}];
async function newApp(fixture,svg=fixture.svg){
 const frame=document.createElement('iframe');frame.style.cssText='width:800px;height:500px;border:0;position:absolute;left:-2000px';document.body.appendChild(frame);
 frame.srcdoc='<style>body{margin:0;font-family:Arial}#'+fixture.stage+'{width:130mm;height:115mm;background:white}#'+fixture.stage+'>svg{display:block;width:100%;height:100%}</style><div id="'+fixture.status+'"></div>'+(fixture.button?'<button id="'+fixture.button+'"></button>':'')+'<div id="'+fixture.stage+'"></div>';
 await new Promise(resolve=>frame.onload=resolve);
 const win=frame.contentWindow,doc=frame.contentDocument;
 win.JsBarcode=window.JsBarcode;win.jspdf=window.jspdf;
 win.__captures=[];
 win.html2canvas=async(...args)=>{
  const canvas=await window.html2canvas(...args),context=canvas.getContext('2d');
  for(const [name,x,y,w,h] of [['Volume/Especie',6,77,118,27],['barcode',6,29,48,42],['dados',58,29,66,42]]){
   const pixels=context.getImageData(Math.round(x/130*canvas.width),Math.round(y/115*canvas.height),Math.floor(w/130*canvas.width),Math.floor(h/115*canvas.height)).data;
   let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<64&&pixels[i+1]<64&&pixels[i+2]<64)dark++;
   // O terceiro registro omite GTIN e deve deixar o barcode vazio.
   if(name!=='barcode'||win.__captures.length<2)assert(dark>100,'Captura sem tinta em '+name);
  }
  win.__captures.push(canvas.toDataURL('image/png'));
  return canvas;
 };
 // A publicacao e a ponte ERP sao simuladas; SVG, DOM, fontes, captura e PDF sao reais.
 const nativeFetch=win.fetch.bind(win);
 win.fetch=(url,options)=>url==='./fixture.svg'?Promise.resolve(new win.Response(svg,{status:200,headers:{'Content-Type':'image/svg+xml'}})):nativeFetch(url,options);
 win.__messages=[];
 win.twebchannel={jsToAdvpl:(type,message)=>win.__messages.push({type,message})};
 win.FWWebEx={TWebChannel:{send:async(type,message)=>win.__messages.push({type,message})}};
 win.requestAnimationFrame=callback=>win.setTimeout(()=>callback(win.performance.now()),0);
 win.open=url=>{win.__pdfPromise=nativeFetch(url).then(response=>response.arrayBuffer()).then(buffer=>{
  const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return{size:bytes.length,pages:(binary.match(/\/Type\s*\/Page\b/g)||[]).length,base64:btoa(binary)};
 });return{closed:false};};
 win.Function(fixture.script.replaceAll('__TEMPLATE_URL__','./fixture.svg'))();
 const stage=doc.getElementById(fixture.stage);stage.innerHTML=svg;
 return{frame,win,doc,stage,svg:stage.querySelector('svg'),api:win.__test};
}
function metrics(app,svg){
 const rows=[];
 for(const text of svg.querySelectorAll('[data-fit-width]')){
  if(text.style.display==='none'||!text.textContent.trim())continue;
  const box=text.getBBox(),w=Number(text.getAttribute('data-fit-width')),h=Number(text.getAttribute('data-fit-height'));
  assert(box.width<=w+.003&&box.height<=h+.003,'#'+text.id+' excedeu caixa de texto');
  rows.push({id:text.id,x:box.x,y:box.y,width:box.width,height:box.height,font:text.style.fontSize});
 }
 const group=svg.querySelector('#volume-species'),visible=['volume','species'].map(id=>svg.querySelector('#'+id)).filter(el=>el&&el.style.display!=='none'&&el.textContent.trim());
 let gap=null;
 if(group&&group.hasAttribute('data-volume-gap')){
  const guide=[...group.children].find(el=>el.tagName.toLowerCase()==='rect').getBBox();
  for(const el of visible){const b=el.getBBox();assert(b.x>=guide.x-.003&&b.x+b.width<=guide.x+guide.width+.003&&b.y>=guide.y-.003&&b.y+b.height<=guide.y+guide.height+.003,'#'+el.id+' excedeu guia');}
  if(visible.length===2){
   const ink=el=>{const css=app.win.getComputedStyle(el),ctx=app.doc.createElement('canvas').getContext('2d');ctx.font=css.fontStyle+' '+css.fontWeight+' 1024px '+css.fontFamily;const m=ctx.measureText(el.textContent),s=parseFloat(css.fontSize)/1024,y=Number(el.getAttribute('y'));return{top:y-m.actualBoundingBoxAscent*s,bottom:y+m.actualBoundingBoxDescent*s};};
   const matrix=svg.getScreenCTM().inverse().multiply(group.getScreenCTM());gap=(ink(visible[1]).top-ink(visible[0]).bottom)*Math.hypot(matrix.c,matrix.d);
   assert(Math.abs(gap-Number(group.getAttribute('data-volume-gap')))<.003,'Vao variou: '+gap);
  }
 }
 return{rows,gap};
}
async function scenario(name,action){try{results.push({name,...await action()});}catch(error){failures.push(name+': '+(error.stack||error.message));}}
(async()=>{
for(const fixture of fixtures){
 for(let i=0;i<contents.length;i++)await scenario(fixture.name+' conteudo '+i,async()=>{
  const app=await newApp(fixture);try{
   const item={...base,...contents[i]};await app.api.prepare(app.svg,item);const first=metrics(app,app.svg);await app.api.prepare(app.svg,item);const second=metrics(app,app.svg);
   assert(JSON.stringify(first)===JSON.stringify(second),'Preparacao nao idempotente');
   for(const id of ['volume','species'])assert(app.svg.querySelector('#'+id).style.display===(item[id]?'':'none'),'Visibilidade '+id);
   return second;
  }finally{app.frame.remove();}
 });
 await scenario(fixture.name+' duas previas isoladas',async()=>{
  const app=await newApp(fixture);try{
   const container=app.doc.createElement('div');container.innerHTML=fixture.svg;app.doc.body.appendChild(container);const second=container.querySelector('svg');
   await app.api.prepare(app.svg,base);const before=app.svg.outerHTML;await app.api.prepare(second,{...base,volume:'5 L',species:'FRASCO'});
   assert(app.svg.outerHTML===before,'Outra previa foi alterada');
   const ids=[...app.doc.querySelectorAll('clipPath')].map(el=>el.id);assert(new Set(ids).size===ids.length,'Clip paths colidiram');metrics(app,second);return{};
  }finally{app.frame.remove();}
 });
 await scenario(fixture.name+' campo opcional e zero',async()=>{
  const app=await newApp(fixture);try{
   app.svg.querySelector('#volume').remove();await app.api.prepare(app.svg,{...base,batch:0,weight:''});metrics(app,app.svg);
   assert(app.svg.querySelector('#batch').textContent==='0','Zero foi ocultado');assert(app.svg.querySelector('[data-label-for="weight"]').style.display==='none','Legenda vazia permaneceu');return{};
  }finally{app.frame.remove();}
 });
 const invalid=[
  {name:'unidade numerica',edit:root=>root.querySelector('#volume').setAttribute('data-max-font-size','7.25px'),parts:['#volume','data-max-font-size','7.25px','sem unidade']},
  {name:'limites invertidos',edit:root=>root.querySelector('#species').setAttribute('data-max-font-size','3.65'),parts:['#species','data-max-font-size','maior ou igual']},
  {name:'largura ausente',edit:root=>root.querySelector('#volume').removeAttribute('data-fit-width'),parts:['#volume','data-fit-width','null']},
  {name:'gap invalido',edit:root=>root.querySelector('#volume-species').setAttribute('data-volume-gap','40'),parts:['#volume-species','data-volume-gap','altura']},
  {name:'ID duplicado',edit:root=>root.appendChild(root.querySelector('#volume').cloneNode(true)),parts:['#volume','ID duplicado']},
  {name:'erros agregados',edit:root=>{root.querySelector('#volume').setAttribute('data-max-font-size','7.25px');root.querySelector('#species').setAttribute('data-max-font-size','3.65');},parts:['2 configuracao','#volume','#species']},
  {name:'barcode ausente',edit:root=>root.querySelector('#barcode').remove(),parts:['#barcode']}
 ];
 for(const test of invalid)await scenario(fixture.name+' erro '+test.name,async()=>{
  const app=await newApp(fixture);try{test.edit(app.svg);let message='';try{await app.api.prepare(app.svg,base);}catch(error){message=error.message;}
   assert(message,'Configuracao invalida foi aceita');for(const part of test.parts)assert(message.includes(part),'Diagnostico incompleto: '+message);return{message};
  }finally{app.frame.remove();}
 });
 await scenario(fixture.name+' PDF consolidado',async()=>{
  const app=await newApp(fixture);try{await app.api.run();const error=app.win.__messages.find(m=>m.type.endsWith('_ERROR'));assert(!error,error&&error.message);assert(app.win.__pdfPromise,'PDF nao foi aberto');const pdf=await app.win.__pdfPromise;assert(pdf.size>1000&&pdf.pages===3,'PDF deve ter tres paginas');return{pdf,preview:app.win.__captures[0]};}finally{app.frame.remove();}
 });
 await scenario(fixture.name+' erro contextual do lote',async()=>{
  const broken=fixture.svg.replace(/data-max-font-size="23"/,'data-max-font-size="7.25px"');const app=await newApp(fixture,broken);try{await app.api.run();const error=app.win.__messages.find(m=>m.type.endsWith('_ERROR'));assert(error,'Nao retornou erro ao ERP');for(const part of ['Rotulo [1/3]','Produto=[PA000001','fixture.svg','#volume','7.25px'])assert(error.message.includes(part),'Falta contexto '+part+': '+error.message);return{message:error.message};}finally{app.frame.remove();}
 });
}
document.getElementById('report').textContent=JSON.stringify({results,failures});
})().catch(error=>{document.getElementById('report').textContent=JSON.stringify({results,failures:[...failures,error.stack||String(error)]});});
`;
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'web-labels-tests-'));
const html = '<!doctype html><meta charset="utf-8"><pre id="report"></pre>'+vendor.map(js=>'<script>'+js+'</script>').join('')+'<script>const fixtures='+payload+';'+tests+'</script>';
const file = path.join(out,'tests.html');fs.writeFileSync(file,html);
const run = spawnSync(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir='+path.join(out,'profile'),'--virtual-time-budget=120000','--dump-dom','file:///'+file.replaceAll('\\','/')],{encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024});
fs.writeFileSync(path.join(out,'browser.log'),run.stderr||'');
const match = (run.stdout||'').match(/<pre id="report">([\s\S]*?)<\/pre>/);
if(!match||!match[1])throw new Error('Teste incompleto em '+out+': '+(run.error||run.status));
const report=JSON.parse(match[1].replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
for(const result of report.results)if(result.pdf){const name=result.name.split(' ')[0];fs.writeFileSync(path.join(out,name+'.pdf'),Buffer.from(result.pdf.base64,'base64'));delete result.pdf.base64;fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(result.preview.split(',')[1],'base64'));delete result.preview;}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({out,fixtures:fixtures.map(f=>f.name),passed:report.results.length,failures:report.failures,pdfs:report.results.filter(r=>r.pdf)},null,2));
process.exitCode=report.failures.length?1:0;
