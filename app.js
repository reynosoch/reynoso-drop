import { MAX_TEXT, MAX_FILE, MAX_MEMORY, CHUNK_SIZE, newCode, formatCode, parseCode, validId, safeName, sizeLabel, validOffer, digest, FileReceiver } from './protocol.js';
const $ = id => document.getElementById(id);
let peer = null, connection = null, incoming = null, ready = false, room = '', host = false;
let connectTimer, signalTimer, toastTimer, outgoingId = null, busy = false, usedMemory = 0;
const pending = new Map(), receivers = new Map(), urls = new Set();
const device = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : /Windows/.test(navigator.userAgent) ? 'Laptop Windows' : 'Otro dispositivo';
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
function error(message) { $('session-error').textContent = message; $('session-error').hidden = false; }
function status(message, kind = '') { $('status').textContent = message; $('status').className = `badge ${kind}`; }
function controls() { $('send-text').disabled = !ready || !$('text-input').value.trim() || busy; $('file-zone').disabled = !ready || busy; $('file-input').disabled = !ready || busy; }
function ack(key, value = true, fail = null) { const task = pending.get(key); if (!task) return; clearTimeout(task.timer); pending.delete(key); fail ? task.reject(new Error(fail)) : task.resolve(value); }
function send(msg) { if (!connection?.open) throw new Error('El otro dispositivo se desconectó'); connection.send(msg); }
function request(msg, key, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(key); reject(new Error('El otro dispositivo no respondió a tiempo')); }, timeout);
    pending.set(key, { resolve, reject, timer });
    try { send(msg); } catch (e) { ack(key, null, e.message); }
  });
}
function dropReceiver(id, message) {
  const entry = receivers.get(id); if (!entry) return;
  clearTimeout(entry.timer);
  usedMemory -= entry.offer.size; receivers.delete(id); entry.card.remove();
  if (message) toast(message); updateInbox();
}
function reset() {
  ready = false; room = ''; host = false;
  clearTimeout(connectTimer); clearTimeout(signalTimer);
  for (const key of [...pending.keys()]) ack(key, null, 'La sala se cerró');
  for (const id of [...receivers.keys()]) dropReceiver(id);
  const previous = connection, next = incoming, previousPeer = peer;
  connection = incoming = peer = null;
  previous?.close(); next?.close(); previousPeer?.destroy();
  $('device-request').hidden = true; $('room-details').hidden = true; $('setup').hidden = false;
  $('create-room').disabled = $('join-room').disabled = false;
  status('Sin conexión'); controls();
  history.replaceState(null, '', location.pathname + location.search);
}
function disconnected(conn) {
  if (conn !== connection && conn !== incoming) return;
  reset(); error('El otro dispositivo se desconectó. Crea una sala nueva para continuar.');
}
function connected() {
  clearTimeout(connectTimer); ready = true; status('Conectado', 'connected');
  $('connection-hint').textContent = 'Las dos pantallas están conectadas. Puedes enviar en ambas direcciones.';
  $('session-error').hidden = true; controls(); toast('Tu otra pantalla está conectada');
}
function showRoom() {
  $('setup').hidden = true; $('room-details').hidden = false; $('room-code').textContent = formatCode(room);
  $('connection-hint').textContent = host ? 'Abre esta misma página en el otro dispositivo, pega el código y permite la conexión aquí.' : 'Espera a que el primer dispositivo permita tu conexión.';
  status(host ? 'Esperando dispositivo' : 'Conectando…', 'waiting');
}
function wire(conn, isIncoming) {
  conn.on('error', () => disconnected(conn));
  conn.on('close', () => disconnected(conn));
  conn.on('open', () => {
    if (isIncoming) {
      if (incoming !== conn) { conn.close(); return; }
      const name = typeof conn.metadata?.device === 'string' ? conn.metadata.device.slice(0, 40) : 'Otro dispositivo';
      $('request-name').textContent = `${name} quiere conectar`;
      $('device-request').hidden = false;
      connectTimer = setTimeout(() => { if (incoming === conn) { incoming = null; conn.close(); $('device-request').hidden = true; toast('La solicitud de conexión expiró'); } }, 90000);
    } else { status('Esperando permiso', 'waiting'); }
  });
  conn.on('data', msg => {
    if (conn === incoming) return; // Nothing is accepted before local device approval.
    if (conn !== connection || !msg || typeof msg !== 'object') return;
    handle(msg).catch(e => { error(e.message); if (validId(msg.id)) { try { send({ type: 'failed', id: msg.id, reason: e.message }); } catch { /* disconnected */ } dropReceiver(msg.id); } });
  });
}
function start(isHost, code) {
  reset(); $('session-error').hidden = true;
  if (!window.Peer || !window.RTCPeerConnection || !crypto.subtle) { error('Este navegador no permite WebRTC. Usa una versión reciente de Chrome, Edge o Safari mediante HTTPS.'); return; }
  room = code; host = isHost;
  $('create-room').disabled = $('join-room').disabled = true; status('Abriendo sala…', 'waiting');
  // Public broker only exchanges session metadata; payload uses encrypted WebRTC.
  const instance = new window.Peer(isHost ? `reynoso-drop-${room}` : undefined, { debug: 0, config: { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] } });
  peer = instance;
  signalTimer = setTimeout(() => { if (peer === instance) { reset(); error('No se pudo abrir la sala. La red o el servicio de conexión pueden no estar disponibles.'); } }, 25000);
  instance.on('open', () => {
    if (peer !== instance) return;
    clearTimeout(signalTimer); showRoom();
    if (!host) {
      connection = instance.connect(`reynoso-drop-${room}`, { reliable: true, serialization: 'binary', metadata: { device } });
      wire(connection, false);
      connectTimer = setTimeout(() => { if (!ready && peer === instance) { reset(); error('No conectó. Revisa que el primer dispositivo esté abierto y acepte el permiso. Si la red corporativa bloquea WebRTC, consulta con TI.'); } }, 90000);
    }
  });
  instance.on('connection', conn => {
    if (!host || incoming || connection || peer !== instance) { conn.close(); return; }
    incoming = conn; wire(conn, true);
  });
  instance.on('error', e => {
    if (peer !== instance) return;
    const message = e.type === 'peer-unavailable' ? 'No encontré esa sala. Comprueba el código y que la otra pantalla siga abierta.' : e.type === 'unavailable-id' ? 'Esa sala ya existe. Crea otra.' : 'No se pudo conectar. PeerJS o WebRTC pueden estar bloqueados por esta red. Consulta con TI si usas la laptop corporativa.';
    reset(); error(message);
  });
  instance.on('disconnected', () => { if (peer === instance && !ready) { reset(); error('Se perdió la conexión con el servicio de salas. Vuelve a crear la sala.'); } });
}
function updateInbox() { const count = $('inbox-items').children.length; $('inbox-empty').hidden = count > 0; $('clear-inbox').disabled = count === 0; }
function makeCard(label) {
  if ($('inbox-items').children.length >= 30) throw new Error('Bandeja llena. Vacíala antes de recibir más.');
  const card = document.createElement('article'); card.className = 'item';
  const meta = document.createElement('div'); meta.className = 'item-meta';
  const kind = document.createElement('span'); kind.textContent = label;
  const time = document.createElement('span'); time.textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  meta.append(kind, time); card.append(meta); $('inbox-items').prepend(card); updateInbox(); return card;
}
function addButton(parent, text, action, kind = 'secondary') { const button = document.createElement('button'); button.className = `button ${kind}`; button.textContent = text; button.addEventListener('click', action); parent.append(button); return button; }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { const input = document.createElement('textarea'); input.value = text; input.setAttribute('readonly', ''); document.body.append(input); input.select(); input.setSelectionRange(0, input.value.length); const ok = document.execCommand('copy'); input.remove(); toast(ok ? 'Copiado' : 'El navegador bloqueó copiar. Selecciona el texto y cópialo manualmente.'); }
}
function download(blob, name) {
  const url = URL.createObjectURL(blob); urls.add(url); const a = document.createElement('a'); a.href = url; a.download = safeName(name); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 60000);
}
function textCard(text, sent = false) {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (usedMemory + bytes > MAX_MEMORY) throw new Error('Bandeja llena. Vacíala para continuar.');
  const card = makeCard(sent ? 'TEXTO · ENVIADO' : 'TEXTO · RECIBIDO'); usedMemory += bytes;
  const pre = document.createElement('pre'); pre.textContent = text; card.append(pre);
  const actions = document.createElement('div'); actions.className = 'item-actions'; card.append(actions);
  addButton(actions, 'Copiar', () => copy(text)); addButton(actions, 'Descargar .txt', () => download(new Blob([text], {type:'text/plain;charset=utf-8'}), 'texto.txt'));
  addButton(actions, 'Quitar', () => { usedMemory -= bytes; card.remove(); updateInbox(); }, 'subtle');
}
function fileCard(offer) {
  const card = makeCard('ARCHIVO · SOLICITUD');
  const name = document.createElement('strong'); name.className = 'item-name'; name.textContent = safeName(offer.name);
  const state = document.createElement('div'); state.className = 'item-size'; state.textContent = `${sizeLabel(offer.size)} · Esperando tu permiso`;
  const actions = document.createElement('div'); actions.className = 'item-actions'; card.append(name, state, actions);
  const entry = { offer, card, state, actions, receiver: null, timer: null }; receivers.set(offer.id, entry); usedMemory += offer.size;
  entry.timer = setTimeout(() => { try { send({ type: 'failed', id: offer.id, reason: 'La solicitud de archivo expiró' }); } catch { /* disconnected */ } dropReceiver(offer.id); }, 90000);
  addButton(actions, 'Recibir archivo', () => {
    clearTimeout(entry.timer); entry.receiver = new FileReceiver(offer); actions.replaceChildren(); state.textContent = 'Recibiendo… 0%';
    addButton(actions, 'Cancelar', () => { send({type:'failed',id:offer.id,reason:'El receptor canceló el archivo'}); dropReceiver(offer.id); }, 'subtle danger');
    send({type:'ack',key:`offer:${offer.id}`});
  }, 'primary');
  addButton(actions, 'Rechazar', () => { clearTimeout(entry.timer); send({type:'failed',id:offer.id,reason:'El otro dispositivo rechazó el archivo'}); dropReceiver(offer.id); }, 'subtle');
}
async function handle(msg) {
  if (msg.type === 'approved' && !host) { connected(); return; }
  if (!ready) return;
  if (msg.type === 'ack' && typeof msg.key === 'string' && msg.key.length < 100) { ack(msg.key); return; }
  if (msg.type === 'failed' && validId(msg.id)) {
    const reason = typeof msg.reason === 'string' ? msg.reason.slice(0, 180) : 'Se canceló el envío';
    for (const key of [...pending.keys()]) if (key.includes(msg.id)) ack(key, null, reason);
    dropReceiver(msg.id, reason); return;
  }
  if (msg.type === 'text') {
    if (!validId(msg.id) || typeof msg.text !== 'string' || !msg.text.trim() || new TextEncoder().encode(msg.text).byteLength > MAX_TEXT) throw new Error('El texto supera el límite de 512 KB o no es válido');
    textCard(msg.text); send({type:'ack',key:`text:${msg.id}`}); toast('Texto recibido'); return;
  }
  if (msg.type === 'file-offer') {
    if (!validOffer(msg, usedMemory) || receivers.size || busy) throw new Error('Archivo no admitido, bandeja llena o hay otro envío en curso');
    fileCard(msg); toast('Tienes un archivo por recibir'); return;
  }
  if (msg.type === 'file-chunk') {
    const entry = receivers.get(msg.id); if (!entry?.receiver) throw new Error('Archivo sin permiso de recepción');
    entry.receiver.append(msg); entry.state.textContent = `Recibiendo… ${Math.floor(entry.receiver.size / entry.offer.size * 100)}%`;
    send({type:'ack',key:`chunk:${msg.id}:${msg.index}`}); return;
  }
  if (msg.type === 'file-end') {
    const entry = receivers.get(msg.id); if (!entry?.receiver) throw new Error('Archivo sin permiso de recepción');
    const blob = await entry.receiver.finish();
    if (receivers.get(msg.id) !== entry || !ready) return;
    clearTimeout(entry.timer); receivers.delete(msg.id); entry.actions.replaceChildren();
    entry.card.querySelector('.item-meta span').textContent = 'ARCHIVO · RECIBIDO'; entry.state.textContent = `${sizeLabel(blob.size)} · Integridad verificada`;
    addButton(entry.actions, 'Descargar', () => download(blob, entry.offer.name), 'primary');
    addButton(entry.actions, 'Quitar', () => { usedMemory -= entry.offer.size; entry.card.remove(); updateInbox(); }, 'subtle');
    send({type:'ack',key:`end:${msg.id}`}); toast('Archivo recibido y verificado');
  }
}
async function sendText() {
  const text = $('text-input').value;
  if (!ready || busy || !text.trim()) return;
  if (new TextEncoder().encode(text).byteLength > MAX_TEXT) { toast('El texto supera 512 KB. Envíalo como archivo.'); return; }
  if (usedMemory + new TextEncoder().encode(text).byteLength > MAX_MEMORY || $('inbox-items').children.length >= 30) { toast('Vacía la bandeja antes de enviar más.'); return; }
  busy = true; controls();
  try { const id = newCode(); await request({type:'text',id,text}, `text:${id}`); textCard(text, true); if ($('text-input').value === text) { $('text-input').value = ''; countText(); } toast('Texto entregado'); }
  catch (e) { error(e.message); }
  finally { busy = false; controls(); }
}
async function sendFiles(files) {
  if (!ready || busy || receivers.size) { toast('Conecta la otra pantalla y termina el envío actual.'); return; }
  const list = Array.from(files); if (!list.length) return;
  busy = true; controls();
  try {
    for (const file of list) {
      if (!ready) break;
      if (file.size > MAX_FILE) { toast(`${safeName(file.name)} supera 50 MB. Se omitió.`); continue; }
      const id = newCode(); outgoingId = id; $('transfer-progress').hidden = false; $('progress-name').textContent = safeName(file.name); $('progress-bar').value = 0; $('progress-label').textContent = 'Preparando archivo…';
      const hash = await digest(await file.arrayBuffer());
      if (outgoingId !== id || !ready) throw new Error('Envío cancelado');
      $('progress-label').textContent = 'Espera a que el otro dispositivo pulse Recibir archivo';
      await request({type:'file-offer', id, name:safeName(file.name), size:file.size, hash}, `offer:${id}`, 95000);
      let index = 0;
      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        const bytes = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        if (outgoingId !== id || !ready) throw new Error('Envío cancelado');
        await request({type:'file-chunk',id,index,bytes}, `chunk:${id}:${index}`); index++;
        const percent = Math.floor(Math.min(offset + CHUNK_SIZE, file.size) / file.size * 100);
        $('progress-bar').value = percent; $('progress-label').textContent = `${percent}% · ${sizeLabel(file.size)}`;
      }
      $('progress-label').textContent = 'Verificando integridad en la otra pantalla…';
      await request({type:'file-end',id}, `end:${id}`, 60000);
      toast(`${safeName(file.name)} entregado`);
    }
  } catch (e) {
    if (outgoingId && ready) { try { send({type:'failed',id:outgoingId,reason:'El envío se canceló'}); } catch { /* disconnected */ } }
    error(e.message);
  } finally { outgoingId = null; busy = false; $('transfer-progress').hidden = true; $('file-input').value = ''; controls(); }
}
function countText() { $('text-counter').textContent = `${$('text-input').value.length.toLocaleString('es-MX')} caracteres`; controls(); }
$('create-room').addEventListener('click', () => start(true, newCode()));
$('join-room').addEventListener('click', () => { const code = parseCode($('room-input').value); if (!code) { error('Pega el código completo de 24 caracteres o el enlace de la sala.'); return; } start(false, code); });
$('room-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('join-room').disabled) $('join-room').click(); });
$('accept-device').addEventListener('click', () => { if (!incoming?.open) return; clearTimeout(connectTimer); connection = incoming; incoming = null; $('device-request').hidden = true; send({type:'approved'}); connected(); });
$('reject-device').addEventListener('click', () => { const conn = incoming; incoming = null; clearTimeout(connectTimer); conn?.close(); $('device-request').hidden = true; toast('Dispositivo rechazado'); });
$('copy-code').addEventListener('click', () => copy(formatCode(room)));
$('copy-link').addEventListener('click', () => { const url = new URL(location.href); url.hash = room; copy(url.href); });
$('leave-room').addEventListener('click', () => { reset(); toast('Sala cerrada'); });
$('text-input').addEventListener('input', countText);
$('text-input').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendText(); } if (e.key === 'Tab') { e.preventDefault(); const area = e.target; const start = area.selectionStart; area.setRangeText('  ', start, area.selectionEnd, 'end'); countText(); } });
$('send-text').addEventListener('click', sendText);
$('paste-text').addEventListener('click', async () => { try { $('text-input').value = (await navigator.clipboard.readText()).slice(0, MAX_TEXT); countText(); $('text-input').focus(); } catch { $('text-input').focus(); toast('Pega con Ctrl+V o mantén presionado el campo en iPad.'); } });
$('file-zone').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', e => sendFiles(e.target.files));
for (const event of ['dragenter', 'dragover']) $('file-zone').addEventListener(event, e => { e.preventDefault(); if (ready && !busy) $('file-zone').classList.add('drag-over'); });
for (const event of ['dragleave', 'drop']) $('file-zone').addEventListener(event, e => { e.preventDefault(); $('file-zone').classList.remove('drag-over'); if (event === 'drop') sendFiles(e.dataTransfer.files); });
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
$('cancel-transfer').addEventListener('click', () => { const id = outgoingId; if (!id) return; outgoingId = null; try { send({type:'failed',id,reason:'El remitente canceló el envío'}); } catch { /* disconnected */ } for (const key of [...pending.keys()]) if (key.includes(id)) ack(key, null, 'Envío cancelado'); });
$('clear-inbox').addEventListener('click', () => {
  if (receivers.size) { toast('Termina o rechaza el archivo pendiente antes de vaciar.'); return; }
  if (!confirm('¿Vaciar la bandeja? Descarga primero lo que quieras conservar.')) return;
  $('inbox-items').replaceChildren(); usedMemory = 0; for (const url of urls) URL.revokeObjectURL(url); urls.clear(); updateInbox();
});
window.addEventListener('pagehide', reset);
const initial = parseCode(location.hash.slice(1)); if (initial) { $('room-input').value = formatCode(initial); history.replaceState(null, '', location.pathname + location.search); }
controls();
