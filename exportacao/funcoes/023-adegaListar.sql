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
LIMIT {{limit}} OFFSET {{offset}}
