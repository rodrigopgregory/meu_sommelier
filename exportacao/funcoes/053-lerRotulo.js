
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

let imagem;
try { imagem = await baixarBase64(event.fotoKey); } catch (e) { return { ok: false, motivo: 'foto', aviso: 'Não consegui abrir a foto. Tente outra imagem.' }; }
const TIPOS = { 'tinto': 1, 'branco': 2, 'rose': 3, 'rosé': 3, 'espumante': 4, 'fortificado': 5, 'sobremesa': 6, 'laranja': 7 };
const body = {
  contents: [{ parts: [
    { inline_data: { mime_type: String(event.mime || 'image/jpeg').startsWith('image/') ? String(event.mime || 'image/jpeg') : 'image/jpeg', data: imagem } },
    { text: 'Esta é a foto do rótulo de um vinho. Leia só o que está escrito ou é evidente no rótulo e devolva os campos. Campo que não dá para reconhecer com segurança fica vazio (texto "" ou safra 0). Não invente. tipo é um destes: tinto, branco, rose, espumante, fortificado, sobremesa, laranja, ou "". pais e regiao em português do Brasil. legivel = false se a foto não mostra um rótulo de vinho legível.' }
  ] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: {
      legivel: { type: 'BOOLEAN' }, nome: { type: 'STRING' }, produtor: { type: 'STRING' }, pais: { type: 'STRING' },
      regiao: { type: 'STRING' }, uva: { type: 'STRING' }, tipo: { type: 'STRING' }, safra: { type: 'INTEGER' } },
      required: ['legivel', 'nome', 'produtor', 'pais', 'regiao', 'uva', 'tipo', 'safra'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
if (audio) termo = txt(d.falado, 200);
if (audio && !termo) return { ok: false, motivo: 'audio', aviso: 'Não entendi o nome no áudio. Fale de novo ou escreva.' };
const ano = Number(d.safra);
const campos = {
  nome: txt(d.nome, 200), produtor: txt(d.produtor, 200), pais: txt(d.pais, 80), regiao: txt(d.regiao, 120), uva: txt(d.uva, 200),
  tipoId: TIPOS[txt(d.tipo, 20).toLowerCase()] || 0, safra: Number.isInteger(ano) && ano >= 1900 && ano <= 2100 ? ano : 0,
};
const reconhecidos = Object.entries(campos).filter(([k, v]) => v && v !== 0).length;
if (d.legivel === false || reconhecidos === 0) return { ok: false, motivo: 'ilegivel', aviso: 'Não consegui ler o rótulo nesta foto. Preencha à mão; a foto fica anexada.' };
let duplicado = null;
if (campos.nome) {
  const r = await sf(25, { nome: campos.nome, produtor: campos.produtor });
  if (r.rows && r.rows[0]) duplicado = { id: r.rows[0].ID, nome: r.rows[0].NOME, produtor: r.rows[0].PRODUTOR };
}
return { ok: true, campos, duplicado };
