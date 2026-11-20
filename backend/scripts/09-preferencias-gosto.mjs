// Colunas novas em PREFERENCIAS: gosto da usuária (para o sommelier) e quais alertas ela quer ver.
import 'dotenv/config';
import { configureSdkMitra, runDdlMitra, runDmlMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');
const existe = async (col) => {
  const r = await runDmlMitra({ projectId, sql: `UPDATE PREFERENCIAS SET USUARIO_ID = USUARIO_ID WHERE 1 = 0 AND ${col} IS NULL` }).catch(e => ({ erro: String(e?.message || e) }));
  return !r.erro;
};
const COLUNAS = [
  ['TIPOS_FAVORITOS', "VARCHAR(40) NOT NULL DEFAULT ''"],
  ['GOSTO_LIVRE', "VARCHAR(500) NOT NULL DEFAULT ''"],
  ['ALERTA_INICIO', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['ALERTA_AUGE', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['ALERTA_SAINDO', 'BOOLEAN NOT NULL DEFAULT TRUE'],
];
for (const [c, tipo] of COLUNAS) {
  if (await existe(c)) { console.log('já existe', c); continue; }
  const r = await runDdlMitra({ projectId, sql: `ALTER TABLE PREFERENCIAS ADD COLUMN ${c} ${tipo}` });
  console.log(c, JSON.stringify(r.result ?? r).slice(0, 120));
}
