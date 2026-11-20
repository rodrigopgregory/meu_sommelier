UPDATE VINHOS SET NOME = TRIM('{{nome}}'), PRODUTOR = NULLIF(TRIM('{{produtor}}'), ''), PAIS = NULLIF(TRIM('{{pais}}'), ''), REGIAO = NULLIF(TRIM('{{regiao}}'), ''),
  UVA = NULLIF(TRIM('{{uva}}'), ''), TIPO_ID = (SELECT ID FROM TIPOS_VINHO WHERE ID = {{tipoId}}), NOTAS = NULLIF('{{notas}}', ''),
  FOTO_KEY = CASE WHEN '{{fotoKey}}' LIKE 'ai-files/private/%' THEN '{{fotoKey}}' WHEN {{removerFoto}} = 1 THEN NULL ELSE FOTO_KEY END
WHERE ID = {{id}} AND USUARIO_ID = :VAR_USER AND TRIM('{{nome}}') <> ''
