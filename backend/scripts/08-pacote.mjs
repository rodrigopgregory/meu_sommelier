// Monta o pacote completo do app para levar a outra hospedagem e o envia como arquivo privado (registro em PACOTE_PROJETO).
// O botão "Baixar pacote completo do app" em Configurações baixa o último. Rodar depois de cada publicação:
//   node scripts/08-pacote.mjs             (monta, confere e envia)
//   node scripts/08-pacote.mjs --sem-envio (só monta em /tmp, para conferir)
//   node scripts/08-pacote.mjs --so-tabela (só cria/atualiza a tabela PACOTE_PROJETO)
// Conteúdo: codigo/, historico/, banco/schema.sql (do banco real, via information_schema), banco/dados.sql, banco/csv/,
// arquivos/ (fotos de rótulo de VINHOS.FOTO_KEY + manifesto), funcoes/ (versão em produção), DIFF_FUNCOES.md,
// DEPENDENCIAS_MITRA.md, plataforma/ (usuários, perfis, conexões sem chaves, rotinas), config/, .env.example,
// MANIFEST.json, EXPORT_AVISOS.md e README.md.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, execFileSync } from 'child_process';
import {
  configureSdkMitra, runDdlMitra, runDmlMitra, runQueryMitra, listServerFunctionsMitra, readServerFunctionMitra,
  listProfilesMitra, getProfileDetailsMitra, listProjectUsersMitra, listIntegrationsMitra, uploadFilePrivateMitra, downloadFilePrivateMitra,
} from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');

const VERSAO_PACOTE = 2;
const TABELAS_APP = ['ADEGAS', 'ALERTAS', 'AVALIACOES_EXTERNAS', 'AVALIACOES_PESSOAIS', 'FONTES', 'MOVIMENTACOES', 'PACOTE_EXPORTACOES', 'PACOTE_PROJETO',
  'PREFERENCIAS', 'SAFRAS', 'SAFRA_SERVICO', 'SOMMELIER_MENSAGENS', 'TIPOS_VINHO', 'VINHOS'];
const SEM_DADOS = ['PACOTE_PROJETO', 'PACOTE_EXPORTACOES'];
const VISOES_APP = ['VW_SAFRAS'];

const q = async (sql) => {
  const r = await runQueryMitra({ projectId, sql });
  if (!r?.result?.rows) throw new Error('consulta falhou: ' + JSON.stringify(r).slice(0, 300));
  return r.result.rows;
};

await runDdlMitra({ projectId, sql: `CREATE TABLE IF NOT EXISTS PACOTE_PROJETO (
  ID INT AUTO_INCREMENT PRIMARY KEY, CHAVE VARCHAR(400) NOT NULL, TAMANHO INT NOT NULL, GERADO_EM VARCHAR(19) NOT NULL, LIBERADO_PARA VARCHAR(400) NOT NULL
) COMMENT='Pacote completo do app (zip privado) para baixar em Configuracoes; so os desenvolvedores do projeto (LIBERADO_PARA = ids) baixam. RETENCAO: os 5 ultimos'` });
if (!(await q(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PACOTE_PROJETO' AND COLUMN_NAME = 'VERSAO_APP'`)).length) {
  await runDdlMitra({ projectId, sql: `ALTER TABLE PACOTE_PROJETO ADD COLUMN VERSAO_APP VARCHAR(40) NULL COMMENT 'commit do git do codigo do pacote; a tela compara com a versao aberta'` });
}
if (process.argv.includes('--so-tabela')) { console.log('tabela ok'); process.exit(0); }

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const agora = new Date();
const brasilia = new Date(agora.getTime() - 3 * 3600e3).toISOString().slice(0, 19);
const carimbo = brasilia.slice(0, 16).replace(/[-:T]/g, '');
const versaoApp = execSync(`git -C "${raiz}" rev-parse --short HEAD`).toString().trim();
const base = `/tmp/pacote-67509-${carimbo}`;
fs.rmSync(base, { recursive: true, force: true });
const dir = path.join(base, 'my-sommelier');
fs.mkdirSync(dir, { recursive: true });
const grava = (rel, conteudo) => {
  const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof conteudo === 'string' || Buffer.isBuffer(conteudo) ? conteudo : JSON.stringify(conteudo, null, 2) + '\n');
};
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const avisos = [];
const lista = (v) => v.map(x => `'${x}'`).join(', ');

// 1. Código-fonte (versão salva no git) e histórico completo
fs.mkdirSync(path.join(dir, 'codigo'), { recursive: true });
execSync(`git -C "${raiz}" archive --format=tar HEAD | tar -x -C "${path.join(dir, 'codigo')}"`);
fs.mkdirSync(path.join(dir, 'historico'), { recursive: true });
execSync(`git -C "${raiz}" bundle create "${path.join(dir, 'historico', 'my-sommelier.bundle')}" --all`, { stdio: 'ignore' });
grava('historico/commits.txt', execSync(`git -C "${raiz}" log --date=iso --pretty=format:"%h %ad %s"`).toString() + '\n');
if (execSync(`git -C "${raiz}" status --porcelain`).toString().trim()) avisos.push('Havia mudanças no código ainda não salvas no git quando o pacote foi gerado; `codigo/` traz só a versão salva (commit ' + versaoApp + ').');

// 2. Banco: estrutura do banco real (information_schema), em ordem de dependência
const colunas = await q(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_COMMENT, DATA_TYPE
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) ORDER BY TABLE_NAME, ORDINAL_POSITION`);
const indices = await q(`SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);
const fks = await q(`SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, k.ORDINAL_POSITION, r.UPDATE_RULE, r.DELETE_RULE
  FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
  WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME IN (${lista(TABELAS_APP)}) AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`);
const infoTabelas = await q(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(TABELAS_APP)}) AND TABLE_TYPE = 'BASE TABLE'`);
const visoes = await q(`SELECT TABLE_NAME, VIEW_DEFINITION, CHECK_OPTION, SECURITY_TYPE FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${lista(VISOES_APP)})`);
const [{ BANCO, VERSAO_MYSQL }] = await q(`SELECT DATABASE() AS BANCO, VERSION() AS VERSAO_MYSQL`);
const extras = await q(`SELECT 'TRIGGER' AS TIPO, TRIGGER_NAME AS NOME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE IN (${lista(TABELAS_APP)})
  UNION ALL SELECT ROUTINE_TYPE, ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()`);
const faltando = TABELAS_APP.filter(t => !infoTabelas.some(i => i.TABLE_NAME === t));
if (faltando.length) throw new Error('tabelas do app não encontradas no banco: ' + faltando.join(', '));

const nomeTab = (t) => '`' + t + '`';
const pai = new Map(TABELAS_APP.map(t => [t, new Set(fks.filter(f => f.TABLE_NAME === t && f.REFERENCED_TABLE_NAME !== t).map(f => f.REFERENCED_TABLE_NAME))]));
const ordem = [];
while (ordem.length < TABELAS_APP.length) {
  const prontas = TABELAS_APP.filter(t => !ordem.includes(t) && [...pai.get(t)].every(p => ordem.includes(p) || !TABELAS_APP.includes(p)));
  if (!prontas.length) throw new Error('ciclo de chaves estrangeiras');
  ordem.push(...prontas.sort());
}
const literal = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
const NUMERICOS = new Set(['int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'float', 'double', 'bit']);
function criarTabela(t) {
  const linhas = colunas.filter(c => c.TABLE_NAME === t).map(c => {
    let s = `  ${nomeTab(c.COLUMN_NAME)} ${c.COLUMN_TYPE}`;
    if (c.CHARACTER_SET_NAME) s += ` CHARACTER SET ${c.CHARACTER_SET_NAME} COLLATE ${c.COLLATION_NAME}`;
    s += c.IS_NULLABLE === 'YES' ? ' NULL' : ' NOT NULL';
    if (c.COLUMN_DEFAULT !== null && c.COLUMN_DEFAULT !== undefined) {
      if (/DEFAULT_GENERATED/i.test(c.EXTRA)) s += ` DEFAULT (${c.COLUMN_DEFAULT})`;
      else s += ' DEFAULT ' + (NUMERICOS.has(c.DATA_TYPE) ? c.COLUMN_DEFAULT : literal(c.COLUMN_DEFAULT));
    } else if (c.IS_NULLABLE === 'YES' && !/text|blob|json/.test(c.DATA_TYPE)) s += ' DEFAULT NULL';
    const extra = String(c.EXTRA || '').replace(/DEFAULT_GENERATED/i, '').trim();
    if (extra) s += ' ' + extra.toUpperCase();
    if (c.COLUMN_COMMENT) s += ' COMMENT ' + literal(c.COLUMN_COMMENT);
    return s;
  });
  const porIndice = new Map();
  for (const i of indices.filter(i => i.TABLE_NAME === t)) {
    if (!porIndice.has(i.INDEX_NAME)) porIndice.set(i.INDEX_NAME, { unico: Number(i.NON_UNIQUE) === 0, tipo: i.INDEX_TYPE, cols: [] });
    porIndice.get(i.INDEX_NAME).cols.push(nomeTab(i.COLUMN_NAME) + (i.SUB_PART ? `(${i.SUB_PART})` : ''));
  }
  for (const [nome, i] of porIndice) {
    if (nome === 'PRIMARY') linhas.push(`  PRIMARY KEY (${i.cols.join(', ')})`);
    else linhas.push(`  ${i.unico ? 'UNIQUE KEY' : i.tipo === 'FULLTEXT' ? 'FULLTEXT KEY' : 'KEY'} ${nomeTab(nome)} (${i.cols.join(', ')})`);
  }
  const porFk = new Map();
  for (const f of fks.filter(f => f.TABLE_NAME === t)) {
    if (!porFk.has(f.CONSTRAINT_NAME)) porFk.set(f.CONSTRAINT_NAME, { ref: f.REFERENCED_TABLE_NAME, de: [], para: [], del: f.DELETE_RULE, upd: f.UPDATE_RULE });
    porFk.get(f.CONSTRAINT_NAME).de.push(nomeTab(f.COLUMN_NAME)); porFk.get(f.CONSTRAINT_NAME).para.push(nomeTab(f.REFERENCED_COLUMN_NAME));
  }
  for (const [nome, f] of porFk) linhas.push(`  CONSTRAINT ${nomeTab(nome)} FOREIGN KEY (${f.de.join(', ')}) REFERENCES ${nomeTab(f.ref)} (${f.para.join(', ')}) ON DELETE ${f.del} ON UPDATE ${f.upd}`);
  const info = infoTabelas.find(i => i.TABLE_NAME === t);
  const charset = String(info.TABLE_COLLATION).split('_')[0];
  return `CREATE TABLE ${nomeTab(t)} (\n${linhas.join(',\n')}\n) ENGINE=${info.ENGINE} DEFAULT CHARSET=${charset} COLLATE=${info.TABLE_COLLATION}` +
    (info.TABLE_COMMENT ? ` COMMENT=${literal(info.TABLE_COMMENT)}` : '') + ';';
}
const prefixo = new RegExp('`' + BANCO + '`\\.', 'g');
const schema = [
  `-- Estrutura do banco do app Karanu (My Sommelier), lida do banco real em ${brasilia.replace('T', ' ')} (horário de Brasília).`,
  `-- Origem: MySQL ${VERSAO_MYSQL}, InnoDB, utf8mb4 / utf8mb4_bin. Gerado a partir do information_schema (o Mitra só aceita SELECT, então SHOW CREATE não roda).`,
  `-- Ordem: tabelas sem dependência primeiro, depois as que têm chave estrangeira, e as visões por último.`,
  `-- PACOTE_PROJETO entra só a estrutura (registro dos pacotes; os dados não vão no pacote).`,
  `-- Uso: crie um banco vazio (CREATE DATABASE karanu CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;), USE karanu; e rode este arquivo; depois dados.sql.`,
  '', 'SET NAMES utf8mb4;', '',
  ...ordem.map(t => criarTabela(t) + '\n'),
  ...visoes.map(v => `CREATE OR REPLACE SQL SECURITY ${v.SECURITY_TYPE || 'INVOKER'} VIEW ${nomeTab(v.TABLE_NAME)} AS ${String(v.VIEW_DEFINITION).replace(prefixo, '')};\n`),
].join('\n');
grava('banco/schema.sql', schema);
if (extras.length) avisos.push('O banco tem triggers ou procedures ligados ao app que não foram exportados: ' + extras.map(e => e.TIPO + ' ' + e.NOME).join(', ') + '.');

// 3. Banco: dados das tabelas do app (sem PACOTE_PROJETO), em dados.sql e CSV
const contagens = {};
const ordemDados = ordem.filter(t => !SEM_DADOS.includes(t));
const sqlValor = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(v)
  : typeof v === 'object' ? literal(JSON.stringify(v)) : literal(v);
const csvValor = (v) => v === null || v === undefined ? '\\N' : typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(v)
  : '"' + String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""') + '"';
const dados = [
  `-- Dados das tabelas do app (sem PACOTE_PROJETO), em ${brasilia.replace('T', ' ')} (horário de Brasília). Rodar depois de schema.sql.`,
  '-- Ordem das chaves estrangeiras: os pais antes dos filhos; as checagens de chave estrangeira ficam LIGADAS.',
  '-- Datas e horas são texto VARCHAR(19) no formato AAAA-MM-DDTHH:MM:SS, copiadas sem conversão. NULL continua NULL.',
  '', 'SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS = 1;', '',
];
for (const t of ordemDados) {
  const cols = colunas.filter(c => c.TABLE_NAME === t).map(c => c.COLUMN_NAME);
  const pk = indices.filter(i => i.TABLE_NAME === t && i.INDEX_NAME === 'PRIMARY').map(i => i.COLUMN_NAME);
  const [{ N }] = await q(`SELECT COUNT(*) AS N FROM ${t}`);
  const linhas = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await q(`SELECT ${cols.map(nomeTab).join(', ')} FROM ${t} ORDER BY ${(pk.length ? pk : cols).map(nomeTab).join(', ')} LIMIT 1000 OFFSET ${desde}`);
    linhas.push(...r);
    if (r.length < 1000) break;
  }
  if (linhas.length !== Number(N)) throw new Error(`${t}: ${linhas.length} linhas lidas, ${N} no banco`);
  contagens[t] = linhas.length;
  grava(`banco/csv/${t}.csv`, [cols.join(','), ...linhas.map(l => cols.map(c => csvValor(l[c])).join(','))].join('\r\n') + '\r\n');
  dados.push(`-- ${t}: ${linhas.length} linha(s)`);
  for (let i = 0; i < linhas.length; i += 100) {
    dados.push(`INSERT INTO ${nomeTab(t)} (${cols.map(nomeTab).join(', ')}) VALUES\n` +
      linhas.slice(i, i + 100).map(l => '  (' + cols.map(c => sqlValor(l[c])).join(', ') + ')').join(',\n') + ';');
  }
  dados.push('');
}
grava('banco/dados.sql', dados.join('\n'));
grava('banco/estrutura.json', { banco: 'MySQL ' + VERSAO_MYSQL, ordemDeCriacao: ordem, visoes: VISOES_APP, colunas, indices, chavesEstrangeiras: fks, tabelas: infoTabelas });

// 4. Arquivos: só as fotos de rótulo ligadas a vinhos (VINHOS.FOTO_KEY); nada de pacotes antigos ou áudios temporários
const fotos = await q(`SELECT ID, NOME, FOTO_KEY FROM VINHOS WHERE FOTO_KEY IS NOT NULL AND FOTO_KEY <> '' ORDER BY ID`);
const manifestoArquivos = [];
for (const f of fotos) {
  const chave = String(f.FOTO_KEY);
  if (!/^ai-files\/private\/[A-Za-z0-9._\/-]+$/.test(chave) || chave.includes('..')) { avisos.push(`Foto do vinho ${f.ID} com chave inválida (${chave}): não exportada.`); continue; }
  try {
    const buf = Buffer.from(await (await downloadFilePrivateMitra({ projectId, key: chave })).arrayBuffer());
    grava('arquivos/' + chave, buf);
    manifestoArquivos.push({ chave, arquivo: 'arquivos/' + chave, tamanho: buf.length, sha256: sha256(buf), vinhoId: f.ID, vinho: f.NOME });
  } catch (e) { avisos.push(`Foto do vinho ${f.ID} (${chave}) não pôde ser baixada: ${e.message}.`); }
}
grava('arquivos/manifesto.json', manifestoArquivos);

// 5. Server Functions (o código que está rodando no Mitra) com parâmetros e perfis
const perfis = [];
for (const p of (await listProfilesMitra({ projectId })).result || []) perfis.push((await getProfileDetailsMitra({ projectId, profileId: p.id ?? p.profileId })).result);
const funcoesLista = ((await listServerFunctionsMitra({ projectId })).result || []).sort((a, b) => a.id - b.id);
const TIPO_LEGIVEL = { SQL: 'SQL', JAVASCRIPT: 'JavaScript', INTEGRATION: 'Integração (Google Gemini)' };
const parametros = (tipo, code) => {
  const achados = new Set();
  if (tipo === 'SQL') for (const m of code.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) achados.add(m[1]);
  else for (const m of code.matchAll(/event(?:\.([A-Za-z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])/g)) achados.add(m[1] || m[2]);
  return [...achados];
};
const funcoes = [];
for (const f of funcoesLista) {
  const d = (await readServerFunctionMitra({ projectId, serverFunctionId: f.id })).result || {};
  const code = String(d.code ?? '');
  const ext = d.type === 'SQL' ? 'sql' : d.type === 'JAVASCRIPT' ? 'js' : 'json';
  const arquivo = `funcoes/${String(f.id).padStart(3, '0')}-${f.name}.${ext}`;
  grava(arquivo, code.endsWith('\n') ? code : code + '\n');
  funcoes.push({
    numero: f.id, nome: f.name, tipo: d.type, tipoLegivel: TIPO_LEGIVEL[d.type] || d.type, descricao: d.description || '',
    parametros: parametros(d.type, code), usaVarUser: code.includes(':VAR_USER'), agendamento: f.cronExpression || null,
    perfis: perfis.filter(p => (p.serverFunctions || []).some(s => Number(s.serverFunctionId) === Number(f.id))).map(p => p.name),
    criadoEm: d.createdAt || null, atualizadoEm: d.updatedAt || null, arquivo, code,
  });
}
grava('funcoes/indice.json', funcoes.map(({ code, ...f }) => f));

// 6. DIFF_FUNCOES.md: o que está no Mitra x o que backend/scripts/03-funcoes.mjs criaria
const listaScript = `/tmp/pacote-67509-script-${process.pid}.json`;
execFileSync('node', ['scripts/03-funcoes.mjs', '--so-listar', listaScript], { cwd: path.join(raiz, 'backend'), stdio: 'ignore' });
const doScript = JSON.parse(fs.readFileSync(listaScript, 'utf8'));
fs.renameSync(listaScript, listaScript + '.lido');
const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim();
const diffs = [];
for (const s of doScript) {
  const m = funcoes.find(f => f.nome === s.name);
  if (!m) { diffs.push(`- **${s.name}**: está no script, mas não existe no Mitra.`); continue; }
  if (m.tipo !== s.type) diffs.push(`- **${s.name}** (nº ${m.numero}): tipo no Mitra ${m.tipo}, no script ${s.type}.`);
  if (norm(m.descricao) !== norm(s.description)) diffs.push(`- **${s.name}** (nº ${m.numero}): descrição diferente.\n  - Mitra: ${norm(m.descricao)}\n  - Script: ${norm(s.description)}`);
  if (norm(m.code) !== norm(s.code)) {
    const a = `/tmp/pacote-diff-a-${process.pid}`, b = `/tmp/pacote-diff-b-${process.pid}`;
    fs.writeFileSync(a, norm(m.code) + '\n'); fs.writeFileSync(b, norm(s.code) + '\n');
    let saida = '';
    try { execFileSync('diff', ['-u', '--label', 'Mitra', '--label', '03-funcoes.mjs', a, b]); } catch (e) { saida = String(e.stdout || ''); }
    diffs.push(`- **${s.name}** (nº ${m.numero}): código diferente.\n\n\`\`\`diff\n${saida.slice(0, 6000)}\n\`\`\``);
  }
}
for (const m of funcoes) if (!doScript.some(s => s.name === m.nome)) diffs.push(`- **${m.nome}** (nº ${m.numero}): existe no Mitra, mas não está no script.`);
const rotinaScript = fs.readFileSync(path.join(raiz, 'backend/scripts/05-rotina-perfil.mjs'), 'utf8').match(/cronExpression:\s*'([^']+)'/)?.[1];
const rotina = funcoes.find(f => f.nome === 'alertasRotina');
if (rotina && rotina.agendamento !== rotinaScript) diffs.push(`- **alertasRotina**: agendamento no Mitra ${rotina.agendamento}, em 05-rotina-perfil.mjs ${rotinaScript}.`);
grava('DIFF_FUNCOES.md', `# Server Functions: Mitra x script

Compara o código que está rodando no Mitra em ${brasilia.replace('T', ' ')} (horário de Brasília) com o que \`backend/scripts/03-funcoes.mjs\` criaria (lido em modo \`--so-listar\`, que não grava nada), mais o agendamento de \`05-rotina-perfil.mjs\`.
Comparados: nome, tipo, descrição e código (sem espaços nas pontas). No Mitra: ${funcoes.length} funções. No script: ${doScript.length}.

## Divergências

${diffs.length ? diffs.join('\n') : 'Nenhuma: as ' + funcoes.length + ' funções do Mitra são iguais às do script (nome, tipo, descrição e código), e o agendamento da rotina também.'}
`);

// 7. DEPENDENCIAS_MITRA.md
const arquivosCodigo = execSync(`git -C "${raiz}" ls-files`).toString().split('\n').filter(f => /\.(m?js|tsx?|html)$/.test(f));
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const sfMapa = [...ler('frontend/src/lib/sf.ts').matchAll(/^\s*(\w+):\s*(\d+),/gm)].map(m => ({ nome: m[1], numero: Number(m[2]) }));
const telas = new Map();
for (const f of arquivosCodigo.filter(f => f.startsWith('frontend/src/') && !f.endsWith('lib/sf.ts'))) {
  for (const m of ler(f).matchAll(/SF\.(\w+)/g)) { if (!telas.has(m[1])) telas.set(m[1], new Set()); telas.get(m[1]).add(f.replace('frontend/src/', '')); }
}
const chamadasJs = new Map();
for (const f of funcoes.filter(f => f.tipo === 'JAVASCRIPT')) for (const m of f.code.matchAll(/sf\((\d+)/g)) {
  const alvo = funcoes.find(x => x.numero === Number(m[1]))?.nome; if (!alvo) continue;
  if (!chamadasJs.has(alvo)) chamadasJs.set(alvo, new Set()); chamadasJs.get(alvo).add(f.nome);
}
const USO_SDK = /mitra-sdk|mitra-interactions-sdk|uploadFilePrivate|getFileLink|downloadFilePrivate/;
const usosCodigo = [];
for (const f of arquivosCodigo) ler(f).split('\n').forEach((l, i) => { if (USO_SDK.test(l)) usosCodigo.push(`| \`${f}:${i + 1}\` | \`${l.trim().slice(0, 140).replace(/\|/g, '\\|')}\` |`); });
const usosFuncoes = [];
for (const f of funcoes.filter(f => f.tipo === 'JAVASCRIPT')) f.code.split('\n').forEach((l, i) => { if (USO_SDK.test(l)) usosFuncoes.push(`| ${f.nome} (\`${f.arquivo}:${i + 1}\`) | \`${l.trim().slice(0, 140).replace(/\|/g, '\\|')}\` |`); });
const geminiUsadoPor = funcoes.filter(f => f.tipo === 'JAVASCRIPT' && /await gemini\(/.test(f.code)).map(f => f.nome);
grava('DEPENDENCIAS_MITRA.md', `# Dependências da plataforma Mitra

O que o app usa do Mitra e que precisa ser trocado em outra hospedagem.

## Server Functions: número, nome e quem chama

As telas chamam as funções pelo número (\`frontend/src/lib/sf.ts\`), por \`callSF\`/\`callRows\` em \`frontend/src/lib/api.ts\` (\`executeServerFunctionMitra\`). Fora do Mitra, cada uma vira uma rota da sua API.

| Nº | Nome | Tipo | Telas e componentes que chamam | Chamada por outras funções |
|---:|---|---|---|---|
${sfMapa.map(s => { const f = funcoes.find(x => x.nome === s.nome); return `| ${s.numero} | ${s.nome} | ${f?.tipoLegivel ?? 'NÃO EXISTE NO MITRA'} | ${[...(telas.get(s.nome) || [])].sort().join(', ') || '-'} | ${[...(chamadasJs.get(s.nome) || [])].sort().join(', ') || (s.nome.startsWith('geminiGerar') ? geminiUsadoPor.join(', ') + ' (via gemini())' : '-')} |`; }).join('\n')}

## Consultas que usam :VAR_USER

\`:VAR_USER\` é trocado pelo Mitra pelo id da pessoa logada. Fora do Mitra, passe o id do usuário autenticado como parâmetro (nunca vindo da tela).

${funcoes.filter(f => f.usaVarUser).map(f => `- ${f.nome} (nº ${f.numero}, \`${f.arquivo}\`): ${f.code.split(':VAR_USER').length - 1} uso(s)`).join('\n')}

Total: ${funcoes.filter(f => f.usaVarUser).length} funções.

## Usos de mitra-sdk, mitra-interactions-sdk, uploadFilePrivate, getFileLink e downloadFilePrivate

### No código-fonte (\`codigo/\`)

| Arquivo:linha | Trecho |
|---|---|
${usosCodigo.join('\n')}

### Dentro das Server Functions JavaScript (\`funcoes/\`)

| Função (arquivo:linha) | Trecho |
|---|---|
${usosFuncoes.join('\n')}

## Rotina agendada

- **alertasRotina** (nº ${rotina?.numero}, \`${rotina?.arquivo}\`): agendamento \`${rotina?.agendamento}\` (formato do Mitra com segundos: todo dia às 6h00, fuso do servidor do Mitra). ${rotina?.descricao}
  Cria em ALERTAS os avisos de janela (INICIO, AUGE, SAINDO) das safras com estoque, sem repetir (INSERT IGNORE). Fora do Mitra: um cron \`0 6 * * *\` rodando esse SQL.

## Outros recursos do Mitra

- Login e sessão: \`frontend/src/lib/mitra-auth.ts\` e \`frontend/src/pages/LoginPage.tsx\` (\`mitra-interactions-sdk\`, variáveis \`VITE_MITRA_AUTH_URL\` e \`VITE_MITRA_PROJECT_ID\`).
- Perfis e permissões: \`plataforma/perfis-e-acessos.json\`.
- Chamadas ao Google Gemini: funções de integração ligadas às conexões do Mitra (\`config/CONEXOES.md\`).
- Arquivos privados: fotos de rótulo e áudios enviados por \`uploadFilePrivateMitra\` e lidos pelas funções com \`downloadFilePrivateMitra\` / \`getFileLinkMitra\`.
- Scripts de \`backend/scripts/\`: usam \`mitra-sdk\` com o token de desenvolvimento.
`);

// 8. Usuários, perfis, conexões (sem chaves) e rotinas
const usuariosMitra = (await listProjectUsersMitra({ projectId })).result || [];
const criacao = await q(`SELECT ID, CREATIONDATEONMILLIS FROM INT_USERS WHERE ID IN (${usuariosMitra.map(u => Number(u.userId)).filter(Number.isInteger).join(',') || 0})`);
const usuarios = usuariosMitra.map(u => {
  const ms = Number(criacao.find(c => Number(c.ID) === Number(u.userId))?.CREATIONDATEONMILLIS) || 0;
  return {
    id: u.userId, nome: u.name, email: u.email, tipo: u.userType === 'dev' ? 'desenvolvedor' : 'usuário do app', grupoNoMitra: u.profile,
    perfisDoApp: perfis.filter(p => (p.users || []).some(x => Number(x.userId ?? x.id) === Number(u.userId))).map(p => p.name),
    criadoEm: ms ? new Date(ms - 3 * 3600e3).toISOString().slice(0, 19) : null,
  };
});
grava('plataforma/usuarios.json', usuarios);
grava('plataforma/usuarios.csv', ['id,nome,email,tipo,perfis_do_app,criado_em', ...usuarios.map(u => [u.id, csvValor(u.nome), csvValor(u.email), csvValor(u.tipo), csvValor(u.perfisDoApp.join(';')), u.criadoEm ? csvValor(u.criadoEm) : '\\N'].join(','))].join('\r\n') + '\r\n');
if (usuarios.some(u => !u.criadoEm)) avisos.push('Alguns usuários não têm data de criação registrada no Mitra: ' + usuarios.filter(u => !u.criadoEm).map(u => u.email).join(', ') + '.');
grava('plataforma/perfis-e-acessos.json', perfis.map(p => ({
  id: p.id, nome: p.name, usuarios: p.users, tabelasLeitura: p.selectTables, tabelasEscrita: p.dmlTables, acoes: p.actions, telas: p.screens,
  serverFunctions: (p.serverFunctions || []).map(s => ({ numero: s.serverFunctionId, nome: s.serverFunctionName })),
})));
grava('plataforma/rotinas.json', funcoes.filter(f => f.agendamento).map(f => ({ numero: f.numero, nome: f.nome, agendamento: f.agendamento, descricao: f.descricao, arquivo: f.arquivo })));
const integracoes = (await listIntegrationsMitra({ projectId })) || [];
const conexoes = integracoes.map(i => ({
  slug: i.slug, nome: i.name, tipo: i.blueprintType, autenticacao: i.authType,
  urlBase: Object.entries(i.credentials || {}).find(([k]) => /url|host|endpoint/i.test(k))?.[1] ?? null,
  camposSecretos: Object.keys(i.credentials || {}).filter(k => !/url|host|endpoint/i.test(k)),
  funcoes: funcoes.filter(f => f.tipo === 'INTEGRATION').filter(f => { try { return JSON.parse(f.code).connection === i.slug; } catch { return false; } }).map(f => f.nome),
}));
grava('plataforma/conexoes.json', conexoes);
const integ = funcoes.filter(f => f.tipo === 'INTEGRATION').map(f => { let c = {}; try { c = JSON.parse(f.code); } catch { /* código fora do formato */ } return { ...f, conexao: c.connection, modelo: String(c.endpoint || '').match(/models\/([^:]+)/)?.[1] || c.endpoint }; });
grava('config/CONEXOES.md', `# Conexões com o Google Gemini (sem chaves)

São ${conexoes.length} conexões (uma chave de API do Google Gemini em cada) e ${integ.length} funções de integração que as usam. As chaves ficam no cofre do Mitra e não vêm no pacote: no destino, cadastre de novo.

## Conexões

| Conexão | Nome | URL base | Campos secretos | Funções de integração |
|---|---|---|---|---|
${conexoes.map(c => `| ${c.slug} | ${c.nome} | ${c.urlBase ?? '-'} | ${c.camposSecretos.join(', ')} | ${c.funcoes.join(', ')} |`).join('\n')}

## Funções de integração

| Nº | Função | Conexão | Modelo |
|---:|---|---|---|
${integ.map(f => `| ${f.numero} | ${f.nome} | ${f.conexao} | ${f.modelo} |`).join('\n')}

A primeira chave é a principal; as outras só entram em erro de cota (429) ou falha (função \`gemini()\` no começo das funções JavaScript).

## Funções que chamam o Gemini

${geminiUsadoPor.map(n => `- ${n}`).join('\n')}
`);

// 9. Configuração: .env.example (só nomes) e fontes do Google
const nomesEnv = (f) => fs.existsSync(path.join(raiz, f)) ? [...new Set(ler(f).split('\n').map(l => l.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1]).filter(Boolean))] : [];
grava('.env.example', `# Nomes das variáveis de ambiente usadas pelo app, sem valores. Preencha no destino.

# frontend/.env (lidas pelo Vite na hora do build)
${nomesEnv('frontend/.env').concat(nomesEnv('frontend/.env.example')).filter((v, i, a) => a.indexOf(v) === i).map(n => n + '=').join('\n')}

# backend/.env (usadas pelos scripts de backend/scripts com mitra-sdk)
${nomesEnv('backend/.env').concat(nomesEnv('backend/.env.example')).filter((v, i, a) => a.indexOf(v) === i).map(n => n + '=').join('\n')}

# Chaves do Google Gemini: no Mitra ficam nas conexões (config/CONEXOES.md), não em variáveis.
# No destino, guarde-as como segredo do seu servidor (uma por conexão: ${conexoes.map(c => c.slug).join(', ')}).
`);
const fontesUrl = ler('frontend/index.html').match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/)?.[0] || '';
const fontes = [...fontesUrl.matchAll(/family=([^&]+)/g)].map(m => {
  const [nome, eixos] = decodeURIComponent(m[1]).split(':');
  if (!eixos) return { familia: nome.replace(/\+/g, ' '), pesos: ['400'] };
  const [cab, vals] = eixos.split('@'); const nomesEixo = cab.split(',');
  const iw = nomesEixo.indexOf('wght'), ii = nomesEixo.indexOf('ital');
  return { familia: nome.replace(/\+/g, ' '), pesos: vals.split(';').map(v => { const p = v.split(','); return p[iw] + (ii >= 0 && p[ii] === '1' ? ' itálico' : ''); }) };
});
grava('config/google-fonts.md', `# Fontes do Google Fonts

Carregadas em \`frontend/index.html\` pelo endereço:

\`${fontesUrl}\`

| Família | Pesos |
|---|---|
${fontes.map(f => `| ${f.familia} | ${f.pesos.join(', ')} |`).join('\n')}

Os arquivos das fontes não vêm no pacote: o navegador baixa do Google na hora. Para hospedar sem o Google, baixe essas famílias e pesos e troque o link.
`);

// 10. Avisos fixos, README, MANIFEST
avisos.push(
  'Senhas dos usuários: o Mitra guarda o login e não exporta senhas nem hashes. No destino, cada pessoa cria uma senha nova (redefinição).',
  'Tokens de acesso ao Mitra (MITRA_TOKEN, MITRA_SERVICE_TOKEN) e os valores do .env: são credenciais da plataforma; o .env.example traz só os nomes.',
  `Chaves de API do Google Gemini (${conexoes.length} conexões): ficam no cofre do Mitra; config/CONEXOES.md traz só a URL e os nomes dos campos.`,
  'SHOW CREATE TABLE / SHOW CREATE VIEW: o Mitra só aceita SELECT. O schema.sql foi montado do information_schema do banco real (colunas, defaults, índices, chaves únicas e estrangeiras, ENGINE, charset, collation, comentários e a visão).',
  'Server Functions: o Mitra guarda uma versão só de cada função, a que está rodando para o app publicado e para a prévia. É essa que está em funcoes/.',
  'Dados de PACOTE_PROJETO: é o registro dos próprios pacotes; entra só a estrutura no schema.sql.',
  'Tabelas, visões e triggers internos do Mitra (DIM_*, INT_*, CAD_*, CC_*, CONNECTION*, CUBE_*): são da plataforma, não do app.',
  'Arquivos fora de VINHOS.FOTO_KEY (pacotes antigos e áudios temporários das mensagens de voz): de propósito, não vêm.',
  'Fontes do Google: são carregadas do Google na hora; os arquivos .woff2 não vêm.',
  'Domínio e DNS (149581-67509.prod.mitralab.io): pertencem ao Mitra. No destino, use um domínio próprio.',
  'Bibliotecas do Mitra (mitra-sdk, mitra-interactions-sdk): vêm só como dependência no package.json. O login, a chamada das funções, o envio de arquivos e a rotina das 6h precisam ser trocados (DEPENDENCIAS_MITRA.md).',
  'Este pacote de código é montado na caixa de desenvolvimento (git, node e token de desenvolvedor). No app, o botão "Gerar pacote completo agora" junta este código com banco, dados, fotos e usuários gerados na hora do clique (função pacoteGerar).',
);
grava('EXPORT_AVISOS.md', `# O que não veio no pacote, e por quê\n\n${avisos.map(a => '- ' + a).join('\n')}\n`);
const totalLinhas = Object.values(contagens).reduce((a, b) => a + b, 0);
grava('README.md', `# Pacote completo do Karanu (My Sommelier)

Gerado em ${brasilia.replace('T', ' ')} (horário de Brasília), versão do app \`${versaoApp}\`, formato do pacote ${VERSAO_PACOTE}.

## O que tem aqui
- \`codigo/\`: todo o código-fonte (\`frontend/\` React + Vite + TypeScript; \`backend/scripts/\` cria tabelas, visão, funções, rotina e perfil).
- \`historico/my-sommelier.bundle\`: o histórico do git. Para abrir: \`git clone my-sommelier.bundle my-sommelier\`. \`commits.txt\` lista as mudanças.
- \`banco/schema.sql\`: cria as ${ordem.length} tabelas e a visão ${VISOES_APP.join(', ')}, lido do banco real (MySQL ${VERSAO_MYSQL}, InnoDB, utf8mb4 / utf8mb4_bin), em ordem de dependência. **PACOTE_PROJETO entra só a estrutura, sem dados.**
- \`banco/dados.sql\`: os dados das ${ordemDados.length} tabelas do app (${totalLinhas} linhas), INSERTs em lote na ordem das chaves estrangeiras.
- \`banco/csv/\`: um CSV por tabela, UTF-8 sem BOM, separador vírgula, fim de linha CRLF, cabeçalho na 1ª linha.
  - **NULL** é escrito como \`\\N\` sem aspas; **texto** vai sempre entre aspas duplas (aspas internas dobradas), então texto vazio é \`""\` e um texto "\\N" de verdade é \`"\\N"\`.
  - Números e booleanos (1/0) vão sem aspas. Datas e horas são texto \`AAAA-MM-DDTHH:MM:SS\` (VARCHAR(19)), sem conversão.
  - No MySQL: \`LOAD DATA INFILE ... FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\\r\\n' IGNORE 1 LINES\`.
- \`banco/estrutura.json\`: a mesma estrutura em JSON (colunas, índices, chaves estrangeiras).
- \`arquivos/\`: as fotos de rótulo (VINHOS.FOTO_KEY), no mesmo caminho da chave, e \`manifesto.json\` (chave, tamanho, SHA-256, vinho). ${manifestoArquivos.length ? `São ${manifestoArquivos.length} arquivo(s).` : '**Hoje há 0 fotos: nenhum vinho tem FOTO_KEY preenchida, e o manifesto está vazio.**'}
- \`funcoes/\`: as ${funcoes.length} Server Functions como estão rodando no Mitra (.sql, .js ou .json da integração) e \`indice.json\` (número, nome, tipo, parâmetros, perfis, agendamento).
- \`DIFF_FUNCOES.md\`: diferenças entre o Mitra e \`backend/scripts/03-funcoes.mjs\`.
- \`DEPENDENCIAS_MITRA.md\`: o que é do Mitra e precisa ser trocado.
- \`plataforma/\`: usuários (\`usuarios.json\`/\`.csv\`: e-mail, tipo, perfis, data de criação; sem senhas nem tokens), perfis e acessos, conexões sem chaves, rotinas.
- \`config/\`: conexões do Gemini e quem usa cada uma (\`CONEXOES.md\`), fontes do Google (\`google-fonts.md\`).
- \`.env.example\`: só os nomes das variáveis.
- \`MANIFEST.json\`: data, versão, linhas por tabela e todos os arquivos com tamanho e SHA-256.
- \`EXPORT_AVISOS.md\`: o que não veio, e por quê.

## Usuários e senhas
As senhas não vêm: o login é do Mitra. No destino, cadastre as pessoas pelo e-mail de \`plataforma/usuarios.csv\` e peça que **redefinam a senha** no primeiro acesso. A coluna USUARIO_ID das tabelas guarda o id do usuário no Mitra (o \`id\` de \`usuarios.csv\`); mantenha esses ids ou faça a troca nas tabelas.

## Subir em outro lugar
1. Banco: \`CREATE DATABASE karanu CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;\`, depois \`mysql karanu < banco/schema.sql\` e \`mysql karanu < banco/dados.sql\`.
2. Site: \`cd codigo/frontend && npm install && npm run build\`; o \`dist/\` vai para qualquer hospedagem estática.
3. API: troque \`callSF\` (\`frontend/src/lib/api.ts\`) por chamadas à sua API, que roda o mesmo SQL de \`funcoes/\` trocando \`:VAR_USER\` pelo id do usuário logado e \`{{parametro}}\` por parâmetros da consulta (sempre com consulta parametrizada).
4. Gemini: as funções JavaScript de \`funcoes/\` chamam o Google Gemini pelas funções de integração; no destino, chame a API do Gemini direto com a sua chave.
5. Rotina: \`alertasRotina\` todo dia às 6h (cron \`0 6 * * *\`).
`);
const todos = [];
const andar = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) andar(p); else todos.push(p); } };
andar(dir);
const contagensBanco = {};
for (const t of TABELAS_APP) contagensBanco[t] = Number((await q(`SELECT COUNT(*) AS N FROM ${t}`))[0].N);
for (const t of ordemDados) if (contagensBanco[t] !== contagens[t]) throw new Error(`${t} mudou durante a geração (${contagens[t]} exportadas, ${contagensBanco[t]} agora): rode de novo`);
grava('MANIFEST.json', {
  app: 'Karanu (My Sommelier)', projetoMitra: projectId, versaoPacote: VERSAO_PACOTE, versaoApp, geradoEm: brasilia, geradoEmUtc: agora.toISOString(),
  banco: { origem: 'MySQL ' + VERSAO_MYSQL, charset: 'utf8mb4', collation: 'utf8mb4_bin', ordemDeCriacao: ordem, visoes: VISOES_APP },
  linhasPorTabela: Object.fromEntries(ordemDados.map(t => [t, contagens[t]])),
  tabelasSemDados: Object.fromEntries(SEM_DADOS.map(t => [t, { linhasNoBanco: contagensBanco[t], motivo: 'registro dos pacotes; só a estrutura' }])),
  totalLinhas, fotos: manifestoArquivos.length, funcoes: funcoes.length, usuarios: usuarios.length,
  arquivos: todos.sort().map(f => { const b = fs.readFileSync(f); return { caminho: path.relative(dir, f), tamanho: b.length, sha256: sha256(b) }; }),
});

// 11. Compacta, envia e registra
const zip = path.join(base, `my-sommelier-pacote-${carimbo}.zip`);
execSync(`cd "${base}" && python3 -m zipfile -c "${zip}" my-sommelier`);
const bytes = fs.readFileSync(zip);
console.log('montado', zip, Math.round(bytes.length / 1024) + ' KB', JSON.stringify(contagens));
if (process.argv.includes('--sem-envio')) process.exit(0);
const up = await uploadFilePrivateMitra({ projectId, file: new File([bytes], path.basename(zip), { type: 'application/zip' }) });
const chave = up.result?.key;
if (!chave) throw new Error('envio sem chave: ' + JSON.stringify(up).slice(0, 200));
const DONO_APP = 9;
const devs = [...new Set([...usuariosMitra.filter(u => u.userType === 'dev').map(u => Number(u.userId)), DONO_APP])].filter(Number.isInteger).join(',');
await runDmlMitra({ projectId, sql: `INSERT INTO PACOTE_PROJETO (CHAVE, TAMANHO, GERADO_EM, LIBERADO_PARA, VERSAO_APP) VALUES (${literal(chave)}, ${bytes.length}, '${brasilia}', '${devs}', ${literal(versaoApp)})` });
await runDmlMitra({ projectId, sql: `DELETE FROM PACOTE_PROJETO WHERE ID NOT IN (SELECT ID FROM (SELECT ID FROM PACOTE_PROJETO ORDER BY ID DESC LIMIT 5) u)` });
console.log('pacote enviado', path.basename(zip), 'versão', versaoApp, 'liberado para', devs);
