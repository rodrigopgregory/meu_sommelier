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
WHERE v.ID = {{id}} AND v.USUARIO_ID = :VAR_USER
