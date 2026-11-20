// Tipos de vinho (cadastro fixo) e a adega de teste "Adega da Mitra" com 8 vinhos de exemplo.
// Uso: node scripts/04-dados-exemplo.mjs <email da usuária de teste>
// Só carrega os exemplos se a adega dessa usuária estiver vazia.
import 'dotenv/config';
import { configureSdkMitra, runDmlMitra, listProjectUsersMitra, executeServerFunctionMitra, listServerFunctionsMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
const email = process.argv[2];
if (!email) { console.error('informe o e-mail da usuária de teste'); process.exit(1); }
const dml = (sql) => runDmlMitra({ projectId, sql });
const q = (s) => s == null ? 'NULL' : `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

await dml(`INSERT IGNORE INTO TIPOS_VINHO (ID, NOME) VALUES (1,'Tinto'),(2,'Branco'),(3,'Rosé'),(4,'Espumante'),(5,'Fortificado'),(6,'Sobremesa'),(7,'Laranja')`);

const users = (await listProjectUsersMitra({ projectId })).result || [];
const u = users.find(x => String(x.email).toLowerCase() === email.toLowerCase());
if (!u) { console.error('usuária não encontrada no projeto'); process.exit(1); }
const uid = Number(u.userId);
await dml(`INSERT INTO ADEGAS (USUARIO_ID, NOME) VALUES (${uid}, 'Adega da Mitra') ON DUPLICATE KEY UPDATE NOME = 'Adega da Mitra'`);

const sfs = new Map(((await listServerFunctionsMitra({ projectId })).result || []).map(f => [f.name, f.id]));
const ini = await executeServerFunctionMitra({ projectId, serverFunctionId: sfs.get('inicioResumo'), input: {} });
// O script roda com o token de quem desenvolve; confere a adega da usuária pelo próprio banco.
const ja = await runDmlMitra({ projectId, sql: `UPDATE VINHOS SET USUARIO_ID = USUARIO_ID WHERE USUARIO_ID = ${uid}` });
if ((ja.result?.affectedRows ?? 0) > 0) { console.log('a adega já tem vinhos; exemplos não carregados'); process.exit(0); }
void ini;

const ano = new Date().getFullYear();
const vinhos = [
  { nome: 'Pinot Noir Reserva', produtor: 'Domaine Laroche', pais: 'França', regiao: 'Borgonha', uva: 'Pinot Noir', tipo: 1, notas: 'Comprado na viagem a Beaune.',
    safras: [{ ano: 2019, j: [ano - 3, ano, ano + 4], mov: [['E', 4, 'compra', `${ano - 1}-06-10`], ['S', 1, 'jantar', `${ano}-02-14`]], pes: [90, 'Frutas vermelhas, taninos sedosos.'],
      ext: [[92, 100, 'PROFISSIONAL', 'Wine Spectator', 'https://www.winespectator.com'], [4.2, 5, 'COMUNIDADE', 'Vivino', 'https://www.vivino.com']] }] },
  { nome: 'Malbec Gran Reserva', produtor: 'Bodega Catena', pais: 'Argentina', regiao: 'Mendoza', uva: 'Malbec', tipo: 1, notas: null,
    safras: [{ ano: 2019, j: [ano - 2, ano + 1, ano + 6], mov: [['E', 4, 'compra', `${ano - 2}-03-10`]], pes: [88, 'Encorpado, ameixa e baunilha.'], ext: [[91, 100, 'PROFISSIONAL', 'Descorchados', null]] },
             { ano: 2021, j: [ano + 1, ano + 4, ano + 10], mov: [['E', 2, 'presente', `${ano - 1}-12-25`]] }] },
  { nome: 'Barolo Classico', produtor: 'Pio Cesare', pais: 'Itália', regiao: 'Piemonte', uva: 'Nebbiolo', tipo: 1, notas: 'Guardar para ocasião especial.',
    safras: [{ ano: 2012, j: [ano - 6, ano - 2, ano], mov: [['E', 2, 'compra', `${ano - 5}-08-01`]], ext: [[94, 100, 'PROFISSIONAL', 'James Suckling', null]] }] },
  { nome: 'Chablis Premier Cru', produtor: 'William Fèvre', pais: 'França', regiao: 'Borgonha', uva: 'Chardonnay', tipo: 2, notas: null,
    safras: [{ ano: 2020, j: [ano - 2, ano - 1, ano + 2], mov: [['E', 3, 'compra', `${ano - 1}-09-05`]], pes: [86, 'Mineral, cítrico.'] }] },
  { nome: 'Rioja Gran Reserva', produtor: 'La Rioja Alta', pais: 'Espanha', regiao: 'Rioja', uva: 'Tempranillo', tipo: 1, notas: null,
    safras: [{ ano: 2010, j: [ano - 10, ano - 6, ano - 1], mov: [['E', 1, 'compra', `${ano - 6}-04-20`]] }] },
  { nome: 'Champagne Brut', produtor: 'Veuve Clicquot', pais: 'França', regiao: 'Champagne', uva: 'Pinot Noir, Chardonnay', tipo: 4, notas: 'Para o réveillon.',
    safras: [{ ano: 2018, j: [ano - 2, ano, ano], mov: [['E', 2, 'presente', `${ano}-01-05`]] }] },
  { nome: 'Sauvignon Blanc', produtor: 'Casa Valduga', pais: 'Brasil', regiao: 'Serra Gaúcha', uva: 'Sauvignon Blanc', tipo: 2, notas: null,
    safras: [{ ano: 2024, j: null, mov: [['E', 6, 'compra', `${ano}-03-01`], ['S', 2, 'jantar', `${ano}-04-12`]] }] },
  { nome: 'Porto Tawny 20 anos', produtor: "Taylor's", pais: 'Portugal', regiao: 'Douro', uva: 'Touriga Nacional', tipo: 5, notas: null,
    safras: [{ ano: 2022, j: [ano + 2, ano + 10, ano + 30], mov: [['E', 1, 'compra', `${ano}-05-18`]], ext: [[4.6, 5, 'COMUNIDADE', 'Vivino', 'https://www.vivino.com']] }] },
];

for (const v of vinhos) {
  await dml(`INSERT INTO VINHOS (USUARIO_ID, NOME, PRODUTOR, PAIS, REGIAO, UVA, TIPO_ID, NOTAS, CRIADO_EM) VALUES (${uid}, ${q(v.nome)}, ${q(v.produtor)}, ${q(v.pais)}, ${q(v.regiao)}, ${q(v.uva)}, ${v.tipo}, ${q(v.notas)}, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s'))`);
  const vinho = `(SELECT MAX(ID) FROM (SELECT ID FROM VINHOS WHERE USUARIO_ID = ${uid} AND NOME = ${q(v.nome)}) z)`;
  for (const s of v.safras) {
    const [i, a, f] = s.j || [null, null, null];
    await dml(`INSERT INTO SAFRAS (VINHO_ID, ANO, JANELA_INICIO, JANELA_AUGE, JANELA_FIM, CRIADO_EM) SELECT ${vinho}, ${s.ano}, ${i ?? 'NULL'}, ${a ?? 'NULL'}, ${f ?? 'NULL'}, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')`);
    const safra = `(SELECT s.ID FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = ${uid} AND v.NOME = ${q(v.nome)} AND s.ANO = ${s.ano})`;
    for (const [t, qt, mot, dt] of s.mov) await dml(`INSERT INTO MOVIMENTACOES (SAFRA_ID, TIPO, QUANTIDADE, MOTIVO, DATA, CRIADO_EM) SELECT ${safra}, '${t}', ${qt}, ${q(mot)}, '${dt}', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')`);
    if (s.pes) await dml(`INSERT INTO AVALIACOES_PESSOAIS (SAFRA_ID, NOTA, COMENTARIO, DATA) SELECT ${safra}, ${s.pes[0]}, ${q(s.pes[1])}, '${ano}-03-01'`);
    for (const [n, esc, tipo, fonte, url] of (s.ext || [])) await dml(`INSERT INTO AVALIACOES_EXTERNAS (SAFRA_ID, FONTE_NOME, FONTE_URL, NOTA, ESCALA_MAX, TIPO, DATA, URL) SELECT ${safra}, ${q(fonte)}, ${q(url)}, ${n}, ${esc}, '${tipo}', '${ano}-03-01', ${q(url)}`);
  }
}
for (const [nome, cat, url] of [['Vivino', 'COMUNIDADE', 'https://www.vivino.com'], ['Wine Spectator', 'PROFISSIONAL', 'https://www.winespectator.com']]) {
  await dml(`INSERT INTO FONTES (USUARIO_ID, NOME, CATEGORIA, URL, CONDICOES) VALUES (${uid}, ${q(nome)}, '${cat}', ${q(url)}, 'Registro manual; sem cópia automática de conteúdo.')`);
}
await dml(`UPDATE AVALIACOES_EXTERNAS e JOIN SAFRAS s ON s.ID = e.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID JOIN FONTES f ON f.USUARIO_ID = v.USUARIO_ID AND f.NOME = e.FONTE_NOME SET e.FONTE_ID = f.ID WHERE v.USUARIO_ID = ${uid}`);
const r = await executeServerFunctionMitra({ projectId, serverFunctionId: sfs.get('alertasRotina'), input: {} });
console.log('exemplos carregados; alertas gerados:', JSON.stringify(r.result.output));
