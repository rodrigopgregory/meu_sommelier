
const mitra = require('mitra-sdk');
const projectId = Number(process.env.MITRA_PROJECT_ID);
async function sf(id, input) {
  const r = await mitra.executeServerFunctionMitra({ projectId, serverFunctionId: id, input: input || {} });
  if (!r || !r.result || r.result.executionStatus !== 'COMPLETED') {
    const e = r && r.result && r.result.error;
    throw new Error(typeof e === 'string' ? e : JSON.stringify(e || 'falha'));
  }
  let o = r.result.output;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch (x) {} }
  return o;
}
function json(v) { if (v == null) return null; if (typeof v === 'string') { try { return JSON.parse(v); } catch (x) { return null; } } return v; }
const AVISOS = {
  chave: 'A chave do Google Gemini não foi aceita. Quem administra o app precisa trocá-la.',
  cota: 'O Google Gemini está no limite de uso grátis agora. Tente de novo em alguns minutos.',
  indisponivel: 'O Google Gemini não respondeu agora. Tente de novo em instantes.',
};
async function gemini(body) {
  let motivo = 'indisponivel';
  for (const id of [1, 55, 56, 57, 20, 58, 59, 60]) {
    let o;
    try { o = await sf(id, { body }); } catch (e) { motivo = 'indisponivel'; continue; }
    const sc = Number(o && o.statusCode);
    if (sc === 200) {
      const parts = (((o.body || {}).candidates || [])[0] || {}).content;
      const texto = ((parts && parts.parts) || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
      if (texto) return { ok: true, texto };
      motivo = 'indisponivel'; continue;
    }
    const msg = String((((o || {}).body || {}).error || {}).message || '');
    if (sc === 401 || sc === 403 || (sc === 400 && /api key/i.test(msg))) { if (motivo !== 'cota') motivo = 'chave'; continue; }
    motivo = sc === 429 ? 'cota' : (motivo === 'cota' ? 'cota' : 'indisponivel');
  }
  return { ok: false, motivo, aviso: AVISOS[motivo] };
}
async function baixarBase64(key) {
  if (typeof key !== 'string' || !key.startsWith('ai-files/private/') || key.length > 400) throw new Error('arquivo inválido');
  const blob = await mitra.downloadFilePrivateMitra({ projectId, key });
  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) throw new Error('arquivo grande demais');
  return buf.toString('base64');
}

// Envia por e-mail um código de 6 dígitos (10 min, uso único) para o dono gerar o pacote completo na hora.
const crypto = require('crypto');
const DONO = 9;
const AGORA = "DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')";
const q = async (sql) => (((await mitra.runQueryMitra({ projectId, sql })) || {}).result || {}).rows || [];
const dml = (sql) => mitra.runDmlMitra({ projectId, sql });
const eu = Number((((await sf(75, {})).rows || [])[0] || {}).ID);
if (eu === 7) return { ok: true, semCodigo: true };
if (eu !== DONO) {
  if (Number.isInteger(eu)) await dml(`INSERT INTO PACOTE_EXPORTACOES (USUARIO_ID, STATUS, CRIADO_EM, AVISOS) VALUES (${eu}, 'NEGADO', ${AGORA}, 'pediu codigo sem ser o dono do app')`);
  return { ok: false, aviso: 'Só o dono do app pode gerar o pacote completo.' };
}
const recentes = Number(((await q(`SELECT COUNT(*) AS N FROM PACOTE_EXPORTACOES WHERE USUARIO_ID = ${DONO} AND STATUS IN ('CODIGO_ENVIADO', 'SUBSTITUIDO', 'NEGADO', 'GERADO', 'FALHA') AND CRIADO_EM > DATE_FORMAT(NOW() - INTERVAL 1 HOUR, '%Y-%m-%dT%H:%i:%s')`))[0] || {}).N);
if (recentes >= 6) return { ok: false, aviso: 'Muitos códigos pedidos na última hora. Espere um pouco e peça de novo.' };
await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'SUBSTITUIDO', CODIGO_HASH = NULL, CODIGO_SAL = NULL WHERE USUARIO_ID = ${DONO} AND STATUS = 'CODIGO_ENVIADO'`);
for (const r of await q(`SELECT ID, ARQUIVO_KEY FROM PACOTE_EXPORTACOES WHERE ARQUIVO_KEY IS NOT NULL`)) {
  try { await mitra.deleteFileMitra({ projectId, key: r.ARQUIVO_KEY }); } catch (e) { /* já não existe */ }
  await dml(`UPDATE PACOTE_EXPORTACOES SET ARQUIVO_KEY = NULL, DESCARTADO_EM = ${AGORA} WHERE ID = ${Number(r.ID)}`);
}
const email = String(((await q(`SELECT USERNAME FROM INT_USERS WHERE ID = ${DONO}`))[0] || {}).USERNAME || '');
if (!/^[^@\s'"<>]+@[^@\s'"<>]+$/.test(email)) return { ok: false, aviso: 'Não achei o e-mail do dono do app.' };
const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const sal = crypto.randomBytes(16).toString('hex');
const hash = crypto.createHash('sha256').update(sal + codigo).digest('hex');
await dml(`INSERT INTO PACOTE_EXPORTACOES (USUARIO_ID, STATUS, CODIGO_HASH, CODIGO_SAL, EXPIRA_EM, CRIADO_EM)
  VALUES (${DONO}, 'CODIGO_ENVIADO', '${hash}', '${sal}', DATE_FORMAT(NOW() + INTERVAL 10 MINUTE, '%Y-%m-%dT%H:%i:%s'), ${AGORA})`);
await mitra.sendEmailMitra({ projectId, to: [email], subject: 'Karanu: código para gerar o pacote completo',
  body: `<p>Seu código para gerar o pacote completo do Karanu é:</p><p style="font-size:24px;letter-spacing:4px"><b>${codigo}</b></p><p>Ele vale por 10 minutos e só uma vez. Se não foi você que pediu, ignore este e-mail.</p>` });
const [nome, dominio] = email.split('@');
return { ok: true, email: nome.slice(0, 2) + '***@' + dominio };
