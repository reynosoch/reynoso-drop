import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import * as protocol from '../protocol.js';

// Exercise real application event handlers without a network or browser.
function setup() {
  const elements = new Map(), timers = new Map(), peers = []; let timerId = 0;
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value:'', textContent:'', hidden:false, disabled:false, children:[], listeners:new Map(), addEventListener(event, fn) { this.listeners.set(event, fn); }, fire(event) { this.listeners.get(event)?.({target:this}); }, classList:{add(){},remove(){}} });
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
  const context = {...protocol, ...timersAPI, crypto, TextEncoder, URL, Blob,
    document:{getElementById:element}, navigator:{userAgent:'Windows',platform:'Win32',maxTouchPoints:0,onLine:true},
    window:{Peer,RTCPeerConnection(){},addEventListener(){}}, history:{replaceState(){}}, location:{pathname:'/reynoso-drop/',search:'',hash:''}, confirm:()=>true};
  const source = readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
  runInNewContext(source, context);
  function expire(ms) { for (const [id,timer] of [...timers]) if (timer.ms === ms && timers.has(id)) { timers.delete(id); timer.fn(); } }
  return {element,peers,Connection,expire};
}
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
