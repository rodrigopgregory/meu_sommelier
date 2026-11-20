INSERT INTO VINHOS (USUARIO_ID, NOME, PRODUTOR, PAIS, REGIAO, UVA, TIPO_ID, FOTO_KEY, NOTAS, CRIADO_EM)
SELECT :VAR_USER, TRIM('{{nome}}'), NULLIF(TRIM('{{produtor}}'), ''), NULLIF(TRIM('{{pais}}'), ''), NULLIF(TRIM('{{regiao}}'), ''), NULLIF(TRIM('{{uva}}'), ''),
  (SELECT ID FROM TIPOS_VINHO WHERE ID = {{tipoId}}), CASE WHEN '{{fotoKey}}' LIKE 'ai-files/private/%' THEN '{{fotoKey}}' END, NULLIF('{{notas}}', ''), DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')
FROM DUAL WHERE TRIM('{{nome}}') <> '';
SET @vinho = IF(ROW_COUNT() > 0, LAST_INSERT_ID(), NULL);
SET @jOk = {{inicio}} BETWEEN 1900 AND 2200 AND {{auge}} BETWEEN {{inicio}} AND 2200 AND {{fim}} BETWEEN {{auge}} AND 2200;
INSERT INTO SAFRAS (VINHO_ID, ANO, JANELA_INICIO, JANELA_AUGE, JANELA_FIM, CRIADO_EM)
SELECT @vinho, {{ano}}, IF(@jOk, {{inicio}}, NULL), IF(@jOk, {{auge}}, NULL), IF(@jOk, {{fim}}, NULL), DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') FROM DUAL WHERE @vinho IS NOT NULL AND {{ano}} BETWEEN 1900 AND 2100;
SET @safra = IF(@vinho IS NOT NULL AND {{ano}} BETWEEN 1900 AND 2100, LAST_INSERT_ID(), NULL);
INSERT INTO MOVIMENTACOES (SAFRA_ID, TIPO, QUANTIDADE, MOTIVO, DATA, CRIADO_EM)
SELECT @safra, 'E', {{quantidade}}, LEFT('{{motivo}}', 40), '{{data}}', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') FROM DUAL
WHERE @safra IS NOT NULL AND {{quantidade}} BETWEEN 1 AND 10000 AND '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
