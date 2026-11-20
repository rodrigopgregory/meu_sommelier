// Preferências de cada usuária: unidade de temperatura, escala de nota e país.
import 'dotenv/config';
import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');
const sql = `CREATE TABLE IF NOT EXISTS PREFERENCIAS (
  USUARIO_ID INT PRIMARY KEY, TEMPERATURA CHAR(1) NOT NULL DEFAULT 'C', ESCALA_NOTA INT NOT NULL DEFAULT 100, PAIS VARCHAR(80) NOT NULL DEFAULT 'Brasil',
  ATUALIZADO_EM VARCHAR(19)
) COMMENT='Preferencias da usuaria: temperatura C ou F, escala de nota 100 ou 5 (so exibicao; notas ficam guardadas em 0-100) e pais. RETENCAO: tudo, cadastro'`;
const r = await runDdlMitra({ projectId, sql });
console.log(JSON.stringify(r.result ?? r).slice(0, 200));
