export const MAX_FILE = 50 * 1024 * 1024;
export const MAX_MEMORY = 100 * 1024 * 1024;
export const MAX_TEXT = 512 * 1024;
export const CHUNK_SIZE = 64 * 1024;
export function newCode() { return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); }
export function formatCode(code) { return code.match(/.{1,4}/g)?.join('-') || ''; }
export function parseCode(value) {
  let raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) { try { raw = new URL(raw).hash.slice(1); } catch { return null; } }
  raw = raw.replace(/[-\s]/g, '').toLowerCase();
  return /^[a-f0-9]{24}$/.test(raw) ? raw : null;
}
export function validId(id) { return typeof id === 'string' && /^[a-f0-9-]{24,40}$/.test(id); }
export function safeName(name) { return String(name).replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 180) || 'archivo'; }
export function sizeLabel(bytes) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
export function validOffer(msg, used = 0) {
  return msg && validId(msg.id) && typeof msg.name === 'string' && msg.name.length > 0 && msg.name.length <= 255 && Number.isSafeInteger(msg.size) && msg.size >= 0 && msg.size <= MAX_FILE && used + msg.size <= MAX_MEMORY && typeof msg.hash === 'string' && /^[a-f0-9]{64}$/.test(msg.hash);
}
export async function digest(buffer) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join(''); }
export class FileReceiver {
  constructor(offer) { if (!validOffer(offer)) throw new Error('Archivo no válido'); this.offer = offer; this.chunks = []; this.size = 0; this.index = 0; }
  append(msg) {
    const data = msg.bytes;
    if (msg.id !== this.offer.id || msg.index !== this.index || !(data instanceof ArrayBuffer) || data.byteLength !== Math.min(CHUNK_SIZE, this.offer.size - this.size) || data.byteLength === 0) throw new Error('Bloque de archivo no válido');
    this.chunks.push(data); this.index++; this.size += data.byteLength;
  }
  async finish() {
    if (this.size !== this.offer.size) throw new Error('Archivo incompleto');
    // Generic MIME prevents treating untrusted received HTML/SVG as executable previews.
    const blob = new Blob(this.chunks, { type: 'application/octet-stream' });
    if (await digest(await blob.arrayBuffer()) !== this.offer.hash) throw new Error('El archivo llegó dañado');
    this.chunks = []; return blob;
  }
}
