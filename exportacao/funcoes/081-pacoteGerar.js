
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

// Gera o pacote completo NA HORA, só para o dono do app e só com o código de 6 dígitos do e-mail (uso único).
// Parte dinâmica (agora): banco/schema.sql, banco/dados.sql, banco/csv, usuários e perfis, fotos com manifesto, MANIFEST.json, EXPORT_AVISOS.md.
// Parte estática (do último pacote montado na caixa de desenvolvimento): código, histórico, funções, DEPENDENCIAS_MITRA.md, DIFF_FUNCOES.md, config.
// Devolve o zip na própria resposta (nada fica guardado); acima de 8 MB, guarda e devolve um link de 2 minutos, apagado no próximo pedido.
const crypto = require('crypto');
const zlib = require('zlib');
const DONO = 9;
const TABELAS_APP = ['ADEGAS', 'ALERTAS', 'AVALIACOES_EXTERNAS', 'AVALIACOES_PESSOAIS', 'FONTES', 'MOVIMENTACOES', 'PACOTE_EXPORTACOES', 'PACOTE_PROJETO',
  'PREFERENCIAS', 'SAFRAS', 'SAFRA_SERVICO', 'SOMMELIER_MENSAGENS', 'TIPOS_VINHO', 'VINHOS'];
const SEM_DADOS = ['PACOTE_PROJETO', 'PACOTE_EXPORTACOES'];
const VISOES_APP = ['VW_SAFRAS'];
const AGORA = "DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')";
const q = async (sql) => { const r = await mitra.runQueryMitra({ projectId, sql }); if (!r || !r.result || !r.result.rows) throw new Error('consulta recusada: ' + sql.slice(0, 60)); return r.result.rows; };
const dml = async (sql) => { const r = await mitra.runDmlMitra({ projectId, sql }); return Number(((r || {}).result || {}).rowsAffected || 0); };
const literal = (v) => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const lista = (v) => v.map(x => "'" + x + "'").join(', ');

const eu = Number((((await sf(75, {})).rows || [])[0] || {}).ID);
const DIRETA = 7;
if (eu !== DONO && eu !== DIRETA) {
  if (Number.isInteger(eu)) await dml(`INSERT INTO PACOTE_EXPORTACOES (USUARIO_ID, STATUS, CRIADO_EM, AVISOS) VALUES (${eu}, 'NEGADO', ${AGORA}, 'tentou gerar sem ser o dono do app')`);
  return { ok: false, aviso: 'Só o dono do app pode gerar o pacote completo.' };
}
let pid;
if (eu === DIRETA) {
  await dml(`INSERT INTO PACOTE_EXPORTACOES (USUARIO_ID, STATUS, CRIADO_EM, AVISOS) VALUES (${DIRETA}, 'GERANDO', ${AGORA}, 'conta de desenvolvimento: sem codigo por e-mail')`);
  pid = Number(((await q(`SELECT MAX(ID) AS ID FROM PACOTE_EXPORTACOES WHERE USUARIO_ID = ${DIRETA} AND STATUS = 'GERANDO'`))[0] || {}).ID);
} else {
  const codigo = String(event.codigo || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(codigo)) return { ok: false, aviso: 'Digite o código de 6 números que chegou no seu e-mail.' };
  const pend = (await q(`SELECT ID, CODIGO_HASH, CODIGO_SAL, TENTATIVAS, (EXPIRA_EM < ${AGORA}) AS VENCIDO FROM PACOTE_EXPORTACOES
    WHERE USUARIO_ID = ${DONO} AND STATUS = 'CODIGO_ENVIADO' ORDER BY ID DESC LIMIT 1`))[0];
  if (!pend || !pend.CODIGO_HASH) return { ok: false, aviso: 'Nenhum código válido. Peça um código novo.' };
  pid = Number(pend.ID);
  if (pend.VENCIDO === true || Number(pend.VENCIDO) === 1) {
    await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'NEGADO', CODIGO_HASH = NULL, CODIGO_SAL = NULL, AVISOS = 'codigo vencido' WHERE ID = ${pid}`);
    return { ok: false, aviso: 'O código venceu (vale 10 minutos). Peça um novo.' };
  }
  const certo = Buffer.from(String(pend.CODIGO_HASH), 'hex');
  const dado = Buffer.from(sha256(String(pend.CODIGO_SAL) + codigo), 'hex');
  if (certo.length !== dado.length || !crypto.timingSafeEqual(certo, dado)) {
    const t = Number(pend.TENTATIVAS || 0) + 1;
    if (t >= 5) {
      await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'NEGADO', TENTATIVAS = ${t}, CODIGO_HASH = NULL, CODIGO_SAL = NULL, AVISOS = '5 tentativas erradas' WHERE ID = ${pid}`);
      return { ok: false, aviso: 'Código errado 5 vezes: ele parou de valer. Peça um novo.' };
    }
    await dml(`UPDATE PACOTE_EXPORTACOES SET TENTATIVAS = ${t} WHERE ID = ${pid}`);
    return { ok: false, aviso: `Código errado. Restam ${5 - t} tentativa(s).` };
  }
  if (await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'GERANDO', CODIGO_HASH = NULL, CODIGO_SAL = NULL WHERE ID = ${pid} AND STATUS = 'CODIGO_ENVIADO'`) !== 1) {
    return { ok: false, aviso: 'Esse código já foi usado. Peça um novo.' };
  }
}

const avisos = [];
const arquivos = [];
const RAIZ = 'my-sommelier/';
const grava = (nome, conteudo) => arquivos.push({ nome: RAIZ + nome, dados: Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2) + '\n', 'utf8') });
const agoraBr = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 19);

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function montarZip(lista) {
  const partes = [], central = []; let off = 0;
  const d = new Date(Date.now() - 3 * 3600e3);
  const hora = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const dia = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  for (const a of lista) {
    const nome = Buffer.from(a.nome, 'utf8'); const crc = crc32(a.dados);
    let metodo = 8, comp = zlib.deflateRawSync(a.dados);
    if (comp.length >= a.dados.length) { metodo = 0; comp = a.dados; }
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(metodo, 8); h.writeUInt16LE(hora, 10); h.writeUInt16LE(dia, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(a.dados.length, 22); h.writeUInt16LE(nome.length, 26);
    partes.push(h, nome, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(metodo, 10); c.writeUInt16LE(hora, 12); c.writeUInt16LE(dia, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(a.dados.length, 24); c.writeUInt16LE(nome.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nome); off += 30 + nome.length + comp.length;
  }
  const cd = Buffer.concat(central); const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(lista.length, 8); e.writeUInt16LE(lista.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, cd, e]);
}
function lerZip(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip do código inválido');
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const saida = [];
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip do código inválido');
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20), crc = buf.readUInt32LE(p + 16);
    const ln = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nome = buf.slice(p + 46, p + 46 + ln).toString('utf8'); p += 46 + ln + lx + lc;
    if (nome.endsWith('/')) continue;
    const ini = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
    const bruto = buf.slice(ini, ini + tam);
    const dados = metodo === 0 ? Buffer.from(bruto) : metodo === 8 ? zlib.inflateRawSync(bruto) : null;
    if (!dados || crc32(dados) !== crc) throw new Error('arquivo corrompido no zip do código: ' + nome);
    saida.push({ nome, dados });
  }
  return saida;
}

try {
  // Parte estática: o último pacote montado na caixa de desenvolvimento
  const est = (await q(`SELECT CHAVE, GERADO_EM, VERSAO_APP FROM PACOTE_PROJETO ORDER BY ID DESC LIMIT 1`))[0];
  let codigoGeradoEm = null, versaoCodigo = null;
  const DINAMICO = /^my-sommelier\/(banco\/|arquivos\/|plataforma\/usuarios|plataforma\/perfis-e-acessos|MANIFEST\.json$|EXPORT_AVISOS\.md$|README\.md$)/;
  if (!est) avisos.push('Não há pacote de código montado: o zip traz só os dados. Peça a quem desenvolve o app para rodar backend/scripts/08-pacote.mjs.');
  else {
    try {
      const zipEst = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: String(est.CHAVE) })).arrayBuffer());
      for (const a of lerZip(zipEst)) {
        if (!a.nome.startsWith(RAIZ)) continue;
        if (a.nome === RAIZ + 'README.md') arquivos.push({ nome: RAIZ + 'README_CODIGO.md', dados: a.dados });
        else if (a.nome === RAIZ + 'MANIFEST.json') arquivos.push({ nome: RAIZ + 'MANIFEST_CODIGO.json', dados: a.dados });
        else if (a.nome === RAIZ + 'EXPORT_AVISOS.md') arquivos.push({ nome: RAIZ + 'EXPORT_AVISOS_CODIGO.md', dados: a.dados });
        else if (!DINAMICO.test(a.nome)) arquivos.push(a);
      }
      codigoGeradoEm = est.GERADO_EM; versaoCodigo = est.VERSAO_APP || null;
    } catch (e) { avisos.push('A parte de código (último pacote de ' + est.GERADO_EM + ') não pôde ser lida: ' + e.message + '. O zip traz só os dados.'); }
  }
  if (versaoCodigo && event.versaoApp && String(event.versaoApp) !== versaoCodigo) {
    avisos.push(`O app aberto é a versão ${String(event.versaoApp).slice(0, 12)}, e a parte de código é da versão ${versaoCodigo} (${codigoGeradoEm}): o código e as funções podem não ter as mudanças mais recentes.`);
  }

  // Estrutura do banco real
  const colunas = await q(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_COMMENT, DATA_TYPE
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) ORDER BY TABLE_NAME, ORDINAL_POSITION`);
  const indices = await q(`SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
    FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);
  const fks = await q(`SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, k.ORDINAL_POSITION, r.UPDATE_RULE, r.DELETE_RULE
    FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME IN (${lista(TABELAS_APP)}) AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`);
  const infoTabelas = await q(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) AND TABLE_TYPE = 'BASE TABLE'`);
  const visoes = await q(`SELECT TABLE_NAME, VIEW_DEFINITION, SECURITY_TYPE FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(VISOES_APP)})`);
  const base = (await q(`SELECT DATABASE() AS BANCO, VERSION() AS VERSAO`))[0];
  const tabelas = TABELAS_APP.filter(t => infoTabelas.some(i => i.TABLE_NAME === t));
  for (const t of TABELAS_APP.filter(t => !tabelas.includes(t))) avisos.push(`A tabela ${t} não existe no banco: ficou de fora.`);
  const nomeTab = (t) => '`' + t + '`';
  const pai = new Map(tabelas.map(t => [t, new Set(fks.filter(f => f.TABLE_NAME === t && f.REFERENCED_TABLE_NAME !== t).map(f => f.REFERENCED_TABLE_NAME))]));
  const ordem = [];
  while (ordem.length < tabelas.length) {
    const prontas = tabelas.filter(t => !ordem.includes(t) && [...pai.get(t)].every(p => ordem.includes(p) || !tabelas.includes(p)));
    if (!prontas.length) throw new Error('ciclo de chaves estrangeiras');
    ordem.push(...prontas.sort());
  }
  const NUM = new Set(['int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'float', 'double', 'bit']);
  const criarTabela = (t) => {
    const linhas = colunas.filter(c => c.TABLE_NAME === t).map(c => {
      let s = `  ${nomeTab(c.COLUMN_NAME)} ${c.COLUMN_TYPE}`;
      if (c.CHARACTER_SET_NAME) s += ` CHARACTER SET ${c.CHARACTER_SET_NAME} COLLATE ${c.COLLATION_NAME}`;
      s += c.IS_NULLABLE === 'YES' ? ' NULL' : ' NOT NULL';
      if (c.COLUMN_DEFAULT !== null && c.COLUMN_DEFAULT !== undefined) {
        if (/DEFAULT_GENERATED/i.test(c.EXTRA)) s += ` DEFAULT (${c.COLUMN_DEFAULT})`;
        else s += ' DEFAULT ' + (NUM.has(c.DATA_TYPE) ? c.COLUMN_DEFAULT : literal(c.COLUMN_DEFAULT));
      } else if (c.IS_NULLABLE === 'YES' && !/text|blob|json/.test(c.DATA_TYPE)) s += ' DEFAULT NULL';
      const extra = String(c.EXTRA || '').replace(/DEFAULT_GENERATED/i, '').trim();
      if (extra) s += ' ' + extra.toUpperCase();
      if (c.COLUMN_COMMENT) s += ' COMMENT ' + literal(c.COLUMN_COMMENT);
      return s;
    });
    const idx = new Map();
    for (const i of indices.filter(i => i.TABLE_NAME === t)) {
      if (!idx.has(i.INDEX_NAME)) idx.set(i.INDEX_NAME, { unico: Number(i.NON_UNIQUE) === 0, tipo: i.INDEX_TYPE, cols: [] });
      idx.get(i.INDEX_NAME).cols.push(nomeTab(i.COLUMN_NAME) + (i.SUB_PART ? `(${i.SUB_PART})` : ''));
    }
    for (const [nome, i] of idx) linhas.push(nome === 'PRIMARY' ? `  PRIMARY KEY (${i.cols.join(', ')})` : `  ${i.unico ? 'UNIQUE KEY' : i.tipo === 'FULLTEXT' ? 'FULLTEXT KEY' : 'KEY'} ${nomeTab(nome)} (${i.cols.join(', ')})`);
    const fk = new Map();
    for (const f of fks.filter(f => f.TABLE_NAME === t)) {
      if (!fk.has(f.CONSTRAINT_NAME)) fk.set(f.CONSTRAINT_NAME, { ref: f.REFERENCED_TABLE_NAME, de: [], para: [], del: f.DELETE_RULE, upd: f.UPDATE_RULE });
      fk.get(f.CONSTRAINT_NAME).de.push(nomeTab(f.COLUMN_NAME)); fk.get(f.CONSTRAINT_NAME).para.push(nomeTab(f.REFERENCED_COLUMN_NAME));
    }
    for (const [nome, f] of fk) linhas.push(`  CONSTRAINT ${nomeTab(nome)} FOREIGN KEY (${f.de.join(', ')}) REFERENCES ${nomeTab(f.ref)} (${f.para.join(', ')}) ON DELETE ${f.del} ON UPDATE ${f.upd}`);
    const info = infoTabelas.find(i => i.TABLE_NAME === t);
    return `CREATE TABLE ${nomeTab(t)} (\n${linhas.join(',\n')}\n) ENGINE=${info.ENGINE} DEFAULT CHARSET=${String(info.TABLE_COLLATION).split('_')[0]} COLLATE=${info.TABLE_COLLATION}` +
      (info.TABLE_COMMENT ? ` COMMENT=${literal(info.TABLE_COMMENT)}` : '') + ';';
  };
  const prefixo = new RegExp('`' + base.BANCO + '`\\.', 'g');
  grava('banco/schema.sql', [
    `-- Estrutura do banco do app Karanu (My Sommelier), lida do banco real AGORA, em ${agoraBr.replace('T', ' ')} (horário de Brasília), no clique do botão.`,
    `-- Origem: MySQL ${base.VERSAO}. Gerado do information_schema (o Mitra só aceita SELECT; SHOW CREATE não roda).`,
    '-- Ordem: tabelas sem dependência primeiro, depois as com chave estrangeira, e as visões por último.',
    '-- PACOTE_PROJETO e PACOTE_EXPORTACOES entram só com a estrutura (registro dos pacotes e das exportações).',
    '-- Uso: CREATE DATABASE karanu CHARACTER SET utf8mb4 COLLATE utf8mb4_bin; USE karanu; rode este arquivo e depois dados.sql.',
    '', 'SET NAMES utf8mb4;', '',
    ...ordem.map(t => criarTabela(t) + '\n'),
    ...visoes.map(v => `CREATE OR REPLACE SQL SECURITY ${v.SECURITY_TYPE || 'INVOKER'} VIEW ${nomeTab(v.TABLE_NAME)} AS ${String(v.VIEW_DEFINITION).replace(prefixo, '')};\n`),
  ].join('\n'));
  grava('banco/estrutura.json', { banco: 'MySQL ' + base.VERSAO, ordemDeCriacao: ordem, visoes: VISOES_APP, colunas, indices, chavesEstrangeiras: fks, tabelas: infoTabelas });

  // Dados
  const sqlValor = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(v) : typeof v === 'object' ? literal(JSON.stringify(v)) : literal(v);
  const csvValor = (v) => v === null || v === undefined ? '\\N' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(v) : '"' + String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""') + '"';
  const contagens = {};
  const ordemDados = ordem.filter(t => !SEM_DADOS.includes(t));
  const dados = [`-- Dados das tabelas do app, lidos AGORA, em ${agoraBr.replace('T', ' ')} (horário de Brasília). Rodar depois de schema.sql.`,
    '-- Pais antes dos filhos; checagem de chave estrangeira LIGADA. Datas e horas são texto AAAA-MM-DDTHH:MM:SS (VARCHAR(19)), sem conversão. NULL continua NULL.',
    '', 'SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS = 1;', ''];
  for (const t of ordemDados) {
    const cols = colunas.filter(c => c.TABLE_NAME === t).map(c => c.COLUMN_NAME);
    const pk = indices.filter(i => i.TABLE_NAME === t && i.INDEX_NAME === 'PRIMARY').map(i => i.COLUMN_NAME);
    const linhas = [];
    for (let desde = 0; ; desde += 1000) {
      const r = await q(`SELECT ${cols.map(nomeTab).join(', ')} FROM ${t} ORDER BY ${(pk.length ? pk : cols).map(nomeTab).join(', ')} LIMIT 1000 OFFSET ${desde}`);
      linhas.push(...r); if (r.length < 1000) break;
    }
    contagens[t] = linhas.length;
    grava(`banco/csv/${t}.csv`, [cols.join(','), ...linhas.map(l => cols.map(c => csvValor(l[c])).join(','))].join('\r\n') + '\r\n');
    dados.push(`-- ${t}: ${linhas.length} linha(s)`);
    for (let i = 0; i < linhas.length; i += 100) dados.push(`INSERT INTO ${nomeTab(t)} (${cols.map(nomeTab).join(', ')}) VALUES\n` + linhas.slice(i, i + 100).map(l => '  (' + cols.map(c => sqlValor(l[c])).join(', ') + ')').join(',\n') + ';');
    dados.push('');
  }
  grava('banco/dados.sql', dados.join('\n'));
  for (const t of ordemDados) {
    const n = Number(((await q(`SELECT COUNT(*) AS N FROM ${t}`))[0] || {}).N);
    if (n !== contagens[t]) avisos.push(`${t} mudou durante a geração (${contagens[t]} linhas exportadas, ${n} agora). Gere de novo se precisar do número exato.`);
  }

  // Fotos de rótulo (VINHOS.FOTO_KEY)
  const manifesto = [];
  for (const f of await q(`SELECT ID, NOME, FOTO_KEY FROM VINHOS WHERE FOTO_KEY IS NOT NULL AND FOTO_KEY <> '' ORDER BY ID`)) {
    const chave = String(f.FOTO_KEY);
    if (!/^ai-files\/private\/[A-Za-z0-9._\/-]+$/.test(chave) || chave.includes('..')) { avisos.push(`Foto do vinho ${f.ID} com chave inválida: não exportada.`); continue; }
    try {
      const buf = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: chave })).arrayBuffer());
      grava('arquivos/' + chave, buf);
      manifesto.push({ chave, arquivo: 'arquivos/' + chave, tamanho: buf.length, sha256: sha256(buf), vinhoId: f.ID, vinho: f.NOME });
    } catch (e) { avisos.push(`Foto do vinho ${f.ID} (${chave}) não pôde ser baixada: ${e.message}.`); }
  }
  grava('arquivos/manifesto.json', manifesto);

  // Usuários e perfis
  let usuarios = [], perfis = [];
  try {
    for (const p of ((await mitra.listProfilesMitra({ projectId })) || {}).result || []) { const d = (await mitra.getProfileDetailsMitra({ projectId, profileId: p.id ?? p.profileId })).result; if (Number(d.id) === -999) d.name = 'Desenvolvedores (perfil interno do Mitra)'; perfis.push(d); }
  } catch (e) { avisos.push('Perfis não puderam ser lidos: ' + e.message + '.'); }
  try {
    const us = ((await mitra.listProjectUsersMitra({ projectId })) || {}).result || [];
    const ids = us.map(u => Number(u.userId)).filter(Number.isInteger);
    const extra = ids.length ? await q(`SELECT ID, CREATIONDATEONMILLIS, ENABLED FROM INT_USERS WHERE ID IN (${ids.join(',')})`) : [];
    usuarios = us.map(u => {
      const x = extra.find(c => Number(c.ID) === Number(u.userId)) || {};
      const ms = Number(x.CREATIONDATEONMILLIS) || 0;
      return { id: u.userId, nome: u.name, email: u.email, tipo: u.userType === 'dev' ? 'desenvolvedor' : 'usuário do app', grupoNoMitra: u.profile, ativo: x.ENABLED === true || Number(x.ENABLED) === 1,
        perfisDoApp: perfis.filter(p => (p.users || []).some(y => Number(y.userId ?? y.id) === Number(u.userId))).map(p => p.name),
        criadoEm: ms ? new Date(ms - 3 * 3600e3).toISOString().slice(0, 19) : null };
    });
  } catch (e) { avisos.push('Usuários não puderam ser lidos: ' + e.message + '.'); }
  grava('plataforma/usuarios.json', usuarios);
  grava('plataforma/usuarios.csv', ['id,nome,email,tipo,ativo,perfis_do_app,criado_em', ...usuarios.map(u => [u.id, csvValor(u.nome), csvValor(u.email), csvValor(u.tipo), u.ativo ? 1 : 0, csvValor(u.perfisDoApp.join(';')), u.criadoEm ? csvValor(u.criadoEm) : '\\N'].join(','))].join('\r\n') + '\r\n');
  grava('plataforma/perfis-e-acessos.json', perfis.map(p => ({ id: p.id, nome: p.name, usuarios: p.users, tabelasLeitura: p.selectTables, tabelasEscrita: p.dmlTables, acoes: p.actions, telas: p.screens,
    serverFunctions: (p.serverFunctions || []).map(s => ({ numero: s.serverFunctionId, nome: s.serverFunctionName })) })));
  if (usuarios.some(u => !u.criadoEm)) avisos.push('Sem data de criação no Mitra: ' + usuarios.filter(u => !u.criadoEm).map(u => u.email).join(', ') + '.');

  avisos.push(
    'Senhas dos usuários (nem o hash): o Mitra bloqueia a leitura das colunas de senha e de token (erro INT_USERS_SECRET_COLUMN), até para o dono do app. No destino, cada pessoa redefine a senha pelo e-mail de plataforma/usuarios.csv.',
    'Tokens de acesso e chaves do Google Gemini: ficam no cofre do Mitra e não são lidos por esta exportação.',
    'Dados de PACOTE_PROJETO e PACOTE_EXPORTACOES: são o registro dos pacotes e das exportações; entram só com a estrutura.',
    'Arquivos fora de VINHOS.FOTO_KEY (pacotes antigos e áudios temporários das mensagens de voz): de propósito, não vêm.',
  );
  grava('EXPORT_AVISOS.md', `# O que não veio nesta exportação, e por quê\n\nGerada em ${agoraBr.replace('T', ' ')} (horário de Brasília).\n\n${avisos.map(a => '- ' + a).join('\n')}\n\nAvisos da parte de código: \`EXPORT_AVISOS_CODIGO.md\`.\n`);
  const totalLinhas = Object.values(contagens).reduce((a, b) => a + b, 0);
  grava('README.md', `# Pacote completo do Karanu (My Sommelier)

- **Dados gerados agora:** ${agoraBr.replace('T', ' ')} (horário de Brasília), no clique do botão.
- **Código gerado em:** ${codigoGeradoEm ? codigoGeradoEm.replace('T', ' ') + (versaoCodigo ? ' (versão ' + versaoCodigo + ')' : '') : 'sem parte de código'}.

## Gerado agora (do banco e do Mitra no momento do clique)
- \`banco/schema.sql\`: cria as ${ordem.length} tabelas e a visão ${VISOES_APP.join(', ')} na ordem certa (MySQL ${base.VERSAO}, utf8mb4 / utf8mb4_bin).
- \`banco/dados.sql\`: ${ordemDados.length} tabelas, ${totalLinhas} linhas, INSERTs em lote na ordem das chaves estrangeiras.
- \`banco/csv/\`: um CSV por tabela, UTF-8, vírgula, CRLF, cabeçalho. **NULL = \`\\N\`** sem aspas; texto sempre entre aspas (vazio = \`""\`); números e booleanos (1/0) sem aspas; datas como texto AAAA-MM-DDTHH:MM:SS.
- \`arquivos/\`: fotos de rótulo de VINHOS.FOTO_KEY e \`manifesto.json\` (chave, tamanho, SHA-256, vinho). ${manifesto.length ? manifesto.length + ' arquivo(s).' : '**Hoje há 0 fotos: o manifesto está vazio.**'}
- \`plataforma/usuarios.json\` e \`.csv\` (e-mail, tipo, perfis, data de criação), \`plataforma/perfis-e-acessos.json\`.
- \`MANIFEST.json\`: linhas por tabela e todos os arquivos com tamanho e SHA-256. \`EXPORT_AVISOS.md\`: o que não veio.

## Da parte de código (último pacote montado pelo desenvolvimento)
\`codigo/\`, \`historico/\`, \`funcoes/\`, \`DIFF_FUNCOES.md\`, \`DEPENDENCIAS_MITRA.md\`, \`config/\`, \`.env.example\`, \`plataforma/conexoes.json\`, \`plataforma/rotinas.json\`. Explicação completa e como subir em outro lugar: \`README_CODIGO.md\`.

## Senhas
Não vêm: o Mitra não deixa ler. No destino, as pessoas redefinem a senha pelo e-mail.
`);
  const manifest = {
    app: 'Karanu (My Sommelier)', projetoMitra: projectId, tipo: 'pacote gerado na hora', dadosGeradosEm: agoraBr, codigoGeradoEm, versaoCodigo,
    banco: { origem: 'MySQL ' + base.VERSAO, ordemDeCriacao: ordem, visoes: VISOES_APP }, linhasPorTabela: contagens, totalLinhas,
    tabelasSemDados: SEM_DADOS, fotos: manifesto.length, usuarios: usuarios.length, avisos: avisos.length,
    arquivos: arquivos.map(a => ({ caminho: a.nome.slice(RAIZ.length), tamanho: a.dados.length, sha256: sha256(a.dados) })).sort((a, b) => a.caminho.localeCompare(b.caminho)),
  };
  grava('MANIFEST.json', manifest);

  const zip = montarZip(arquivos);
  const hashZip = sha256(zip);
  const nomeArquivo = `my-sommelier-pacote-${agoraBr.slice(0, 16).replace(/[-:T]/g, '')}.zip`;
  let resposta = { ok: true, nomeArquivo, tamanho: zip.length, sha256: hashZip, dadosGeradosEm: agoraBr, codigoGeradoEm, versaoCodigo, avisos: avisos.length, linhas: totalLinhas };
  let chave = null;
  if (zip.length <= 8 * 1024 * 1024) resposta.base64 = zip.toString('base64');
  else {
    const up = await mitra.uploadFilePrivateMitra({ projectId, file: new File([zip], nomeArquivo, { type: 'application/zip' }) });
    chave = up && up.result && up.result.key;
    if (!chave) throw new Error('o envio do zip grande falhou');
    resposta.url = (await mitra.getFileLinkMitra({ projectId, key: chave, ttlSeconds: 120 })).result.url;
  }
  await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'GERADO', TAMANHO = ${zip.length}, SHA256 = '${hashZip}', GERADO_EM = ${AGORA},
    ARQUIVO_KEY = ${chave ? literal(chave) : 'NULL'}, AVISOS = ${literal(avisos.length + ' aviso(s); ' + totalLinhas + ' linhas; codigo de ' + (codigoGeradoEm || '-'))} WHERE ID = ${pid}`);
  return resposta;
} catch (e) {
  await dml(`UPDATE PACOTE_EXPORTACOES SET STATUS = 'FALHA', AVISOS = ${literal(String(e && e.message || e).slice(0, 2000))} WHERE ID = ${pid}`);
  return { ok: false, aviso: 'Não foi possível gerar o pacote agora: ' + String(e && e.message || e).slice(0, 200) + '. Peça um código novo e tente de novo.' };
}
