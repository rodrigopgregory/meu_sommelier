// Cria ou atualiza (pelo nome) todas as Server Functions do Karanu (antes My Sommelier).
// Pode rodar de novo: não apaga dados. Grava os ids em frontend/src/lib/sf.ts.
// --so-listar <arquivo>: não grava nada no Mitra; escreve no arquivo, em JSON, o que criaria (usado pelo 08-pacote.mjs no DIFF_FUNCOES.md).
import 'dotenv/config';
import fs from 'fs';
import {
  configureSdkMitra, listServerFunctionsMitra, createServerFunctionMitra, updateServerFunctionMitra,
} from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);

const AGORA = `DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')`;
const FOTO = (p) => `CASE WHEN '{{${p}}}' LIKE 'ai-files/private/%' THEN '{{${p}}}' END`;

// Gera alertas (RN-08) das safras com estoque > 0; `filtro` restringe o escopo.
// INSERT IGNORE pela chave UQ_ALERTA (SAFRA_ID, TIPO): alerta que já existe, lido ou arquivado, não é recriado nem alterado.
const gerarAlertas = (filtro) => `INSERT IGNORE INTO ALERTAS (SAFRA_ID, TIPO, ANO_REF, LIDO, CRIADO_EM)
SELECT x.ID, x.TIPO, x.ANO_REF, FALSE, ${AGORA} FROM (
  SELECT ID, USUARIO_ID, 'INICIO' AS TIPO, JANELA_INICIO AS ANO_REF FROM VW_SAFRAS WHERE ESTOQUE > 0 AND STATUS = 'JANELA' AND YEAR(CURDATE()) < JANELA_AUGE
  UNION ALL SELECT ID, USUARIO_ID, 'AUGE', JANELA_AUGE FROM VW_SAFRAS WHERE ESTOQUE > 0 AND STATUS IN ('AUGE', 'AUGE_FIM')
  UNION ALL SELECT ID, USUARIO_ID, 'SAINDO', JANELA_FIM FROM VW_SAFRAS WHERE ESTOQUE > 0 AND STATUS IN ('SAINDO', 'AUGE_FIM')
) x WHERE ${filtro}`;

const DONO_SAFRA = (campo) => `${campo} IN (SELECT s.ID FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = :VAR_USER)`;

const SQL = {
  inicioResumo: ['Início: totais, beber logo, alertas não lidos e garrafas por tipo da usuária logada', `
SELECT
  (SELECT NOME FROM ADEGAS WHERE USUARIO_ID = :VAR_USER) AS ADEGA,
  (SELECT COUNT(*) FROM VINHOS WHERE USUARIO_ID = :VAR_USER) AS VINHOS,
  (SELECT COUNT(*) FROM VW_SAFRAS WHERE USUARIO_ID = :VAR_USER) AS SAFRAS,
  (SELECT COALESCE(SUM(ESTOQUE), 0) FROM VW_SAFRAS WHERE USUARIO_ID = :VAR_USER) AS GARRAFAS,
  (SELECT COUNT(*) FROM ALERTAS a WHERE a.LIDO = FALSE AND a.ARQUIVADO = FALSE AND ${DONO_SAFRA('a.SAFRA_ID')}) AS NAO_LIDOS,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('safraId', b.ID, 'vinhoId', b.VINHO_ID, 'nome', b.NOME, 'produtor', b.PRODUTOR, 'ano', b.ANO, 'uva', b.UVA, 'tipoId', b.TIPO_ID, 'tipo', b.TIPO,
      'estoque', b.ESTOQUE, 'status', b.STATUS, 'anosFim', b.ANOS_PARA_FIM, 'prioridade', b.PRIORIDADE))
   FROM (SELECT vs.*, v.NOME, v.PRODUTOR, v.UVA, v.TIPO_ID, t.NOME AS TIPO FROM VW_SAFRAS vs JOIN VINHOS v ON v.ID = vs.VINHO_ID
         LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID
         WHERE vs.USUARIO_ID = :VAR_USER AND vs.ESTOQUE > 0 AND vs.PRIORIDADE <= 3
         ORDER BY vs.PRIORIDADE, vs.ANOS_PARA_FIM, v.NOME LIMIT 8) b) AS BEBER_LOGO,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', r.ID, 'tipo', r.TIPO, 'anoRef', r.ANO_REF, 'vinhoId', r.VINHO_ID, 'nome', r.NOME, 'ano', r.ANO))
   FROM (SELECT a.ID, a.TIPO, a.ANO_REF, v.ID AS VINHO_ID, v.NOME, s.ANO FROM ALERTAS a JOIN SAFRAS s ON s.ID = a.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID
         WHERE v.USUARIO_ID = :VAR_USER AND a.LIDO = FALSE AND a.ARQUIVADO = FALSE ORDER BY a.ID DESC LIMIT 5) r) AS ALERTAS,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('tipoId', g.TIPO_ID, 'tipo', g.TIPO, 'garrafas', g.GARRAFAS))
   FROM (SELECT COALESCE(t.ID, -1) AS TIPO_ID, COALESCE(t.NOME, 'Sem tipo') AS TIPO, SUM(vs.ESTOQUE) AS GARRAFAS FROM VW_SAFRAS vs JOIN VINHOS v ON v.ID = vs.VINHO_ID
         LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID WHERE vs.USUARIO_ID = :VAR_USER GROUP BY COALESCE(t.ID, -1), COALESCE(t.NOME, 'Sem tipo') HAVING SUM(vs.ESTOQUE) > 0 ORDER BY GARRAFAS DESC) g) AS POR_TIPO,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('ano', g.ANO, 'garrafas', g.GARRAFAS))
   FROM (SELECT vs.ANO, SUM(vs.ESTOQUE) AS GARRAFAS FROM VW_SAFRAS vs WHERE vs.USUARIO_ID = :VAR_USER
         GROUP BY vs.ANO HAVING SUM(vs.ESTOQUE) > 0 ORDER BY GARRAFAS DESC, vs.ANO DESC LIMIT 8) g) AS POR_SAFRA,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('uva', g.UVA, 'garrafas', g.GARRAFAS))
   FROM (SELECT TRIM(v.UVA) AS UVA, SUM(vs.ESTOQUE) AS GARRAFAS FROM VW_SAFRAS vs JOIN VINHOS v ON v.ID = vs.VINHO_ID
         WHERE vs.USUARIO_ID = :VAR_USER AND v.UVA IS NOT NULL AND TRIM(v.UVA) <> ''
         GROUP BY TRIM(v.UVA) HAVING SUM(vs.ESTOQUE) > 0 ORDER BY GARRAFAS DESC, UVA LIMIT 8) g) AS POR_UVA,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('produtor', g.PRODUTOR, 'garrafas', g.GARRAFAS))
   FROM (SELECT TRIM(v.PRODUTOR) AS PRODUTOR, SUM(vs.ESTOQUE) AS GARRAFAS FROM VW_SAFRAS vs JOIN VINHOS v ON v.ID = vs.VINHO_ID
         WHERE vs.USUARIO_ID = :VAR_USER AND v.PRODUTOR IS NOT NULL AND TRIM(v.PRODUTOR) <> ''
         GROUP BY TRIM(v.PRODUTOR) HAVING SUM(vs.ESTOQUE) > 0 ORDER BY GARRAFAS DESC, PRODUTOR LIMIT 8) g) AS POR_PRODUTOR`],

  adegaGarantir: ['Primeiro acesso: cria a adega vazia da usuária logada (não muda nada se já existir)', `
INSERT IGNORE INTO ADEGAS (USUARIO_ID, NOME) SELECT :VAR_USER, 'Minha adega' FROM DUAL WHERE :VAR_USER IS NOT NULL`],

  adegaRenomear: ['Troca o nome da adega da usuária logada (1 a 120 letras)', `
INSERT INTO ADEGAS (USUARIO_ID, NOME) SELECT :VAR_USER, LEFT(TRIM('{{nome}}'), 120) FROM DUAL WHERE :VAR_USER IS NOT NULL AND TRIM('{{nome}}') <> ''
ON DUPLICATE KEY UPDATE NOME = VALUES(NOME)`],

  preferenciasLer: ['Preferências da usuária logada: temperatura, escala de nota, país, tipos favoritos, gosto livre e quais alertas quer ver', `
SELECT COALESCE(p.TEMPERATURA, 'C') AS TEMPERATURA, COALESCE(p.ESCALA_NOTA, 100) AS ESCALA_NOTA, COALESCE(p.PAIS, 'Brasil') AS PAIS,
  COALESCE(p.TIPOS_FAVORITOS, '') AS TIPOS_FAVORITOS, COALESCE(p.GOSTO_LIVRE, '') AS GOSTO_LIVRE,
  COALESCE(p.ALERTA_INICIO, TRUE) AS ALERTA_INICIO, COALESCE(p.ALERTA_AUGE, TRUE) AS ALERTA_AUGE, COALESCE(p.ALERTA_SAINDO, TRUE) AS ALERTA_SAINDO
FROM (SELECT :VAR_USER AS U) x LEFT JOIN PREFERENCIAS p ON p.USUARIO_ID = x.U`],

  preferenciasSalvar: ['Grava as preferências da usuária logada: temperatura C ou F, escala de nota 100 ou 5 e país (até 80 letras)', `
INSERT INTO PREFERENCIAS (USUARIO_ID, TEMPERATURA, ESCALA_NOTA, PAIS, ATUALIZADO_EM)
SELECT :VAR_USER, IF('{{temperatura}}' = 'F', 'F', 'C'), IF('{{escala}}' = '5', 5, 100), COALESCE(NULLIF(LEFT(TRIM('{{pais}}'), 80), ''), 'Brasil'), ${AGORA}
FROM DUAL WHERE :VAR_USER IS NOT NULL
ON DUPLICATE KEY UPDATE TEMPERATURA = VALUES(TEMPERATURA), ESCALA_NOTA = VALUES(ESCALA_NOTA), PAIS = VALUES(PAIS), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`],

  gostoSalvar: ['Grava os tipos de vinho favoritos (ids de 1 a 7 separados por vírgula) e o gosto em texto livre (até 500 letras) da usuária logada', `
INSERT INTO PREFERENCIAS (USUARIO_ID, TIPOS_FAVORITOS, GOSTO_LIVRE, ATUALIZADO_EM)
SELECT :VAR_USER, IF('{{tipos}}' REGEXP '^[1-7](,[1-7]){0,6}$', '{{tipos}}', ''), LEFT(TRIM('{{gosto}}'), 500), ${AGORA}
FROM DUAL WHERE :VAR_USER IS NOT NULL
ON DUPLICATE KEY UPDATE TIPOS_FAVORITOS = VALUES(TIPOS_FAVORITOS), GOSTO_LIVRE = VALUES(GOSTO_LIVRE), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`],

  alertasEscolher: ['Grava quais tipos de alerta a usuária logada quer ver (inicio, auge, saindo: 1 ou 0)', `
INSERT INTO PREFERENCIAS (USUARIO_ID, ALERTA_INICIO, ALERTA_AUGE, ALERTA_SAINDO, ATUALIZADO_EM)
SELECT :VAR_USER, '{{inicio}}' = '1', '{{auge}}' = '1', '{{saindo}}' = '1', ${AGORA}
FROM DUAL WHERE :VAR_USER IS NOT NULL
ON DUPLICATE KEY UPDATE ALERTA_INICIO = VALUES(ALERTA_INICIO), ALERTA_AUGE = VALUES(ALERTA_AUGE), ALERTA_SAINDO = VALUES(ALERTA_SAINDO), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`],

  contaEu: ['Id da usuária logada; uso interno de contaInfo', `SELECT :VAR_USER AS ID`],

  estoqueSafras: ['Estoque atual de safras da usuária (ids separados por vírgula), para as sugestões do sommelier', `
SELECT ID, ESTOQUE, STATUS FROM VW_SAFRAS WHERE USUARIO_ID = :VAR_USER AND FIND_IN_SET(ID, '{{ids}}') LIMIT 200`],

  dominios: ['Listas para filtros e formulários: tipos de vinho, países e fontes da usuária', `
SELECT
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ID, 'nome', NOME)) FROM (SELECT ID, NOME FROM TIPOS_VINHO ORDER BY ID) t) AS TIPOS,
  (SELECT JSON_ARRAYAGG(p.PAIS) FROM (SELECT DISTINCT PAIS FROM VINHOS WHERE USUARIO_ID = :VAR_USER AND PAIS IS NOT NULL AND PAIS <> '' ORDER BY PAIS) p) AS PAISES,
  (SELECT JSON_ARRAYAGG(a.ANO) FROM (SELECT DISTINCT s.ANO FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = :VAR_USER ORDER BY s.ANO DESC) a) AS ANOS,
  (SELECT JSON_ARRAYAGG(u.UVA) FROM (SELECT DISTINCT TRIM(UVA) AS UVA FROM VINHOS WHERE USUARIO_ID = :VAR_USER AND UVA IS NOT NULL AND TRIM(UVA) <> '' ORDER BY UVA) u) AS UVAS,
  (SELECT JSON_ARRAYAGG(pr.PRODUTOR) FROM (SELECT DISTINCT TRIM(PRODUTOR) AS PRODUTOR FROM VINHOS WHERE USUARIO_ID = :VAR_USER AND PRODUTOR IS NOT NULL AND TRIM(PRODUTOR) <> '' ORDER BY PRODUTOR) pr) AS PRODUTORES,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', f.ID, 'nome', f.NOME, 'categoria', f.CATEGORIA, 'url', f.URL)) FROM (SELECT * FROM FONTES WHERE USUARIO_ID = :VAR_USER ORDER BY NOME) f) AS FONTES`],

  adegaListar: ['Lista paginada dos vinhos da usuária com busca (nome, produtor, uva, região) e filtros (tipoId, pais, status, ano da safra, uva, produtor)', `
SELECT v.ID, v.NOME, v.PRODUTOR, v.PAIS, v.REGIAO, v.UVA, t.NOME AS TIPO, (v.FOTO_KEY IS NOT NULL) AS TEM_FOTO,
  COUNT(vs.ID) AS SAFRAS, COALESCE(SUM(vs.ESTOQUE), 0) AS GARRAFAS,
  GROUP_CONCAT(vs.ANO ORDER BY vs.ANO SEPARATOR ', ') AS ANOS,
  (SELECT x.STATUS FROM VW_SAFRAS x WHERE x.VINHO_ID = v.ID AND x.ESTOQUE > 0 ORDER BY x.PRIORIDADE LIMIT 1) AS STATUS,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', y.ID, 'ano', y.ANO, 'estoque', y.ESTOQUE)) FROM (SELECT ID, ANO, ESTOQUE FROM VW_SAFRAS WHERE VINHO_ID = v.ID ORDER BY ANO) y) AS SAFRAS_LISTA
FROM VINHOS v
LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID
LEFT JOIN VW_SAFRAS vs ON vs.VINHO_ID = v.ID
WHERE v.USUARIO_ID = :VAR_USER
  AND ('{{busca}}' = '' OR v.NOME LIKE CONCAT('%', '{{busca}}', '%') OR v.PRODUTOR LIKE CONCAT('%', '{{busca}}', '%')
       OR v.UVA LIKE CONCAT('%', '{{busca}}', '%') OR v.REGIAO LIKE CONCAT('%', '{{busca}}', '%'))
  AND ({{tipoId}} = 0 OR v.TIPO_ID = {{tipoId}} OR ({{tipoId}} = -1 AND v.TIPO_ID IS NULL))
  AND ('{{pais}}' = '' OR v.PAIS = '{{pais}}')
  AND ({{ano}} = 0 OR EXISTS (SELECT 1 FROM SAFRAS sa WHERE sa.VINHO_ID = v.ID AND sa.ANO = {{ano}}))
  AND ('{{uva}}' = '' OR v.UVA LIKE CONCAT('%', '{{uva}}', '%'))
  AND ('{{produtor}}' = '' OR '{{produtor}}' = CONCAT('{{', 'produtor}}') OR LOWER(TRIM(v.PRODUTOR)) = LOWER(TRIM('{{produtor}}')))
  AND ('{{status}}' = '' OR EXISTS (SELECT 1 FROM VW_SAFRAS x WHERE x.VINHO_ID = v.ID
       AND (x.STATUS = '{{status}}' OR ('{{status}}' = 'SAINDO' AND x.STATUS = 'AUGE_FIM') OR ('{{status}}' = 'AUGE' AND x.STATUS = 'AUGE_FIM'))))
GROUP BY v.ID, t.NOME
ORDER BY v.NOME, v.ID
LIMIT {{limit}} OFFSET {{offset}}`],

  vinhoFicha: ['Ficha completa de um vinho da usuária: safras com estoque, janela, status, histórico, avaliações e indicadores', `
SELECT v.ID, v.NOME, v.PRODUTOR, v.PAIS, v.REGIAO, v.UVA, v.TIPO_ID, t.NOME AS TIPO, v.NOTAS, (v.FOTO_KEY IS NOT NULL) AS TEM_FOTO,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
     'id', s.ID, 'ano', s.ANO, 'inicio', s.JANELA_INICIO, 'auge', s.JANELA_AUGE, 'fim', s.JANELA_FIM,
     'estoque', s.ESTOQUE, 'status', s.STATUS, 'anosFim', s.ANOS_PARA_FIM,
     'mediaPessoal', (SELECT ROUND(AVG(p.NOTA), 1) FROM AVALIACOES_PESSOAIS p WHERE p.SAFRA_ID = s.ID),
     'mediaProfissional', (SELECT ROUND(AVG(e.NOTA * 100 / e.ESCALA_MAX), 1) FROM AVALIACOES_EXTERNAS e WHERE e.SAFRA_ID = s.ID AND e.TIPO = 'PROFISSIONAL'),
     'mediaComunidade', (SELECT ROUND(AVG(e.NOTA * 100 / e.ESCALA_MAX), 1) FROM AVALIACOES_EXTERNAS e WHERE e.SAFRA_ID = s.ID AND e.TIPO = 'COMUNIDADE'),
     'movimentacoes', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.ID, 'tipo', m.TIPO, 'quantidade', m.QUANTIDADE, 'motivo', m.MOTIVO, 'data', m.DATA, 'criadoEm', m.CRIADO_EM)) FROM MOVIMENTACOES m WHERE m.SAFRA_ID = s.ID),
     'pessoais', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.ID, 'nota', p.NOTA, 'comentario', p.COMENTARIO, 'data', p.DATA)) FROM AVALIACOES_PESSOAIS p WHERE p.SAFRA_ID = s.ID),
     'externas', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', e.ID, 'fonteId', e.FONTE_ID, 'fonte', COALESCE(f.NOME, e.FONTE_NOME), 'fonteUrl', COALESCE(f.URL, e.FONTE_URL),
                  'avaliador', e.AVALIADOR, 'nota', e.NOTA, 'escala', e.ESCALA_MAX, 'tipo', e.TIPO, 'data', e.DATA, 'url', e.URL))
                  FROM AVALIACOES_EXTERNAS e LEFT JOIN FONTES f ON f.ID = e.FONTE_ID WHERE e.SAFRA_ID = s.ID),
     'servico', (SELECT JSON_OBJECT('temperatura', sv.TEMPERATURA, 'decantacao', sv.DECANTACAO, 'abertura', sv.ABERTURA, 'taca', sv.TACA,
                  'depoisAberto', sv.DEPOIS_ABERTO, 'origem', sv.ORIGEM, 'atualizadoEm', sv.ATUALIZADO_EM) FROM SAFRA_SERVICO sv WHERE sv.SAFRA_ID = s.ID)
   )) FROM VW_SAFRAS s WHERE s.VINHO_ID = v.ID) AS SAFRAS
FROM VINHOS v LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID
WHERE v.ID = {{id}} AND v.USUARIO_ID = :VAR_USER`],

  vinhoProcurarIgual: ['Procura vinho da usuária com o mesmo nome e produtor (aviso de duplicado)', `
SELECT ID, NOME, PRODUTOR FROM VINHOS
WHERE USUARIO_ID = :VAR_USER AND LOWER(TRIM(NOME)) = LOWER(TRIM('{{nome}}')) AND LOWER(TRIM(COALESCE(PRODUTOR, ''))) = LOWER(TRIM('{{produtor}}'))
ORDER BY ID LIMIT 1`],

  vinhoCriar: ['Cria um vinho da usuária e, opcionalmente, a primeira safra (ano > 0) com a janela de consumo (inicio/auge/fim, 0 = sem) e a entrada inicial de garrafas', `
INSERT INTO VINHOS (USUARIO_ID, NOME, PRODUTOR, PAIS, REGIAO, UVA, TIPO_ID, FOTO_KEY, NOTAS, CRIADO_EM)
SELECT :VAR_USER, TRIM('{{nome}}'), NULLIF(TRIM('{{produtor}}'), ''), NULLIF(TRIM('{{pais}}'), ''), NULLIF(TRIM('{{regiao}}'), ''), NULLIF(TRIM('{{uva}}'), ''),
  (SELECT ID FROM TIPOS_VINHO WHERE ID = {{tipoId}}), ${FOTO('fotoKey')}, NULLIF('{{notas}}', ''), ${AGORA}
FROM DUAL WHERE TRIM('{{nome}}') <> '';
SET @vinho = IF(ROW_COUNT() > 0, LAST_INSERT_ID(), NULL);
SET @jOk = {{inicio}} BETWEEN 1900 AND 2200 AND {{auge}} BETWEEN {{inicio}} AND 2200 AND {{fim}} BETWEEN {{auge}} AND 2200;
INSERT INTO SAFRAS (VINHO_ID, ANO, JANELA_INICIO, JANELA_AUGE, JANELA_FIM, CRIADO_EM)
SELECT @vinho, {{ano}}, IF(@jOk, {{inicio}}, NULL), IF(@jOk, {{auge}}, NULL), IF(@jOk, {{fim}}, NULL), ${AGORA} FROM DUAL WHERE @vinho IS NOT NULL AND {{ano}} BETWEEN 1900 AND 2100;
SET @safra = IF(@vinho IS NOT NULL AND {{ano}} BETWEEN 1900 AND 2100, LAST_INSERT_ID(), NULL);
INSERT INTO MOVIMENTACOES (SAFRA_ID, TIPO, QUANTIDADE, MOTIVO, DATA, CRIADO_EM)
SELECT @safra, 'E', {{quantidade}}, LEFT('{{motivo}}', 40), '{{data}}', ${AGORA} FROM DUAL
WHERE @safra IS NOT NULL AND {{quantidade}} BETWEEN 1 AND 10000 AND '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`],

  vinhoUltimo: ['Id do último vinho criado pela usuária (depois de vinhoCriar)', `SELECT MAX(ID) AS ID FROM VINHOS WHERE USUARIO_ID = :VAR_USER`],

  vinhoAtualizar: ['Atualiza os dados de um vinho da usuária (removerFoto = 1 tira a foto)', `
UPDATE VINHOS SET NOME = TRIM('{{nome}}'), PRODUTOR = NULLIF(TRIM('{{produtor}}'), ''), PAIS = NULLIF(TRIM('{{pais}}'), ''), REGIAO = NULLIF(TRIM('{{regiao}}'), ''),
  UVA = NULLIF(TRIM('{{uva}}'), ''), TIPO_ID = (SELECT ID FROM TIPOS_VINHO WHERE ID = {{tipoId}}), NOTAS = NULLIF('{{notas}}', ''),
  FOTO_KEY = CASE WHEN '{{fotoKey}}' LIKE 'ai-files/private/%' THEN '{{fotoKey}}' WHEN {{removerFoto}} = 1 THEN NULL ELSE FOTO_KEY END
WHERE ID = {{id}} AND USUARIO_ID = :VAR_USER AND TRIM('{{nome}}') <> ''`],

  vinhoExcluir: ['Exclui um vinho da usuária com safras, movimentações, avaliações e alertas', `DELETE FROM VINHOS WHERE ID = {{id}} AND USUARIO_ID = :VAR_USER`],

  safraCriar: ['Adiciona uma safra (ano) a um vinho da usuária, com entrada inicial opcional', `
INSERT INTO SAFRAS (VINHO_ID, ANO, CRIADO_EM)
SELECT v.ID, {{ano}}, ${AGORA} FROM VINHOS v WHERE v.ID = {{vinhoId}} AND v.USUARIO_ID = :VAR_USER AND {{ano}} BETWEEN 1900 AND 2100;
SET @safra = IF(ROW_COUNT() > 0, LAST_INSERT_ID(), NULL);
INSERT INTO MOVIMENTACOES (SAFRA_ID, TIPO, QUANTIDADE, MOTIVO, DATA, CRIADO_EM)
SELECT @safra, 'E', {{quantidade}}, LEFT('{{motivo}}', 40), '{{data}}', ${AGORA} FROM DUAL
WHERE @safra IS NOT NULL AND {{quantidade}} BETWEEN 1 AND 10000 AND '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`],

  safraExcluir: ['Exclui uma safra da usuária com histórico, avaliações e alertas', `
DELETE s FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE s.ID = {{id}} AND v.USUARIO_ID = :VAR_USER`],

  safraJanela: ['Grava a janela de consumo (anos início <= auge <= fim; tudo 0 limpa) de uma safra da usuária e atualiza os alertas', `
UPDATE SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID
SET s.JANELA_INICIO = NULLIF({{inicio}}, 0), s.JANELA_AUGE = NULLIF({{auge}}, 0), s.JANELA_FIM = NULLIF({{fim}}, 0)
WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER
  AND (({{inicio}} = 0 AND {{auge}} = 0 AND {{fim}} = 0)
       OR ({{inicio}} >= 1900 AND {{inicio}} <= {{auge}} AND {{auge}} <= {{fim}} AND {{fim}} <= 2200));
UPDATE ALERTAS a JOIN SAFRAS s ON s.ID = a.SAFRA_ID
SET a.ANO_REF = CASE a.TIPO WHEN 'INICIO' THEN s.JANELA_INICIO WHEN 'AUGE' THEN s.JANELA_AUGE ELSE s.JANELA_FIM END
WHERE a.SAFRA_ID = {{safraId}} AND a.ARQUIVADO = TRUE AND ${DONO_SAFRA('a.SAFRA_ID')}
  AND (CASE a.TIPO WHEN 'INICIO' THEN s.JANELA_INICIO WHEN 'AUGE' THEN s.JANELA_AUGE ELSE s.JANELA_FIM END) IS NOT NULL;
DELETE a FROM ALERTAS a JOIN SAFRAS s ON s.ID = a.SAFRA_ID
WHERE a.SAFRA_ID = {{safraId}} AND ${DONO_SAFRA('a.SAFRA_ID')}
  AND ((a.TIPO = 'INICIO' AND a.ANO_REF <> COALESCE(s.JANELA_INICIO, -1)) OR (a.TIPO = 'AUGE' AND a.ANO_REF <> COALESCE(s.JANELA_AUGE, -1)) OR (a.TIPO = 'SAINDO' AND a.ANO_REF <> COALESCE(s.JANELA_FIM, -1)));
${gerarAlertas('x.USUARIO_ID = :VAR_USER')}`],

  movimentar: ['Entrada (E) ou baixa (S) de garrafas numa safra da usuária; baixa maior que o estoque não grava (affectedRows 0)', `
INSERT INTO MOVIMENTACOES (SAFRA_ID, TIPO, QUANTIDADE, MOTIVO, DATA, CRIADO_EM)
SELECT vs.ID, '{{tipo}}', {{quantidade}}, LEFT('{{motivo}}', 40), '{{data}}', ${AGORA}
FROM VW_SAFRAS vs
WHERE vs.ID = {{safraId}} AND vs.USUARIO_ID = :VAR_USER AND {{quantidade}} BETWEEN 1 AND 10000
  AND '{{tipo}}' IN ('E', 'S') AND ('{{tipo}}' = 'E' OR vs.ESTOQUE >= {{quantidade}})
  AND TRIM('{{motivo}}') <> '' AND '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
${gerarAlertas('x.USUARIO_ID = :VAR_USER')}`],

  avaliacaoPessoalCriar: ['Registra a avaliação pessoal (0 a 100) de uma safra da usuária', `
INSERT INTO AVALIACOES_PESSOAIS (SAFRA_ID, NOTA, COMENTARIO, DATA)
SELECT s.ID, {{nota}}, NULLIF('{{comentario}}', ''), '{{data}}' FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID
WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER AND {{nota}} BETWEEN 0 AND 100 AND '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`],

  avaliacaoPessoalExcluir: ['Exclui uma avaliação pessoal da usuária', `
DELETE p FROM AVALIACOES_PESSOAIS p JOIN SAFRAS s ON s.ID = p.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE p.ID = {{id}} AND v.USUARIO_ID = :VAR_USER`],

  avaliacaoExternaCriar: ['Registra à mão uma avaliação externa (escala 5 ou 100, tipo PROFISSIONAL ou COMUNIDADE) numa safra da usuária', `
INSERT INTO AVALIACOES_EXTERNAS (SAFRA_ID, FONTE_ID, FONTE_NOME, FONTE_URL, AVALIADOR, NOTA, ESCALA_MAX, TIPO, DATA, URL)
SELECT s.ID, f.ID, f.NOME, f.URL, NULLIF(TRIM('{{avaliador}}'), ''), {{nota}}, {{escala}}, '{{tipo}}',
  CASE WHEN '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN '{{data}}' END,
  CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END
FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID
LEFT JOIN FONTES f ON f.ID = {{fonteId}} AND f.USUARIO_ID = :VAR_USER
WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER AND {{escala}} IN (5, 100) AND {{nota}} >= 0 AND {{nota}} <= {{escala}}
  AND '{{tipo}}' IN ('PROFISSIONAL', 'COMUNIDADE')`],

  avaliacaoExternaExcluir: ['Exclui uma avaliação externa da usuária', `
DELETE e FROM AVALIACOES_EXTERNAS e JOIN SAFRAS s ON s.ID = e.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE e.ID = {{id}} AND v.USUARIO_ID = :VAR_USER`],

  fontesListar: ['Fontes de referência da usuária, com quantas avaliações usam cada uma', `
SELECT f.ID, f.NOME, f.CATEGORIA, f.URL, f.CONDICOES, (SELECT COUNT(*) FROM AVALIACOES_EXTERNAS e WHERE e.FONTE_ID = f.ID) AS AVALIACOES
FROM FONTES f WHERE f.USUARIO_ID = :VAR_USER ORDER BY f.NOME LIMIT 200`],

  fonteSalvar: ['Cria (id 0) ou altera uma fonte da usuária; categoria PROFISSIONAL, COMUNIDADE ou OUTRA', `
INSERT INTO FONTES (USUARIO_ID, NOME, CATEGORIA, URL, CONDICOES)
SELECT :VAR_USER, TRIM('{{nome}}'), '{{categoria}}', CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END, NULLIF('{{condicoes}}', '')
FROM DUAL WHERE {{id}} = 0 AND TRIM('{{nome}}') <> '' AND '{{categoria}}' IN ('PROFISSIONAL', 'COMUNIDADE', 'OUTRA');
UPDATE FONTES SET NOME = TRIM('{{nome}}'), CATEGORIA = '{{categoria}}', URL = CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END, CONDICOES = NULLIF('{{condicoes}}', '')
WHERE {{id}} > 0 AND ID = {{id}} AND USUARIO_ID = :VAR_USER AND TRIM('{{nome}}') <> '' AND '{{categoria}}' IN ('PROFISSIONAL', 'COMUNIDADE', 'OUTRA')`],

  fonteExcluir: ['Exclui uma fonte da usuária; as avaliações ficam, sem fonte, com o nome e a URL originais', `DELETE FROM FONTES WHERE ID = {{id}} AND USUARIO_ID = :VAR_USER`],

  alertasListar: ['Alertas da usuária, com filtro por tipo (INICIO, AUGE, SAINDO), lido (vazio, 0 ou 1) e arquivado (0 = lista normal, 1 = Arquivados), paginados', `
SELECT a.ID, a.TIPO, a.ANO_REF, a.LIDO, a.ARQUIVADO, a.CRIADO_EM, vs.ID AS SAFRA_ID, vs.ANO, vs.ESTOQUE, vs.STATUS, v.ID AS VINHO_ID, v.NOME, v.PRODUTOR
FROM ALERTAS a JOIN VW_SAFRAS vs ON vs.ID = a.SAFRA_ID JOIN VINHOS v ON v.ID = vs.VINHO_ID
WHERE vs.USUARIO_ID = :VAR_USER AND ('{{tipo}}' = '' OR a.TIPO = '{{tipo}}') AND ('{{lido}}' = '' OR a.LIDO = ('{{lido}}' = '1'))
  AND a.ARQUIVADO = ('{{arquivado}}' = '1')
ORDER BY a.LIDO, a.ID DESC LIMIT {{limit}} OFFSET {{offset}}`],

  alertasContar: ['Quantos alertas não lidos e não arquivados a usuária tem', `SELECT COUNT(*) AS NAO_LIDOS FROM ALERTAS a WHERE a.LIDO = FALSE AND a.ARQUIVADO = FALSE AND ${DONO_SAFRA('a.SAFRA_ID')}`],

  alertaMarcarLido: ['Marca um alerta da usuária como lido (lido 1, padrão) ou não lido (lido 0); o alerta continua na lista', `UPDATE ALERTAS SET LIDO = ('{{lido}}' <> '0') WHERE ID = {{id}} AND ${DONO_SAFRA('SAFRA_ID')}`],

  alertaArquivar: ['Arquiva (arquivado 1) ou desarquiva (arquivado 0) um alerta da usuária', `UPDATE ALERTAS SET ARQUIVADO = ('{{arquivado}}' = '1') WHERE ID = {{id}} AND ${DONO_SAFRA('SAFRA_ID')}`],

  alertasMarcarTodos: ['Marca todos os alertas não arquivados da usuária como lidos', `UPDATE ALERTAS SET LIDO = TRUE WHERE LIDO = FALSE AND ARQUIVADO = FALSE AND ${DONO_SAFRA('SAFRA_ID')}`],

  alertasConferir: ['Ao abrir o app: gera os alertas de janela que faltam na adega da usuária logada', gerarAlertas('x.USUARIO_ID = :VAR_USER')],
  alertasRotina: ['Rotina diária (agendada): gera os alertas de janela de todas as adegas. Não vai para perfil.', gerarAlertas('1 = 1')],

  exportarTudo: ['Tudo da usuária para a planilha: vinhos, safras, movimentações, avaliações, fontes e alertas', `
SELECT
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', v.ID, 'nome', v.NOME, 'produtor', v.PRODUTOR, 'pais', v.PAIS, 'regiao', v.REGIAO, 'uva', v.UVA, 'tipo', t.NOME, 'notas', v.NOTAS, 'criadoEm', v.CRIADO_EM))
     FROM VINHOS v LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID WHERE v.USUARIO_ID = :VAR_USER) AS VINHOS,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', s.ID, 'vinhoId', s.VINHO_ID, 'vinho', v.NOME, 'ano', s.ANO, 'estoque', s.ESTOQUE, 'inicio', s.JANELA_INICIO, 'auge', s.JANELA_AUGE, 'fim', s.JANELA_FIM, 'status', s.STATUS))
     FROM VW_SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE s.USUARIO_ID = :VAR_USER) AS SAFRAS,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.ID, 'vinho', v.NOME, 'ano', s.ANO, 'tipo', m.TIPO, 'quantidade', m.QUANTIDADE, 'motivo', m.MOTIVO, 'data', m.DATA))
     FROM MOVIMENTACOES m JOIN SAFRAS s ON s.ID = m.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = :VAR_USER) AS MOVIMENTACOES,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('vinho', x.VINHO, 'ano', x.ANO, 'tipo', x.TIPO, 'fonte', x.FONTE, 'avaliador', x.AVALIADOR, 'nota', x.NOTA, 'escala', x.ESCALA, 'nota100', x.NOTA100, 'comentario', x.COMENTARIO, 'data', x.DATA, 'url', x.URL))
     FROM (SELECT v.NOME AS VINHO, s.ANO, 'PESSOAL' AS TIPO, NULL AS FONTE, NULL AS AVALIADOR, p.NOTA, 100 AS ESCALA, p.NOTA AS NOTA100, p.COMENTARIO, p.DATA, NULL AS URL
             FROM AVALIACOES_PESSOAIS p JOIN SAFRAS s ON s.ID = p.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = :VAR_USER
           UNION ALL
           SELECT v.NOME, s.ANO, e.TIPO, COALESCE(f.NOME, e.FONTE_NOME), e.AVALIADOR, e.NOTA, e.ESCALA_MAX, ROUND(e.NOTA * 100 / e.ESCALA_MAX, 1), NULL, e.DATA, COALESCE(e.URL, e.FONTE_URL)
             FROM AVALIACOES_EXTERNAS e JOIN SAFRAS s ON s.ID = e.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID LEFT JOIN FONTES f ON f.ID = e.FONTE_ID WHERE v.USUARIO_ID = :VAR_USER) x) AS AVALIACOES,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', f.ID, 'nome', f.NOME, 'categoria', f.CATEGORIA, 'url', f.URL, 'condicoes', f.CONDICOES)) FROM FONTES f WHERE f.USUARIO_ID = :VAR_USER) AS FONTES,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.ID, 'vinho', v.NOME, 'ano', s.ANO, 'tipo', a.TIPO, 'anoRef', a.ANO_REF, 'lido', a.LIDO, 'arquivado', a.ARQUIVADO, 'criadoEm', a.CRIADO_EM))
     FROM ALERTAS a JOIN SAFRAS s ON s.ID = a.SAFRA_ID JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE v.USUARIO_ID = :VAR_USER) AS ALERTAS`],

  fotoKeys: ['Chaves das fotos dos vinhos da usuária (ids separados por vírgula); uso interno de fotosLinks', `
SELECT ID, FOTO_KEY FROM VINHOS WHERE USUARIO_ID = :VAR_USER AND FOTO_KEY IS NOT NULL AND FIND_IN_SET(ID, '{{ids}}') LIMIT 100`],

  sommelierContexto: ['Uso interno do sommelier: garrafas com estoque da usuária e as últimas mensagens', `
SELECT
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('safraId', vs.ID, 'vinhoId', v.ID, 'nome', v.NOME, 'produtor', v.PRODUTOR, 'tipo', t.NOME, 'uva', v.UVA, 'regiao', v.REGIAO, 'pais', v.PAIS,
      'ano', vs.ANO, 'estoque', vs.ESTOQUE, 'status', vs.STATUS, 'anosFim', vs.ANOS_PARA_FIM))
     FROM VW_SAFRAS vs JOIN VINHOS v ON v.ID = vs.VINHO_ID LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID
     WHERE vs.USUARIO_ID = :VAR_USER AND vs.ESTOQUE > 0) AS ADEGA,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('papel', h.PAPEL, 'texto', h.TEXTO))
     FROM (SELECT * FROM (SELECT ID, PAPEL, TEXTO FROM SOMMELIER_MENSAGENS WHERE USUARIO_ID = :VAR_USER ORDER BY ID DESC LIMIT 6) u ORDER BY ID) h) AS HISTORICO,
  (SELECT COALESCE(MAX(p.PAIS), 'Brasil') FROM PREFERENCIAS p WHERE p.USUARIO_ID = :VAR_USER) AS PAIS,
  (SELECT COALESCE(MAX(p.TEMPERATURA), 'C') FROM PREFERENCIAS p WHERE p.USUARIO_ID = :VAR_USER) AS TEMPERATURA`],

  sommelierGravar: ['Uso interno do sommelier: grava a pergunta e a resposta da usuária e mantém as últimas 200 mensagens', `
INSERT INTO SOMMELIER_MENSAGENS (USUARIO_ID, PAPEL, TEXTO, SUGESTOES, VIA_AUDIO, CRIADO_EM) VALUES (:VAR_USER, 'usuario', LEFT('{{pergunta}}', 4000), NULL, {{viaAudio}} = 1, ${AGORA});
INSERT INTO SOMMELIER_MENSAGENS (USUARIO_ID, PAPEL, TEXTO, SUGESTOES, VIA_AUDIO, CRIADO_EM) VALUES (:VAR_USER, 'sommelier', LEFT('{{resposta}}', 8000), NULLIF('{{sugestoes}}', ''), FALSE, ${AGORA});
DELETE FROM SOMMELIER_MENSAGENS WHERE USUARIO_ID = :VAR_USER AND ID < (SELECT c.ID FROM (SELECT ID FROM SOMMELIER_MENSAGENS WHERE USUARIO_ID = :VAR_USER ORDER BY ID DESC LIMIT 1 OFFSET 199) c)`],

  sommelierHistorico: ['Conversa da usuária com o sommelier (últimas 60 mensagens)', `
SELECT * FROM (SELECT ID, PAPEL, TEXTO, SUGESTOES, VIA_AUDIO, CRIADO_EM FROM SOMMELIER_MENSAGENS WHERE USUARIO_ID = :VAR_USER ORDER BY ID DESC LIMIT 60) h ORDER BY ID`],

  servicoContexto: ['Uso interno de servicoGerar: dados do vinho e da safra da usuária para as instruções de serviço', `
SELECT s.ID, s.ANO, s.JANELA_INICIO, s.JANELA_AUGE, s.JANELA_FIM, s.STATUS, v.NOME, v.PRODUTOR, v.PAIS, v.REGIAO, v.UVA, t.NOME AS TIPO
FROM VW_SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID LEFT JOIN TIPOS_VINHO t ON t.ID = v.TIPO_ID
WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER`],

  servicoSalvar: ['Grava as instruções de serviço (temperatura, decantação, abertura, taça, depois de aberto) de uma safra da usuária; origem IA ou MANUAL', `
INSERT INTO SAFRA_SERVICO (SAFRA_ID, TEMPERATURA, DECANTACAO, ABERTURA, TACA, DEPOIS_ABERTO, ORIGEM, ATUALIZADO_EM)
SELECT s.ID, NULLIF(LEFT(TRIM('{{temperatura}}'), 400), ''), NULLIF(LEFT(TRIM('{{decantacao}}'), 2000), ''), NULLIF(LEFT(TRIM('{{abertura}}'), 2000), ''),
  NULLIF(LEFT(TRIM('{{taca}}'), 400), ''), NULLIF(LEFT(TRIM('{{depoisAberto}}'), 600), ''), IF('{{origem}}' = 'IA', 'IA', 'MANUAL'), ${AGORA}
FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER
ON DUPLICATE KEY UPDATE TEMPERATURA = VALUES(TEMPERATURA), DECANTACAO = VALUES(DECANTACAO), ABERTURA = VALUES(ABERTURA), TACA = VALUES(TACA),
  DEPOIS_ABERTO = VALUES(DEPOIS_ABERTO), ORIGEM = VALUES(ORIGEM), ATUALIZADO_EM = VALUES(ATUALIZADO_EM)`],

  sommelierApagar: ['Apaga toda a conversa da usuária com o sommelier', `DELETE FROM SOMMELIER_MENSAGENS WHERE USUARIO_ID = :VAR_USER`],

  pacoteUltimo: ['Último pacote completo do app liberado para o usuário logado (só desenvolvedores do projeto); uso interno de pacoteLink', `
SELECT ID, CHAVE, TAMANHO, GERADO_EM, VERSAO_APP FROM PACOTE_PROJETO WHERE FIND_IN_SET(:VAR_USER, LIBERADO_PARA) > 0 ORDER BY ID DESC LIMIT 1`],
};

const atuais = new Map(((await listServerFunctionsMitra({ projectId })).result || []).map(f => [f.name, f.id]));
const ids = {};
const SO_LISTAR = process.argv.includes('--so-listar');
const listados = [];
async function upsert(name, type, code, description) {
  if (SO_LISTAR) { ids[name] = atuais.get(name) ?? -1; listados.push({ name, type, code, description }); return; }
  if (atuais.has(name)) {
    const id = atuais.get(name);
    await updateServerFunctionMitra({ projectId, serverFunctionId: id, code, description });
    ids[name] = id;
  } else {
    const r = await createServerFunctionMitra({ projectId, name, type, code, description });
    ids[name] = r.result.serverFunctionId;
    atuais.set(name, ids[name]);
  }
}

// Ordem das chaves do Gemini: a primeira é a principal; as outras só entram em erro de cota (429) ou falha.
// Para trocar a chave própria no futuro: crie a conexão em setup-gemini.mjs e ajuste esta lista.
const CHAVES_GEMINI = ['gemini-sommelier', 'gemini', 'gemini-reserva-2', 'gemini-reserva-3'];
const MODELOS = [['', 'gemini-3.5-flash'], ['Leve', 'gemini-flash-latest']];
const gem = (conexao, modelo) => JSON.stringify({ connection: conexao, method: 'POST', endpoint: `/models/${modelo}:generateContent`, body: 'event.body' });
const TENTATIVAS = [];
for (const [sufixo, modelo] of MODELOS) {
  for (const [i, conexao] of CHAVES_GEMINI.entries()) {
    const nome = `geminiGerar${sufixo}${i === 0 ? '' : 'Reserva' + i}`;
    await upsert(nome, 'INTEGRATION', gem(conexao, modelo),
      `Chamada ao Google Gemini (${modelo}, ${i === 0 ? 'chave principal' : 'chave de reserva ' + i}). Uso interno de lerRotulo, vinhoBuscarNome e sommelierPerguntar.`);
    TENTATIVAS.push(nome);
  }
}
for (const [name, [description, code]] of Object.entries(SQL)) await upsert(name, 'SQL', code.trim(), description);

// ---------- SFs JavaScript ----------
const COMUM = `
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
  for (const id of [${TENTATIVAS.map(n => ids[n]).join(', ')}]) {
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
`;

await upsert('fotosLinks', 'JAVASCRIPT', `${COMUM}
const ids = String(event.ids || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 100);
if (!ids.length) return { links: {} };
const o = await sf(${ids.fotoKeys}, { ids: ids.join(',') });
const links = {};
await Promise.all((o.rows || []).map(async (r) => {
  try { const l = await mitra.getFileLinkMitra({ projectId, key: r.FOTO_KEY, ttlSeconds: 3600 }); links[r.ID] = l.result.url; } catch (e) {}
}));
return { links };
`, 'Links temporários das fotos dos vinhos da usuária (ids separados por vírgula)');

await upsert('pacoteLink', 'JAVASCRIPT', `${COMUM}
const r = ((await sf(${ids.pacoteUltimo}, {})).rows || [])[0];
if (!r) return { ok: false, aviso: 'Ainda não há pacote completo disponível para a sua conta.' };
if (event.soInfo) return { ok: true, geradoEm: r.GERADO_EM, tamanho: Number(r.TAMANHO), versaoApp: r.VERSAO_APP || null };
const l = await mitra.getFileLinkMitra({ projectId, key: r.CHAVE, ttlSeconds: 3600 });
return { ok: true, url: l.result.url, geradoEm: r.GERADO_EM, tamanho: Number(r.TAMANHO), versaoApp: r.VERSAO_APP || null };
`, 'Link temporário (1 h) do último pacote completo do app (código, histórico, banco em SQL e CSV, fotos, Server Functions, dependências do Mitra, acessos e avisos). Com soInfo, só a data e a versão do app do pacote, sem link. Só para desenvolvedores do projeto.');

const corpoSf = (arq) => fs.readFileSync(new URL(`./sf/${arq}`, import.meta.url), 'utf8').replace(/__DONO__/g, '9').replace(/__DIRETA__/g, '7').replace(/__SF_CONTAEU__/g, String(ids.contaEu));
await upsert('pacoteCodigoPedir', 'JAVASCRIPT', `${COMUM}
${corpoSf('pacoteCodigoPedir.js')}`, 'Envia para o e-mail do dono do app (rodrigogregory@hotmail.com, usuário 9) um código de 6 números (10 min, uso único) para gerar o pacote completo na hora; registra o pedido em PACOTE_EXPORTACOES. Outras contas recebem recusa.');

await upsert('pacoteGerar', 'JAVASCRIPT', `${COMUM}
${corpoSf('pacoteGerar.js')}`, 'Gera o pacote completo NA HORA (banco, dados, CSV, fotos, usuários, manifesto e avisos gerados agora; código e funções do último pacote montado), só para o dono do app e com o código do e-mail; devolve o zip e registra em PACOTE_EXPORTACOES.');

await upsert('lerRotulo', 'JAVASCRIPT', `${COMUM}
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
  const r = await sf(${ids.vinhoProcurarIgual}, { nome: campos.nome, produtor: campos.produtor });
  if (r.rows && r.rows[0]) duplicado = { id: r.rows[0].ID, nome: r.rows[0].NOME, produtor: r.rows[0].PRODUTOR };
}
return { ok: true, campos, duplicado };
`, 'Lê a foto do rótulo (key de arquivo privado) com o Gemini e devolve sugestões de campos; não grava nada');

await upsert('vinhoBuscarNome', 'JAVASCRIPT', `${COMUM}
let termo = typeof event.nome === 'string' ? event.nome.trim().slice(0, 200) : '';
const audioKey = typeof event.audioKey === 'string' ? event.audioKey : '';
let audio = null;
if (audioKey) {
  try { audio = await baixarBase64(audioKey); } catch (e) { return { ok: false, motivo: 'audio', aviso: 'Não consegui abrir o áudio. Fale de novo ou escreva o nome.' }; }
  try { await mitra.deleteFileMitra({ projectId, key: audioKey }); } catch (e) {}
}
if (!audio && termo.length < 3) return { ok: false, motivo: 'curto', aviso: 'Escreva pelo menos 3 letras do nome do vinho.' };
const TIPOS = { 'tinto': 1, 'branco': 2, 'rose': 3, 'rosé': 3, 'espumante': 4, 'fortificado': 5, 'sobremesa': 6, 'laranja': 7 };
const body = {
  contents: [{ parts: [
    ...(audio ? [{ inline_data: { mime_type: 'audio/wav', data: audio } }] : []),
    { text: (audio ? 'A usuária falou no áudio acima o nome do vinho que procura (pode incluir produtor, uva, região ou safra). Em falado, escreva exatamente o que ela disse. Se o áudio não tiver uma fala clara dizendo um nome de vinho (silêncio, ruído, bipe ou fala sem nome de vinho), devolva encontrado = false, falado = "" e todos os campos vazios: nunca adivinhe.' : 'A usuária procura este vinho pelo nome: "' + termo.replace(/"/g, "'") + '".') + ' Identifique o vinho mais provável e devolva as características dele: nome do vinho (sem o ano), produtor, país, região, uva(s), tipo e a safra só se o ano estiver no texto. Use só o que você conhece com segurança; campo incerto fica vazio (texto "" ou safra 0). Não invente. tipo é um destes: tinto, branco, rose, espumante, fortificado, sobremesa, laranja, ou "". pais e regiao em português do Brasil. encontrado = false se não reconhece um vinho com esse nome.' }
  ] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: {
      encontrado: { type: 'BOOLEAN' }, falado: { type: 'STRING' }, nome: { type: 'STRING' }, produtor: { type: 'STRING' }, pais: { type: 'STRING' },
      regiao: { type: 'STRING' }, uva: { type: 'STRING' }, tipo: { type: 'STRING' }, safra: { type: 'INTEGER' } },
      required: ['encontrado', 'falado', 'nome', 'produtor', 'pais', 'regiao', 'uva', 'tipo', 'safra'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const ano = Number(d.safra);
const campos = {
  nome: txt(d.nome, 200) || termo, produtor: txt(d.produtor, 200), pais: txt(d.pais, 80), regiao: txt(d.regiao, 120), uva: txt(d.uva, 200),
  tipoId: TIPOS[txt(d.tipo, 20).toLowerCase()] || 0, safra: Number.isInteger(ano) && ano >= 1900 && ano <= 2100 ? ano : 0,
};
const achados = [campos.produtor, campos.pais, campos.regiao, campos.uva, campos.tipoId].filter(Boolean).length;
if (d.encontrado === false || achados === 0) return { ok: false, motivo: 'nao_encontrado', falado: audio ? termo : '', campos: { ...campos, nome: termo }, aviso: 'Não encontrei as características desse vinho. Complete à mão ou tente pelo rótulo.' };
let duplicado = null;
const r = await sf(${ids.vinhoProcurarIgual}, { nome: campos.nome, produtor: campos.produtor });
if (r.rows && r.rows[0]) duplicado = { id: r.rows[0].ID, nome: r.rows[0].NOME, produtor: r.rows[0].PRODUTOR };
return { ok: true, campos, duplicado, falado: audio ? termo : '' };
`, 'Procura um vinho pelo nome digitado ou falado (audioKey de WAV privado) com o Gemini e devolve sugestões de campos para revisar; não grava nada');

await upsert('sommelierPerguntar', 'JAVASCRIPT', `${COMUM}
const STATUS = { CEDO: 'ainda cedo', JANELA: 'na janela', AUGE: 'no auge', AUGE_FIM: 'no auge, último ano da janela', SAINDO: 'saindo da janela, beber logo', PASSOU: 'passou da janela', SEM_JANELA: 'sem janela' };
const texto = typeof event.texto === 'string' ? event.texto.trim().slice(0, 2000) : '';
const audioKey = typeof event.audioKey === 'string' ? event.audioKey : '';
if (!texto && !audioKey) return { ok: false, aviso: 'Escreva ou grave a sua pergunta.' };
let audio = null;
if (audioKey) {
  try { audio = await baixarBase64(audioKey); } catch (e) { return { ok: false, aviso: 'Não consegui abrir o áudio. Grave de novo ou escreva.' }; }
  try { await mitra.deleteFileMitra({ projectId, key: audioKey }); } catch (e) {}
}
const ctx = ((await sf(${ids.sommelierContexto}, {})).rows || [])[0] || {};
const adega = json(ctx.ADEGA) || [];
const historico = json(ctx.HISTORICO) || [];
const linhas = adega.map(a => [
  'safra_id=' + a.safraId, a.nome, a.produtor ? 'de ' + a.produtor : '', a.tipo || '', a.uva ? 'uva ' + a.uva : '',
  [a.regiao, a.pais].filter(Boolean).join(', '), 'safra ' + a.ano, a.estoque + ' garrafa(s)', STATUS[a.status] || ''
].filter(Boolean).join(' | ')).join('\\n');
const conversa = historico.map(h => (h.papel === 'usuario' ? 'Usuária: ' : 'Sommelier: ') + String(h.texto).slice(0, 600)).join('\\n');
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
  conversa ? 'Conversa recente:\\n' + conversa : '',
].filter(Boolean).join('\\n');
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
await sf(${ids.sommelierGravar}, { pergunta: pergunta || '(áudio não compreendido)', resposta, sugestoes: extra, viaAudio: audio ? 1 : 0 });
return { ok: true, pergunta: pergunta || '(áudio não compreendido)', viaAudio: !!audio, resposta, sugestoes, comprar };
`, 'Sommelier virtual: recebe texto ou áudio (key de arquivo privado WAV), responde perguntas sobre vinho e indica até 3 garrafas da adega da usuária ou o tipo de vinho a comprar. Não altera a adega.');

await upsert('servicoGerar', 'JAVASCRIPT', `${COMUM}
const safraId = Number(event.safraId);
if (!Number.isInteger(safraId) || safraId <= 0) return { ok: false, motivo: 'invalido', aviso: 'Safra inválida.' };
const c = ((await sf(${ids.servicoContexto}, { safraId })).rows || [])[0];
if (!c) return { ok: false, motivo: 'invalido', aviso: 'Safra não encontrada na sua adega.' };
const ano = new Date().getFullYear();
const desc = [
  'Vinho: ' + c.NOME, c.PRODUTOR ? 'Produtor: ' + c.PRODUTOR : '', c.TIPO ? 'Tipo: ' + c.TIPO : '', c.UVA ? 'Uva(s): ' + c.UVA : '',
  c.PAIS || c.REGIAO ? 'Origem: ' + [c.REGIAO, c.PAIS].filter(Boolean).join(', ') : '', 'Safra: ' + c.ANO + ' (' + (ano - Number(c.ANO)) + ' anos em ' + ano + ')',
  c.JANELA_FIM ? 'Janela de consumo: ' + c.JANELA_INICIO + ' a ' + c.JANELA_FIM + ', auge ' + c.JANELA_AUGE : '',
].filter(Boolean).join('\\n');
const body = {
  contents: [{ parts: [{ text: 'Você é um sommelier. Escreva, em português do Brasil, instruções práticas de serviço para esta garrafa, levando em conta o tipo, a uva, a região e principalmente a idade da safra (vinhos velhos: rolha frágil, borra, decantação curta e cuidadosa; tintos jovens e encorpados: decantação mais longa; brancos e espumantes: em geral não decantar).\\n' + desc +
    '\\nCampos: temperatura (faixa em °C e quanto tempo antes tirar da adega ou pôr na geladeira), decantacao (decantar ou não, por quanto tempo, ou só abrir antes para respirar), abertura (como abrir: saca-rolhas indicado, cuidados com a rolha e com a borra, espumante com segurança), taca (taça indicada), depois_aberto (quanto tempo dura depois de aberto e como guardar). Frases curtas e diretas, até 3 frases por campo, sem markdown.' }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: {
      temperatura: { type: 'STRING' }, decantacao: { type: 'STRING' }, abertura: { type: 'STRING' }, taca: { type: 'STRING' }, depois_aberto: { type: 'STRING' } },
      required: ['temperatura', 'decantacao', 'abertura', 'taca', 'depois_aberto'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const servico = { temperatura: txt(d.temperatura, 400), decantacao: txt(d.decantacao, 2000), abertura: txt(d.abertura, 2000), taca: txt(d.taca, 400), depoisAberto: txt(d.depois_aberto, 600) };
if (!Object.values(servico).some(Boolean)) return { ok: false, motivo: 'indisponivel', aviso: 'O sommelier não respondeu agora. Tente de novo em instantes.' };
await sf(${ids.servicoSalvar}, { safraId, ...servico, origem: 'IA' });
return { ok: true, servico: { ...servico, origem: 'IA' } };
`, 'Gera com o Gemini e grava as instruções de serviço (temperatura, decantação, abertura, taça, depois de aberto) de uma safra da usuária');

await upsert('janelaSugerir', 'JAVASCRIPT', `${COMUM}
const TIPOS = { 1: 'Tinto', 2: 'Branco', 3: 'Rosé', 4: 'Espumante', 5: 'Fortificado', 6: 'Sobremesa', 7: 'Laranja' };
const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const nome = t(event.nome, 200);
const safra = Number(event.ano);
if (!nome) return { ok: false, motivo: 'invalido', aviso: 'Informe o nome do vinho.' };
if (!Number.isInteger(safra) || safra < 1900 || safra > 2100) return { ok: false, motivo: 'invalido', aviso: 'Informe o ano da safra.' };
const hoje = new Date().getFullYear();
const desc = [
  'Vinho: ' + nome, t(event.produtor, 150) ? 'Produtor: ' + t(event.produtor, 150) : '', TIPOS[Number(event.tipoId)] ? 'Tipo: ' + TIPOS[Number(event.tipoId)] : '',
  t(event.uva, 150) ? 'Uva(s): ' + t(event.uva, 150) : '', [t(event.regiao, 100), t(event.pais, 60)].filter(Boolean).length ? 'Origem: ' + [t(event.regiao, 100), t(event.pais, 60)].filter(Boolean).join(', ') : '',
  'Safra: ' + safra, 'Ano atual: ' + hoje,
].filter(Boolean).join('\\n');
const body = {
  contents: [{ parts: [{ text: 'Você é um sommelier. Estime a janela de consumo desta garrafa (anos do calendário): inicio = primeiro ano bom para beber, auge = melhor ano, fim = último ano antes de começar a cair. Considere o produtor, a uva, a região, o tipo e a qualidade da safra; vinhos simples e brancos leves têm janela curta, grandes tintos de guarda têm janela longa. Regras: safra <= inicio <= auge <= fim. Em comentario, uma ou duas frases curtas em português do Brasil explicando o porquê, sem markdown.\\n' + desc }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: { inicio: { type: 'INTEGER' }, auge: { type: 'INTEGER' }, fim: { type: 'INTEGER' }, comentario: { type: 'STRING' } }, required: ['inicio', 'auge', 'fim', 'comentario'] },
    thinkingConfig: { thinkingLevel: 'low' }
  }
};
const g = await gemini(body);
if (!g.ok) return { ok: false, motivo: g.motivo, aviso: g.aviso };
const d = json(g.texto) || {};
let inicio = Math.round(Number(d.inicio)), auge = Math.round(Number(d.auge)), fim = Math.round(Number(d.fim));
if (![inicio, auge, fim].every(Number.isFinite)) return { ok: false, motivo: 'indisponivel', aviso: 'O sommelier não respondeu agora. Tente de novo em instantes.' };
inicio = Math.min(Math.max(inicio, safra), 2200); auge = Math.min(Math.max(auge, inicio), 2200); fim = Math.min(Math.max(fim, auge), 2200);
return { ok: true, inicio, auge, fim, comentario: t(d.comentario, 400) };
`, 'Sommelier sugere a janela de consumo (início, auge, fim) de um vinho e safra informados. Não grava nada.');

if (SO_LISTAR) { fs.writeFileSync(process.argv[process.argv.indexOf('--so-listar') + 1], JSON.stringify(listados)); process.exit(0); }
const linhas = Object.entries(ids).map(([k, v]) => `  ${k}: ${v},`).join('\n');
fs.writeFileSync('../frontend/src/lib/sf.ts', `// Ids das Server Functions (gerado por backend/scripts/03-funcoes.mjs)\nexport const SF = {\n${linhas}\n} as const;\n`);
console.log(JSON.stringify(ids));
