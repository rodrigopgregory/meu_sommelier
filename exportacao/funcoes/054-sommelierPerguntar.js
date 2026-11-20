
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

const STATUS = { CEDO: 'ainda cedo', JANELA: 'na janela', AUGE: 'no auge', AUGE_FIM: 'no auge, último ano da janela', SAINDO: 'saindo da janela, beber logo', PASSOU: 'passou da janela', SEM_JANELA: 'sem janela' };
const texto = typeof event.texto === 'string' ? event.texto.trim().slice(0, 2000) : '';
const audioKey = typeof event.audioKey === 'string' ? event.audioKey : '';
if (!texto && !audioKey) return { ok: false, aviso: 'Escreva ou grave a sua pergunta.' };
let audio = null;
if (audioKey) {
  try { audio = await baixarBase64(audioKey); } catch (e) { return { ok: false, aviso: 'Não consegui abrir o áudio. Grave de novo ou escreva.' }; }
  try { await mitra.deleteFileMitra({ projectId, key: audioKey }); } catch (e) {}
}
const ctx = ((await sf(48, {})).rows || [])[0] || {};
const adega = json(ctx.ADEGA) || [];
const historico = json(ctx.HISTORICO) || [];
const linhas = adega.map(a => [
  'safra_id=' + a.safraId, a.nome, a.produtor ? 'de ' + a.produtor : '', a.tipo || '', a.uva ? 'uva ' + a.uva : '',
  [a.regiao, a.pais].filter(Boolean).join(', '), 'safra ' + a.ano, a.estoque + ' garrafa(s)', STATUS[a.status] || ''
].filter(Boolean).join(' | ')).join('\n');
const conversa = historico.map(h => (h.papel === 'usuario' ? 'Usuária: ' : 'Sommelier: ') + String(h.texto).slice(0, 600)).join('\n');
const instrucoes = [
  'Você é o sommelier virtual do app Karanu. Fale em português do Brasil, de forma curta e simpática.',
  'Você responde qualquer pergunta sobre vinho: harmonização com comida, ocasiões, um vinho específico (estilo, uva, região, produtor, safra, quando beber, como servir, guarda), compra e a adega da usuária. Para assunto que não seja vinho: assunto_ok = false.',
  'A usuária mora em ' + (ctx.PAIS || 'Brasil') + ': leve em conta o clima e o que se encontra para comprar lá. Temperaturas em ' + (ctx.TEMPERATURA === 'F' ? '°F' : '°C') + '.',
  'ADEGA DA USUÁRIA (só garrafas com estoque; é a lista completa, não existe outra garrafa):',
  linhas || '(a adega está vazia)',
  'Regras:',
  '1. Se a pergunta pede um vinho para beber (prato, ocasião), primeiro procure na adega acima. Indique até 3 garrafas que combinem, pelo safra_id exato da lista, priorizando as que estão no auge ou saindo da janela.',
  '2. Nunca indique como da adega um vinho que não está na lista. Se a pergunta pede um vinho e nenhuma garrafa combinar (ou a adega estiver vazia), garrafas = [] e preencha comprar com o tipo de vinho a comprar (uva, estilo, região), deixando claro que não está na adega.',
  '3. Se a pergunta é sobre um vinho, uma uva ou um assunto de vinho (não pede indicação), responda direto em resposta (até 6 frases), garrafas = [] e comprar = "". Se o vinho perguntado está na adega, pode incluí-lo em garrafas com o safra_id.',
  '4. Quando indicar garrafas, em resposta escreva só a introdução (1 a 3 frases). NÃO repita nomes de garrafas em resposta: elas aparecem em cartões à parte. Em cada garrafa, por_que tem uma frase curta.',
  '5. Você não altera nada na adega e não dá baixa em garrafas.',
  audio ? '6. A mensagem veio por áudio: transcreva fielmente em transcricao. Se não der para entender o áudio, entendeu = false.' : '6. transcricao = "" e entendeu = true.',
  conversa ? 'Conversa recente:\n' + conversa : '',
].filter(Boolean).join('\n');
const parts = [{ text: instrucoes }];
if (audio) { parts.push({ inline_data: { mime_type: 'audio/wav', data: audio } }); parts.push({ text: 'A pergunta da usuária está no áudio acima.' }); }
else parts.push({ text: 'Pergunta da usuária: ' + texto });
const g = await gemini({
  contents: [{ role: 'user', parts }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: {
      transcricao: { type: 'STRING' }, entendeu: { type: 'BOOLEAN' }, assunto_ok: { type: 'BOOLEAN' }, resposta: { type: 'STRING' },
      garrafas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { safra_id: { type: 'INTEGER' }, por_que: { type: 'STRING' } }, required: ['safra_id', 'por_que'] } },
      comprar: { type: 'STRING' } },
      required: ['transcricao', 'entendeu', 'assunto_ok', 'resposta', 'garrafas', 'comprar'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
});
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
const pergunta = audio ? String(d.transcricao || '').trim().slice(0, 2000) : texto;
let resposta, sugestoes = [], comprar = '';
if (audio && (d.entendeu === false || !pergunta)) {
  resposta = 'Não consegui entender o áudio. Pode repetir ou escrever?';
} else if (d.assunto_ok === false) {
  resposta = 'Eu só falo de vinho: harmonização, um rótulo, uma uva, como servir ou a sua adega. Me pergunte algo sobre vinho.';
} else {
  const porId = new Map(adega.map(a => [Number(a.safraId), a]));
  const vistos = new Set();
  for (const s of (Array.isArray(d.garrafas) ? d.garrafas : [])) {
    const a = porId.get(Number(s.safra_id));
    if (!a || vistos.has(a.safraId) || Number(a.estoque) <= 0) continue;
    vistos.add(a.safraId);
    sugestoes.push({ safraId: a.safraId, vinhoId: a.vinhoId, nome: a.nome, produtor: a.produtor || '', ano: a.ano, estoque: Number(a.estoque), status: a.status, porQue: String(s.por_que || '').slice(0, 300) });
    if (sugestoes.length === 3) break;
  }
  comprar = String(d.comprar || '').trim().slice(0, 600);
  resposta = String(d.resposta || '').trim().slice(0, 2000) || (sugestoes.length ? 'Separei estas garrafas da sua adega:' : '');
  if (!resposta && !sugestoes.length && !comprar) resposta = 'Não tenho uma boa resposta para isso agora. Pode perguntar de outro jeito?';
}
const extra = JSON.stringify({ sugestoes, comprar });
await sf(49, { pergunta: pergunta || '(áudio não compreendido)', resposta, sugestoes: extra, viaAudio: audio ? 1 : 0 });
return { ok: true, pergunta: pergunta || '(áudio não compreendido)', viaAudio: !!audio, resposta, sugestoes, comprar };
