// Coluna nova em ALERTAS: ARQUIVADO (o alerta sai da lista normal e vai para "Arquivados"). Não mexe nos alertas existentes.
// Pode rodar de novo: se a coluna já existe, não faz nada.
import 'dotenv/config';
import { configureSdkMitra, runDdlMitra, runQueryMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');
const r = await runQueryMitra({ projectId, sql: `SELECT 1 AS X FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ALERTAS' AND COLUMN_NAME = 'ARQUIVADO'` });
if ((r.result?.rows || []).length) { console.log('já existe ARQUIVADO'); process.exit(0); }
const d = await runDdlMitra({ projectId, sql: `ALTER TABLE ALERTAS ADD COLUMN ARQUIVADO BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'arquivado pela usuaria: sai da lista normal; a geracao de alertas nunca muda este campo' AFTER LIDO` });
console.log('ARQUIVADO', JSON.stringify(d.result ?? d).slice(0, 160));
