// Testes do sommelier e da leitura de rótulo (CA-16, CA-19, CA-20, CA-21, FA-16). Uso: node scripts/teste-ia.mjs [rotulo.jpg] [audio.wav]
import 'dotenv/config';
import fs from 'fs';
import { configureSdkMitra, executeServerFunctionMitra, listServerFunctionsMitra, uploadFilePrivateMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
const S = new Map(((await listServerFunctionsMitra({ projectId })).result || []).map(f => [f.name, f.id]));
async function sf(n, input = {}) {
  const t = Date.now();
  const r = await executeServerFunctionMitra({ projectId, serverFunctionId: S.get(n), input });
  if (r.result.executionStatus !== 'COMPLETED') throw new Error(n + ': ' + JSON.stringify(r.result.error));
  let o = r.result.output; if (typeof o === 'string') try { o = JSON.parse(o); } catch {}
  console.log(`  (${n} ${Date.now() - t} ms)`);
  return o;
}
const mostrar = (o) => console.log(JSON.stringify(o, null, 1).slice(0, 1200));
const [rotulo, audio] = process.argv.slice(2);
for (const texto of ['Vou jantar risoto de cogumelos', 'Vou comer sushi de salmão com shoyu', 'Qual a capital da França?']) {
  console.log('>>', texto); mostrar(await sf('sommelierPerguntar', { texto }));
}
if (audio) {
  const up = await uploadFilePrivateMitra({ projectId, file: new Blob([fs.readFileSync(audio)], { type: 'audio/wav' }) });
  console.log('>> áudio'); mostrar(await sf('sommelierPerguntar', { audioKey: up.result.key }));
}
if (rotulo) {
  const up = await uploadFilePrivateMitra({ projectId, file: new Blob([fs.readFileSync(rotulo)], { type: 'image/jpeg' }) });
  console.log('>> rótulo'); mostrar(await sf('lerRotulo', { fotoKey: up.result.key, mime: 'image/jpeg' }));
}
