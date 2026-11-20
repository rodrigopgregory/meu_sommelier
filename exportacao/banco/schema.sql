-- Estrutura do banco do app Karanu (My Sommelier), lida do banco real AGORA, em 2026-11-19 22:55:37 (horário de Brasília), no clique do botão.
-- Origem: MySQL 8.3.0. Gerado do information_schema (o Mitra só aceita SELECT; SHOW CREATE não roda).
-- Ordem: tabelas sem dependência primeiro, depois as com chave estrangeira, e as visões por último.
-- PACOTE_PROJETO e PACOTE_EXPORTACOES entram só com a estrutura (registro dos pacotes e das exportações).
-- Uso: CREATE DATABASE karanu CHARACTER SET utf8mb4 COLLATE utf8mb4_bin; USE karanu; rode este arquivo e depois dados.sql.

SET NAMES utf8mb4;

CREATE TABLE `ADEGAS` (
  `USUARIO_ID` int NOT NULL,
  `NOME` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`USUARIO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Nome da adega de cada usuaria. RETENCAO: tudo, cadastro';

CREATE TABLE `CONFIG` (
  `CHAVE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `VALOR` varchar(600) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`CHAVE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Configuracao do app (rodizio do Gemini). Sem segredos. RETENCAO: tudo, cadastro';

CREATE TABLE `EXPORT_LEVE` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `TIPO` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'LEVE' COMMENT 'LEVE, TUDO ou GIT',
  `NOME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `ESTADO` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ENVIANDO' COMMENT 'ENVIANDO, PRONTO ou ERRO',
  `ETAPA` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `ERRO` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `CHAVE_ARQUIVO` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'zip privado; so os 2 ultimos de cada tipo ficam guardados',
  `TAMANHO_BYTES` bigint NULL DEFAULT NULL,
  `DETALHE` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'JSON: no envio ao GitHub, arquivos, commit e link',
  `INICIOU_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `TERMINOU_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `IX_EXPLEVE_TIPO` (`TIPO`, `ID`),
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Andamento e registro das exportacoes (leve, completa) e dos envios ao GitHub. RETENCAO: tudo (auditoria)';

CREATE TABLE `FONTES` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `USUARIO_ID` int NOT NULL,
  `NOME` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `CATEGORIA` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `URL` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `CONDICOES` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  KEY `IX_FONTES_USUARIO` (`USUARIO_ID`),
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Sites de referencia cadastrados a mao (sem scraping). RETENCAO: tudo, cadastro';

CREATE TABLE `PACOTE_EXPORTACOES` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `USUARIO_ID` int NOT NULL,
  `STATUS` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'CODIGO_ENVIADO, SUBSTITUIDO, GERANDO, GERADO, FALHA, NEGADO',
  `CODIGO_HASH` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'SHA-256 do sal + codigo de 6 digitos; apagado assim que o codigo e usado',
  `CODIGO_SAL` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `EXPIRA_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'o codigo vale 10 minutos',
  `TENTATIVAS` int NOT NULL DEFAULT 0 COMMENT 'tentativas erradas; com 5 o codigo para de valer',
  `ARQUIVO_KEY` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'zip privado gerado; apagado depois do download',
  `TAMANHO` int NULL DEFAULT NULL,
  `SHA256` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `AVISOS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `GERADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `DESCARTADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `IX_PACEXP_USUARIO` (`USUARIO_ID`, `ID`),
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Log das exportacoes do pacote completo gerado na hora (so o dono gera). RETENCAO: tudo (auditoria)';

CREATE TABLE `PACOTE_PROJETO` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `CHAVE` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `TAMANHO` int NOT NULL,
  `GERADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `LIBERADO_PARA` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `VERSAO_APP` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'commit do git do codigo do pacote; a tela compara com a versao aberta',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Pacote completo do app (zip privado) para baixar em Configuracoes; so os desenvolvedores do projeto (LIBERADO_PARA = ids) baixam. RETENCAO: os 5 ultimos';

CREATE TABLE `PREFERENCIAS` (
  `USUARIO_ID` int NOT NULL,
  `TEMPERATURA` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'C',
  `ESCALA_NOTA` int NOT NULL DEFAULT 100,
  `PAIS` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'Brasil',
  `ATUALIZADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `TIPOS_FAVORITOS` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `GOSTO_LIVRE` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `ALERTA_INICIO` tinyint(1) NOT NULL DEFAULT 1,
  `ALERTA_AUGE` tinyint(1) NOT NULL DEFAULT 1,
  `ALERTA_SAINDO` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`USUARIO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Preferencias da usuaria: temperatura C ou F, escala de nota 100 ou 5 (so exibicao; notas ficam guardadas em 0-100) e pais. RETENCAO: tudo, cadastro';

CREATE TABLE `SOMMELIER_MENSAGENS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `USUARIO_ID` int NOT NULL,
  `PAPEL` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `TEXTO` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `SUGESTOES` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `VIA_AUDIO` tinyint(1) NOT NULL DEFAULT 0,
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `IX_MSG_USUARIO` (`USUARIO_ID`, `ID`),
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Conversa com o sommelier por usuaria. RETENCAO: ultimas 200 mensagens por usuaria (a funcao que grava apaga as antigas); a usuaria apaga tudo quando quiser';

CREATE TABLE `TIPOS_VINHO` (
  `ID` int NOT NULL,
  `NOME` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Tipos de vinho (tinto, branco...). RETENCAO: tudo, cadastro fixo';

CREATE TABLE `VINHOS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `USUARIO_ID` int NOT NULL,
  `NOME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `PRODUTOR` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `PAIS` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `REGIAO` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `UVA` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `TIPO_ID` int NULL DEFAULT NULL,
  `FOTO_KEY` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `NOTAS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `IX_VINHOS_USUARIO` (`USUARIO_ID`),
  PRIMARY KEY (`ID`),
  KEY `TIPO_ID` (`TIPO_ID`),
  CONSTRAINT `VINHOS_ibfk_1` FOREIGN KEY (`TIPO_ID`) REFERENCES `TIPOS_VINHO` (`ID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Rotulos de vinho de cada usuaria (sem ano). RETENCAO: tudo, cadastro da usuaria';

CREATE TABLE `SAFRAS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `VINHO_ID` int NOT NULL,
  `ANO` int NOT NULL,
  `JANELA_INICIO` int NULL DEFAULT NULL,
  `JANELA_AUGE` int NULL DEFAULT NULL,
  `JANELA_FIM` int NULL DEFAULT NULL,
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UQ_SAFRA` (`VINHO_ID`, `ANO`),
  CONSTRAINT `SAFRAS_ibfk_1` FOREIGN KEY (`VINHO_ID`) REFERENCES `VINHOS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Safra (ano) de um vinho, com janela de consumo. Estoque = soma das movimentacoes. RETENCAO: tudo, cadastro';

CREATE TABLE `ALERTAS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `SAFRA_ID` int NOT NULL,
  `TIPO` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ANO_REF` int NOT NULL,
  `LIDO` tinyint(1) NOT NULL DEFAULT 0,
  `ARQUIVADO` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'arquivado pela usuaria: sai da lista normal; a geracao de alertas nunca muda este campo',
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UQ_ALERTA` (`SAFRA_ID`, `TIPO`),
  CONSTRAINT `ALERTAS_ibfk_1` FOREIGN KEY (`SAFRA_ID`) REFERENCES `SAFRAS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Alertas de janela (INICIO, AUGE, SAINDO), um por safra e tipo. RETENCAO: tudo, some com a safra';

CREATE TABLE `AVALIACOES_EXTERNAS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `SAFRA_ID` int NOT NULL,
  `FONTE_ID` int NULL DEFAULT NULL,
  `FONTE_NOME` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `FONTE_URL` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `AVALIADOR` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `NOTA` decimal(6,2) NOT NULL,
  `ESCALA_MAX` int NOT NULL,
  `TIPO` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `DATA` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `URL` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `FONTE_ID` (`FONTE_ID`),
  PRIMARY KEY (`ID`),
  KEY `SAFRA_ID` (`SAFRA_ID`),
  CONSTRAINT `AVALIACOES_EXTERNAS_ibfk_1` FOREIGN KEY (`SAFRA_ID`) REFERENCES `SAFRAS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `AVALIACOES_EXTERNAS_ibfk_2` FOREIGN KEY (`FONTE_ID`) REFERENCES `FONTES` (`ID`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Notas de terceiros registradas a mao; FONTE_NOME/FONTE_URL guardam a fonte original (RN-13). RETENCAO: tudo, cadastro';

CREATE TABLE `AVALIACOES_PESSOAIS` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `SAFRA_ID` int NOT NULL,
  `NOTA` int NOT NULL,
  `COMENTARIO` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `DATA` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `SAFRA_ID` (`SAFRA_ID`),
  CONSTRAINT `AVALIACOES_PESSOAIS_ibfk_1` FOREIGN KEY (`SAFRA_ID`) REFERENCES `SAFRAS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Avaliacao pessoal 0-100 por safra. RETENCAO: tudo, cadastro';

CREATE TABLE `MOVIMENTACOES` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `SAFRA_ID` int NOT NULL,
  `TIPO` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `QUANTIDADE` int NOT NULL,
  `MOTIVO` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `DATA` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `CRIADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  KEY `IX_MOV_SAFRA` (`SAFRA_ID`),
  PRIMARY KEY (`ID`),
  CONSTRAINT `MOVIMENTACOES_ibfk_1` FOREIGN KEY (`SAFRA_ID`) REFERENCES `SAFRAS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Entradas (E) e baixas (S) de garrafas por safra. RETENCAO: tudo, historico pedido pela usuaria';

CREATE TABLE `SAFRA_SERVICO` (
  `SAFRA_ID` int NOT NULL,
  `TEMPERATURA` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `DECANTACAO` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `ABERTURA` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `TACA` varchar(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `DEPOIS_ABERTO` varchar(600) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `ORIGEM` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ATUALIZADO_EM` varchar(19) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`SAFRA_ID`),
  CONSTRAINT `SAFRA_SERVICO_ibfk_1` FOREIGN KEY (`SAFRA_ID`) REFERENCES `SAFRAS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Como servir cada safra (gerado pelo sommelier ou editado pela usuaria). RETENCAO: tudo, sai junto com a safra';

CREATE OR REPLACE SQL SECURITY DEFINER VIEW `VW_SAFRAS` AS select `b`.`ID` AS `ID`,`b`.`VINHO_ID` AS `VINHO_ID`,`b`.`USUARIO_ID` AS `USUARIO_ID`,`b`.`ANO` AS `ANO`,`b`.`JANELA_INICIO` AS `JANELA_INICIO`,`b`.`JANELA_AUGE` AS `JANELA_AUGE`,`b`.`JANELA_FIM` AS `JANELA_FIM`,`b`.`ESTOQUE` AS `ESTOQUE`,`b`.`STATUS` AS `STATUS`,`b`.`ANOS_PARA_FIM` AS `ANOS_PARA_FIM`,(case `b`.`STATUS` when 'SAINDO' then 1 when 'AUGE_FIM' then 1 when 'PASSOU' then 2 when 'AUGE' then 3 when 'JANELA' then 4 when 'CEDO' then 5 else 6 end) AS `PRIORIDADE` from (select `s`.`ID` AS `ID`,`s`.`VINHO_ID` AS `VINHO_ID`,`v`.`USUARIO_ID` AS `USUARIO_ID`,`s`.`ANO` AS `ANO`,`s`.`JANELA_INICIO` AS `JANELA_INICIO`,`s`.`JANELA_AUGE` AS `JANELA_AUGE`,`s`.`JANELA_FIM` AS `JANELA_FIM`,coalesce((select sum((case `m`.`TIPO` when 'E' then `m`.`QUANTIDADE` else -(`m`.`QUANTIDADE`) end)) from `MOVIMENTACOES` `m` where (`m`.`SAFRA_ID` = `s`.`ID`)),0) AS `ESTOQUE`,(case when ((`s`.`JANELA_INICIO` is null) or (`s`.`JANELA_AUGE` is null) or (`s`.`JANELA_FIM` is null)) then 'SEM_JANELA' when (year(curdate()) < `s`.`JANELA_INICIO`) then 'CEDO' when (year(curdate()) > `s`.`JANELA_FIM`) then 'PASSOU' when ((year(curdate()) = `s`.`JANELA_FIM`) and (`s`.`JANELA_AUGE` = `s`.`JANELA_FIM`)) then 'AUGE_FIM' when (year(curdate()) = `s`.`JANELA_FIM`) then 'SAINDO' when (year(curdate()) = `s`.`JANELA_AUGE`) then 'AUGE' else 'JANELA' end) AS `STATUS`,(case when (`s`.`JANELA_FIM` is null) then NULL else (cast(`s`.`JANELA_FIM` as signed) - cast(year(curdate()) as signed)) end) AS `ANOS_PARA_FIM` from (`SAFRAS` `s` join `VINHOS` `v` on((`v`.`ID` = `s`.`VINHO_ID`)))) `b`;
