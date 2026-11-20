# Pacote completo do Karanu (My Sommelier)

  - **Dados gerados agora:** 2026-11-19 23:00:41 (horário de Brasília), no clique do botão.
  - **Código gerado em:** 2026-11-16 09:58:07 (versão 63049f1).

  ## Gerado agora (do banco e do Mitra no momento do clique)
  - `banco/schema.sql`: cria as 16 tabelas e a visão VW_SAFRAS na ordem certa (MySQL 8.3.0, utf8mb4 / utf8mb4_bin).
  - `banco/dados.sql`: 13 tabelas, 99 linhas, INSERTs em lote na ordem das chaves estrangeiras.
  - `banco/csv/`: um CSV por tabela, UTF-8, vírgula, CRLF, cabeçalho. **NULL = `\N`** sem aspas; texto sempre entre aspas (vazio = `""`); números e booleanos (1/0) sem aspas; datas como texto AAAA-MM-DDTHH:MM:SS.
  - `arquivos/`: fotos de rótulo de VINHOS.FOTO_KEY e `manifesto.json` (chave, tamanho, SHA-256, vinho). **Hoje há 0 fotos: o manifesto está vazio.**
  - `plataforma/usuarios.json` e `.csv` (e-mail, tipo, perfis, data de criação), `plataforma/perfis-e-acessos.json`.
  - `MANIFEST.json`: linhas por tabela e todos os arquivos com tamanho e SHA-256. `EXPORT_AVISOS.md`: o que não veio.

  ## Da parte de código (último pacote montado pelo desenvolvimento)
  `codigo/`, `historico/`, `funcoes/`, `DIFF_FUNCOES.md`, `DEPENDENCIAS_MITRA.md`, `config/`, `.env.example`, `plataforma/conexoes.json`, `plataforma/rotinas.json`. Explicação completa e como subir em outro lugar: `README_CODIGO.md`.

  ## Senhas
  Não vêm: o Mitra não deixa ler. No destino, as pessoas redefinem a senha pelo e-mail.
  