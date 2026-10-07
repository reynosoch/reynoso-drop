import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist');
for (const file of ['index.html','styles.css','theme.css','app.js','protocol.js','favicon.svg','.nojekyll','vendor']) await cp(file, `dist/${file}`, {recursive:true});
console.log('Sitio estático listo en dist/');
