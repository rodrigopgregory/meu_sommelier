# O que não veio nesta exportação, e por quê

Gerada em 2026-11-19 23:00:41 (horário de Brasília).

- Senhas dos usuários (nem o hash): o Mitra bloqueia a leitura das colunas de senha e de token (erro INT_USERS_SECRET_COLUMN), até para o dono do app. No destino, cada pessoa redefine a senha pelo e-mail de plataforma/usuarios.csv.
- Tokens de acesso e chaves do Google Gemini: ficam no cofre do Mitra e não são lidos por esta exportação.
- Dados de PACOTE_PROJETO e PACOTE_EXPORTACOES: são o registro dos pacotes e das exportações; entram só com a estrutura.
- Arquivos fora de VINHOS.FOTO_KEY (pacotes antigos e áudios temporários das mensagens de voz): de propósito, não vêm.

Avisos da parte de código: `EXPORT_AVISOS_CODIGO.md`.
