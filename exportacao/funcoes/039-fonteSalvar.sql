INSERT INTO FONTES (USUARIO_ID, NOME, CATEGORIA, URL, CONDICOES)
SELECT :VAR_USER, TRIM('{{nome}}'), '{{categoria}}', CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END, NULLIF('{{condicoes}}', '')
FROM DUAL WHERE {{id}} = 0 AND TRIM('{{nome}}') <> '' AND '{{categoria}}' IN ('PROFISSIONAL', 'COMUNIDADE', 'OUTRA');
UPDATE FONTES SET NOME = TRIM('{{nome}}'), CATEGORIA = '{{categoria}}', URL = CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END, CONDICOES = NULLIF('{{condicoes}}', '')
WHERE {{id}} > 0 AND ID = {{id}} AND USUARIO_ID = :VAR_USER AND TRIM('{{nome}}') <> '' AND '{{categoria}}' IN ('PROFISSIONAL', 'COMUNIDADE', 'OUTRA')
