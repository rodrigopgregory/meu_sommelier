
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

const TIPOS = { 1: 'Tinto', 2: 'Branco', 3: 'Rosé', 4: 'Espumante', 5: 'Fortificado', 6: 'Sobremesa', 7: 'Laranja' };
const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const nome = t(event.nome, 200);
const safra = Number(event.ano);
if (!nome) return { ok: false, motivo: 'invalido', aviso: 'Informe o nome do vinho.' };
if (!Number.isInteger(safra) || safra < 1900 || safra > 2100) return { ok: false, motivo: 'invalido', aviso: 'Informe o ano da safra.' };
const hoje = new Date().getFullYear();
const desc = [
  'Vinho: ' + nome, t(event.produtor, 150) ? 'Produtor: ' + t(event.produtor, 150) : '', TIPOS[Number(event.tipoId)] ? 'Tipo: ' + TIPOS[Number(event.tipoId)] : '',
  t(event.uva, 150) ? 'Uva(s): ' + t(event.uva, 150) : '', [t(event.regiao, 100), t(event.pais, 60)].filter(Boolean).length ? 'Origem: ' + [t(event.regiao, 100), t(event.pais, 60)].filter(Boolean).join(', ') : '',
  'Safra: ' + safra, 'Ano atual: ' + hoje,
].filter(Boolean).join('\n');
const body = {
  contents: [{ parts: [{ text: 'Você é um sommelier. Estime a janela de consumo desta garrafa (anos do calendário): inicio = primeiro ano bom para beber, auge = melhor ano, fim = último ano antes de começar a cair. Considere o produtor, a uva, a região, o tipo e a qualidade da safra; vinhos simples e brancos leves têm janela curta, grandes tintos de guarda têm janela longa. Regras: safra <= inicio <= auge <= fim. Em comentario, uma ou duas frases curtas em português do Brasil explicando o porquê, sem markdown.\n' + desc }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: { inicio: { type: 'INTEGER' }, auge: { type: 'INTEGER' }, fim: { type: 'INTEGER' }, comentario: { type: 'STRING' } }, required: ['inicio', 'auge', 'fim', 'comentario'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
let inicio = Math.round(Number(d.inicio)), auge = Math.round(Number(d.auge)), fim = Math.round(Number(d.fim));
if (![inicio, auge, fim].every(Number.isFinite)) return { ok: false, motivo: 'indisponivel', aviso: 'O sommelier não respondeu agora. Tente de novo em instantes.' };
inicio = Math.min(Math.max(inicio, safra), 2200); auge = Math.min(Math.max(auge, inicio), 2200); fim = Math.min(Math.max(fim, auge), 2200);
return { ok: true, inicio, auge, fim, comentario: t(d.comentario, 400) };
