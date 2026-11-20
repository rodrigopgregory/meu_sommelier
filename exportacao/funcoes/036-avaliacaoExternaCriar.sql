INSERT INTO AVALIACOES_EXTERNAS (SAFRA_ID, FONTE_ID, FONTE_NOME, FONTE_URL, AVALIADOR, NOTA, ESCALA_MAX, TIPO, DATA, URL)
SELECT s.ID, f.ID, f.NOME, f.URL, NULLIF(TRIM('{{avaliador}}'), ''), {{nota}}, {{escala}}, '{{tipo}}',
  CASE WHEN '{{data}}' REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN '{{data}}' END,
  CASE WHEN '{{url}}' REGEXP '^https?://' THEN LEFT('{{url}}', 500) END
FROM SAFRAS s JOIN VINHOS v ON v.ID = s.VINHO_ID
LEFT JOIN FONTES f ON f.ID = {{fonteId}} AND f.USUARIO_ID = :VAR_USER
WHERE s.ID = {{safraId}} AND v.USUARIO_ID = :VAR_USER AND {{escala}} IN (5, 100) AND {{nota}} >= 0 AND {{nota}} <= {{escala}}
  AND '{{tipo}}' IN ('PROFISSIONAL', 'COMUNIDADE')
