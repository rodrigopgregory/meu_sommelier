// Tabela "Como servir" de cada safra (temperatura, decantação, abertura, taça, duração depois de aberto).
import 'dotenv/config';
import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');
const sql = `CREATE TABLE IF NOT EXISTS SAFRA_SERVICO (
  SAFRA_ID INT PRIMARY KEY, TEMPERATURA VARCHAR(400), DECANTACAO TEXT, ABERTURA TEXT, TACA VARCHAR(400), DEPOIS_ABERTO VARCHAR(600),
  ORIGEM VARCHAR(10) NOT NULL, ATUALIZADO_EM VARCHAR(19),
  FOREIGN KEY (SAFRA_ID) REFERENCES SAFRAS(ID) ON DELETE CASCADE
) COMMENT='Como servir cada safra (gerado pelo sommelier ou editado pela usuaria). RETENCAO: tudo, sai junto com a safra'`;
const r = await runDdlMitra({ projectId, sql });
console.log(JSON.stringify(r.result ?? r).slice(0, 200));
