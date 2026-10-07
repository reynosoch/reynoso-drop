import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCode,parseCode,formatCode,validOffer,safeName,digest,FileReceiver,CHUNK_SIZE,MAX_FILE,MAX_MEMORY} from '../protocol.js';
test('códigos aleatorios y enlaces conservan la sala sin aceptar contenido arbitrario', () => {
  const code = newCode(); assert.match(code,/^[a-f0-9]{24}$/); assert.notEqual(code,newCode());
  assert.equal(parseCode(formatCode(code).toUpperCase()),code); assert.equal(parseCode(`https://reynosoch.github.io/reynoso-drop/#${code}`),code);
  assert.equal(parseCode('<script>alert(1)</script>'),null); assert.equal(parseCode('123456'),null);
});
test('ofertas limitan memoria, tamaños e identificadores; nombres no atraviesan rutas', async () => {
  const base = {id:newCode(),name:'demo.txt',size:0,hash:await digest(new ArrayBuffer(0))};
  assert.equal(validOffer(base),true);
  for (const size of [-1,NaN,Infinity,MAX_FILE+1,1.5]) assert.equal(validOffer({...base,size}),false);
  assert.equal(validOffer({...base,size:1},MAX_MEMORY),false); assert.equal(validOffer({...base,id:'bad'}),false);
  assert.equal(safeName('../a\\b\u0000.txt'),'.._a_b_.txt');
});
test('transferencia binaria en bloques devuelve exactamente los bytes originales', async () => {
  const bytes = new Uint8Array(CHUNK_SIZE*2+31); for (let i=0;i<bytes.length;i++) bytes[i]=i%251;
  const offer = {id:newCode(),name:'test.bin',size:bytes.length,hash:await digest(bytes.buffer)};
  const receiver = new FileReceiver(offer);
  let index=0; for(let i=0;i<bytes.length;i+=CHUNK_SIZE) receiver.append({id:offer.id,index:index++,bytes:bytes.slice(i,i+CHUNK_SIZE).buffer});
  assert.deepEqual(new Uint8Array(await (await receiver.finish()).arrayBuffer()),bytes);
});
test('rechaza bloques fuera de orden, corruptos, extra y archivos incompletos', async () => {
  const bytes = new Uint8Array([1,2,3]); const offer={id:newCode(),name:'test',size:3,hash:await digest(bytes.buffer)};
  const r = new FileReceiver(offer); assert.throws(()=>r.append({id:offer.id,index:1,bytes:bytes.buffer}));
  await assert.rejects(r.finish(),/incompleto/);
  assert.throws(()=>r.append({id:offer.id,index:0,bytes:new ArrayBuffer(4)}));
  r.append({id:offer.id,index:0,bytes:new Uint8Array([4,5,6]).buffer}); await assert.rejects(r.finish(),/dañado/);
  assert.throws(()=>r.append({id:offer.id,index:1,bytes:bytes.buffer}));
});
test('archivos vacíos también se verifican', async () => {
  const r=new FileReceiver({id:newCode(),name:'empty.txt',size:0,hash:await digest(new ArrayBuffer(0))}); assert.equal((await r.finish()).size,0);
});
