import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import * as protocol from '../protocol.js';
import * as fileTools from '../files.js';

// Exercise real application event handlers without a network or browser.
function setup() {
  const elements = new Map(), timers = new Map(), peers = [], createdUrls = [], revokedUrls = [], windowEvents = new Map(); let timerId = 0;
  function node() {
    return {value:'',textContent:'',hidden:false,disabled:false,children:[],listeners:new Map(),replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},addEventListener(event,fn){this.listeners.set(event,fn);},fire(event){return this.listeners.get(event)?.({target:this});},classList:{add(){},remove(){}}};
  }
  function element(id) {
    if (!elements.has(id)) elements.set(id,node());
    return elements.get(id);
  }
  class Connection extends EventEmitter {
    constructor(metadata = {}) { super(); this.metadata = metadata; this.open = false; this.messages = []; }
    send(message) { this.messages.push(message); }
    close() { this.open = false; this.emit('close'); }
    establish() { this.open = true; this.emit('open'); }
  }
  class Peer extends EventEmitter {
    constructor(id) { super(); this.id = id; this.destroyed = false; peers.push(this); }
    connect(id, options) { this.target = id; this.options = options; return this.connection = new Connection(); }
    destroy() { this.destroyed = true; }
  }
  const timersAPI = {setTimeout(fn, ms) { const id = ++timerId; timers.set(id,{fn,ms}); return id; },clearTimeout(id) { timers.delete(id); }};
  class TestURL extends URL { static createObjectURL(){const url=`blob:test-${createdUrls.length}`;createdUrls.push(url);return url;} static revokeObjectURL(url){revokedUrls.push(url);} }
  const context = {...protocol, ...fileTools, ...timersAPI, crypto, TextEncoder, URL:TestURL, Blob,
    document:{getElementById:element,createElement:node}, navigator:{userAgent:'Windows',platform:'Win32',maxTouchPoints:0,onLine:true},
    window:{Peer,RTCPeerConnection(){},addEventListener(event,fn){windowEvents.set(event,fn);}}, history:{replaceState(){}}, location:{pathname:'/reynoso-drop/',search:'',hash:''}, confirm:()=>true};
  const source = readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');
  runInNewContext(source, context);
  function expire(ms) { for (const [id,timer] of [...timers]) if (timer.ms === ms && timers.has(id)) { timers.delete(id); timer.fn(); } }
  return {element,peers,Connection,expire,createdUrls,revokedUrls,windowEvents};
}
test('permite cargar documentos antes de conectar y limpiar la selección sin enviarla', () => {
  const {element,peers}=setup();
  assert.equal(element('file-zone').disabled,false); assert.equal(element('choose-photos').disabled,false);
  element('file-input').files=[new File(['PK00'],'reporte.xlsx'),new File(['%PDF'],'manual.pdf')]; element('file-input').fire('change');
  assert.match(element('queue-summary').textContent,/2 archivos/); assert.equal(element('file-queue').children.length,2);
  assert.equal(element('send-files').disabled,true); assert.equal(peers.length,0);
  element('clear-files').fire('click'); assert.equal(element('file-selection').hidden,true); assert.equal(element('file-queue').children.length,0);
});
test('pegar una captura la agrega como archivo y limpiar revoca las miniaturas temporales', async () => {
  const {element,createdUrls,revokedUrls,windowEvents}=setup(); let prevented=false;
  const photo=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'captura.png');
  windowEvents.get('paste')({clipboardData:{files:[photo]},preventDefault(){prevented=true;}});
  assert.equal(prevented,true); assert.match(element('queue-summary').textContent,/1 archivo/);
  await new Promise(resolve=>setImmediate(resolve)); assert.equal(createdUrls.length,1);
  element('clear-files').fire('click'); assert.deepEqual(revokedUrls,createdUrls);
});
test('envía varios documentos originales y retira de la cola solo los confirmados', async () => {
  const {element,peers,Connection}=setup(); element('create-room').fire('click'); const host=peers[0]; host.emit('open');
  const conn=new Connection({device:'Otra laptop',token:protocol.newCode()}); host.emit('connection',conn); conn.establish(); element('accept-device').fire('click');
  conn.send=msg=>{
    conn.messages.push(msg);
    const key=msg.type==='file-offer'?`offer:${msg.id}`:msg.type==='file-chunk'?`chunk:${msg.id}:${msg.index}`:msg.type==='file-end'?`end:${msg.id}`:null;
    if(key) conn.emit('data',{type:'ack',key});
  };
  const excel=new File([new Uint8Array([80,75,3,4,0,255])],'reporte.xlsx'); const pdf=new File(['%PDF sample'],'manual.pdf');
  element('file-input').files=[excel,pdf]; element('file-input').fire('change'); assert.equal(element('send-files').disabled,false);
  await element('send-files').fire('click');
  const offers=conn.messages.filter(msg=>msg.type==='file-offer'); assert.deepEqual(offers.map(msg=>msg.name),['reporte.xlsx','manual.pdf']);
  for(const [i,file] of [excel,pdf].entries()) {
    const parts=conn.messages.filter(msg=>msg.type==='file-chunk'&&msg.id===offers[i].id).map(msg=>msg.bytes);
    assert.deepEqual(await new Blob(parts).arrayBuffer(),await file.arrayBuffer());
  }
  assert.equal(element('file-selection').hidden,true); assert.equal(element('transfer-progress').hidden,true);
});
test('el sexto número conecta automáticamente; cinco números no abren una sala', () => {
  const {element,peers,expire} = setup();
  element('room-input').value = '00123'; element('room-input').fire('input'); expire(300); assert.equal(peers.length,0);
  element('room-input').value = '001234'; element('room-input').fire('input'); expire(300); assert.equal(peers.length,1);
  peers[0].emit('open'); assert.equal(peers[0].target,'reynoso-drop-001234');
  assert.equal(element('room-code').textContent,'001 234'); assert.equal(element('send-text').disabled,true);
});
test('equipos nuevos necesitan permiso; el autorizado vuelve solo y la lista conserva el estado real', () => {
  const {element,peers,Connection} = setup(); element('device-name').value='Laptop personal'; element('create-room').fire('click');
  const host=peers[0]; host.emit('open'); assert.match(host.id,/^reynoso-drop-\d{6}$/);
  const token=protocol.newCode(); const first=new Connection({device:'iPad',kind:'iPad',token});
  host.emit('connection',first); first.establish(); assert.equal(element('device-request').hidden,false); assert.equal(element('remote-device-name').textContent,'iPad');
  assert.equal(first.messages.length,0); element('accept-device').fire('click');
  assert.equal(first.messages[0].type,'approved'); assert.equal(first.messages[0].device,'Laptop personal'); assert.equal(element('device-count').textContent,'2 / 2 conectados');
  first.close(); assert.equal(host.destroyed,false); assert.equal(element('remote-device-status').textContent,'Sin conectar');
  const returning=new Connection({device:'iPad',kind:'iPad',token}); host.emit('connection',returning); returning.establish();
  assert.equal(returning.messages[0].type,'approved'); assert.equal(element('device-request').hidden,true);
  returning.close(); const other=new Connection({device:'Laptop corporativa',kind:'Laptop Windows',token:protocol.newCode()}); host.emit('connection',other); other.establish();
  assert.equal(other.messages.length,0); assert.equal(element('device-request').hidden,false);
});
test('sala sin conectar vence a los diez minutos y las colisiones se reintentan', () => {
  const {element,peers,expire}=setup(); element('create-room').fire('click'); const first=peers[0];
  first.emit('error',{type:'unavailable-id'}); assert.equal(peers.length,2); assert.equal(first.destroyed,true);
  peers[1].emit('open'); expire(10*60*1000); assert.equal(peers[1].destroyed,true); assert.equal(element('room-details').hidden,true); assert.equal(element('status').textContent,'Sin conexión');
});
