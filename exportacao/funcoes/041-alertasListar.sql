SELECT a.ID, a.TIPO, a.ANO_REF, a.LIDO, a.ARQUIVADO, a.CRIADO_EM, vs.ID AS SAFRA_ID, vs.ANO, vs.ESTOQUE, vs.STATUS, v.ID AS VINHO_ID, v.NOME, v.PRODUTOR
FROM ALERTAS a JOIN VW_SAFRAS vs ON vs.ID = a.SAFRA_ID JOIN VINHOS v ON v.ID = vs.VINHO_ID
WHERE vs.USUARIO_ID = :VAR_USER AND ('{{tipo}}' = '' OR a.TIPO = '{{tipo}}') AND ('{{lido}}' = '' OR a.LIDO = ('{{lido}}' = '1'))
  AND a.ARQUIVADO = ('{{arquivado}}' = '1')
ORDER BY a.LIDO, a.ID DESC LIMIT {{limit}} OFFSET {{offset}}
