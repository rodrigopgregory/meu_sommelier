// Registro das exportações do pacote gerado na hora (Configurações > Baixar pacote completo do app).
// Cada pedido de código, cada geração, falha ou recusa vira uma linha. Pode rodar de novo.
import 'dotenv/config';
import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');
const r = await runDdlMitra({ projectId, sql: `CREATE TABLE IF NOT EXISTS PACOTE_EXPORTACOES (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  USUARIO_ID INT NOT NULL,
  STATUS VARCHAR(20) NOT NULL COMMENT 'CODIGO_ENVIADO, SUBSTITUIDO, GERANDO, GERADO, FALHA, NEGADO',
  CODIGO_HASH CHAR(64) NULL COMMENT 'SHA-256 do sal + codigo de 6 digitos; apagado assim que o codigo e usado',
  CODIGO_SAL CHAR(32) NULL,
  EXPIRA_EM VARCHAR(19) NULL COMMENT 'o codigo vale 10 minutos',
  TENTATIVAS INT NOT NULL DEFAULT 0 COMMENT 'tentativas erradas; com 5 o codigo para de valer',
  ARQUIVO_KEY VARCHAR(400) NULL COMMENT 'zip privado gerado; apagado depois do download',
  TAMANHO INT NULL,
  SHA256 CHAR(64) NULL,
  AVISOS TEXT NULL,
  CRIADO_EM VARCHAR(19) NOT NULL,
  GERADO_EM VARCHAR(19) NULL,
  DESCARTADO_EM VARCHAR(19) NULL,
  KEY IX_PACEXP_USUARIO (USUARIO_ID, ID)
) COMMENT='Log das exportacoes do pacote completo gerado na hora (so o dono gera). RETENCAO: tudo (auditoria)'` });
console.log(JSON.stringify(r.result ?? r).slice(0, 120));
