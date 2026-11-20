
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

const safraId = Number(event.safraId);
if (!Number.isInteger(safraId) || safraId <= 0) return { ok: false, motivo: 'invalido', aviso: 'Safra inválida.' };
const c = ((await sf(63, { safraId })).rows || [])[0];
if (!c) return { ok: false, motivo: 'invalido', aviso: 'Safra não encontrada na sua adega.' };
const ano = new Date().getFullYear();
const desc = [
  'Vinho: ' + c.NOME, c.PRODUTOR ? 'Produtor: ' + c.PRODUTOR : '', c.TIPO ? 'Tipo: ' + c.TIPO : '', c.UVA ? 'Uva(s): ' + c.UVA : '',
  c.PAIS || c.REGIAO ? 'Origem: ' + [c.REGIAO, c.PAIS].filter(Boolean).join(', ') : '', 'Safra: ' + c.ANO + ' (' + (ano - Number(c.ANO)) + ' anos em ' + ano + ')',
  c.JANELA_FIM ? 'Janela de consumo: ' + c.JANELA_INICIO + ' a ' + c.JANELA_FIM + ', auge ' + c.JANELA_AUGE : '',
].filter(Boolean).join('\n');
const body = {
  contents: [{ parts: [{ text: 'Você é um sommelier. Escreva, em português do Brasil, instruções práticas de serviço para esta garrafa, levando em conta o tipo, a uva, a região e principalmente a idade da safra (vinhos velhos: rolha frágil, borra, decantação curta e cuidadosa; tintos jovens e encorpados: decantação mais longa; brancos e espumantes: em geral não decantar).\n' + desc +
    '\nCampos: temperatura (faixa em °C e quanto tempo antes tirar da adega ou pôr na geladeira), decantacao (decantar ou não, por quanto tempo, ou só abrir antes para respirar), abertura (como abrir: saca-rolhas indicado, cuidados com a rolha e com a borra, espumante com segurança), taca (taça indicada), depois_aberto (quanto tempo dura depois de aberto e como guardar). Frases curtas e diretas, até 3 frases por campo, sem markdown.' }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: {
      temperatura: { type: 'STRING' }, decantacao: { type: 'STRING' }, abertura: { type: 'STRING' }, taca: { type: 'STRING' }, depois_aberto: { type: 'STRING' } },
      required: ['temperatura', 'decantacao', 'abertura', 'taca', 'depois_aberto'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const servico = { temperatura: txt(d.temperatura, 400), decantacao: txt(d.decantacao, 2000), abertura: txt(d.abertura, 2000), taca: txt(d.taca, 400), depoisAberto: txt(d.depois_aberto, 600) };
if (!Object.values(servico).some(Boolean)) return { ok: false, motivo: 'indisponivel', aviso: 'O sommelier não respondeu agora. Tente de novo em instantes.' };
await sf(64, { safraId, ...servico, origem: 'IA' });
return { ok: true, servico: { ...servico, origem: 'IA' } };
