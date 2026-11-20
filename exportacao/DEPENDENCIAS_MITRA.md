# Dependências da plataforma Mitra

O que o app usa do Mitra e que precisa ser trocado em outra hospedagem.

## Server Functions: número, nome e quem chama

As telas chamam as funções pelo número (`frontend/src/lib/sf.ts`), por `callSF`/`callRows` em `frontend/src/lib/api.ts` (`executeServerFunctionMitra`). Fora do Mitra, cada uma vira uma rota da sua API.

| Nº | Nome | Tipo | Telas e componentes que chamam | Chamada por outras funções |
|---:|---|---|---|---|
| 1 | geminiGerar | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 55 | geminiGerarReserva1 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 56 | geminiGerarReserva2 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 57 | geminiGerarReserva3 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 20 | geminiGerarLeve | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 58 | geminiGerarLeveReserva1 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 59 | geminiGerarLeveReserva2 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 60 | geminiGerarLeveReserva3 | Integração (Google Gemini) | - | lerRotulo, sommelierPerguntar, vinhoBuscarNome, servicoGerar, janelaSugerir (via gemini()) |
| 21 | inicioResumo | SQL | pages/ConfiguracoesPage.tsx, pages/InicioPage.tsx | - |
| 61 | adegaGarantir | SQL | components/Layout.tsx | - |
| 66 | adegaRenomear | SQL | pages/ConfiguracoesPage.tsx | - |
| 67 | preferenciasLer | SQL | lib/preferencias.ts | - |
| 68 | preferenciasSalvar | SQL | lib/preferencias.ts | - |
| 73 | gostoSalvar | SQL | - | - |
| 74 | alertasEscolher | SQL | - | - |
| 75 | contaEu | SQL | - | pacoteCodigoPedir, pacoteGerar |
| 69 | estoqueSafras | SQL | pages/SommelierPage.tsx | - |
| 22 | dominios | SQL | components/VinhoForm.tsx, pages/AdegaPage.tsx, pages/VinhoPage.tsx | - |
| 23 | adegaListar | SQL | pages/AdegaPage.tsx | - |
| 24 | vinhoFicha | SQL | pages/VinhoPage.tsx | - |
| 25 | vinhoProcurarIgual | SQL | - | lerRotulo, vinhoBuscarNome |
| 26 | vinhoCriar | SQL | pages/NovoVinhoPage.tsx | - |
| 27 | vinhoUltimo | SQL | pages/NovoVinhoPage.tsx | - |
| 28 | vinhoAtualizar | SQL | pages/VinhoPage.tsx | - |
| 29 | vinhoExcluir | SQL | pages/VinhoPage.tsx | - |
| 30 | safraCriar | SQL | pages/VinhoPage.tsx | - |
| 31 | safraExcluir | SQL | pages/VinhoPage.tsx | - |
| 32 | safraJanela | SQL | pages/VinhoPage.tsx | - |
| 33 | movimentar | SQL | components/BeberLogoDialog.tsx, components/ContadorGarrafas.tsx, pages/VinhoPage.tsx | - |
| 34 | avaliacaoPessoalCriar | SQL | pages/VinhoPage.tsx | - |
| 35 | avaliacaoPessoalExcluir | SQL | pages/VinhoPage.tsx | - |
| 36 | avaliacaoExternaCriar | SQL | pages/VinhoPage.tsx | - |
| 37 | avaliacaoExternaExcluir | SQL | pages/VinhoPage.tsx | - |
| 38 | fontesListar | SQL | pages/FontesPage.tsx | - |
| 39 | fonteSalvar | SQL | pages/FontesPage.tsx | - |
| 40 | fonteExcluir | SQL | pages/FontesPage.tsx | - |
| 41 | alertasListar | SQL | pages/AlertasPage.tsx | - |
| 42 | alertasContar | SQL | components/Layout.tsx | - |
| 43 | alertaMarcarLido | SQL | pages/AlertasPage.tsx | - |
| 77 | alertaArquivar | SQL | pages/AlertasPage.tsx | - |
| 44 | alertasMarcarTodos | SQL | pages/AlertasPage.tsx | - |
| 72 | alertasConferir | SQL | components/Layout.tsx | - |
| 45 | alertasRotina | SQL | - | - |
| 46 | exportarTudo | SQL | lib/exportar.ts | - |
| 47 | fotoKeys | SQL | - | fotosLinks |
| 48 | sommelierContexto | SQL | - | sommelierPerguntar |
| 49 | sommelierGravar | SQL | - | sommelierPerguntar |
| 50 | sommelierHistorico | SQL | pages/SommelierPage.tsx | - |
| 63 | servicoContexto | SQL | - | servicoGerar |
| 64 | servicoSalvar | SQL | pages/VinhoPage.tsx | servicoGerar |
| 51 | sommelierApagar | SQL | pages/ConfiguracoesPage.tsx, pages/SommelierPage.tsx | - |
| 70 | pacoteUltimo | SQL | - | pacoteLink |
| 52 | fotosLinks | JavaScript | pages/AdegaPage.tsx, pages/VinhoPage.tsx | - |
| 71 | pacoteLink | JavaScript | pages/ConfiguracoesPage.tsx | - |
| 80 | pacoteCodigoPedir | JavaScript | pages/ConfiguracoesPage.tsx | - |
| 81 | pacoteGerar | JavaScript | pages/ConfiguracoesPage.tsx | - |
| 53 | lerRotulo | JavaScript | pages/NovoVinhoPage.tsx | - |
| 62 | vinhoBuscarNome | JavaScript | pages/NovoVinhoPage.tsx | - |
| 54 | sommelierPerguntar | JavaScript | pages/SommelierPage.tsx | - |
| 65 | servicoGerar | JavaScript | pages/VinhoPage.tsx | - |
| 76 | janelaSugerir | JavaScript | pages/NovoVinhoPage.tsx, pages/VinhoPage.tsx | - |

## Consultas que usam :VAR_USER

`:VAR_USER` é trocado pelo Mitra pelo id da pessoa logada. Fora do Mitra, passe o id do usuário autenticado como parâmetro (nunca vindo da tela).

- inicioResumo (nº 21, `funcoes/021-inicioResumo.sql`): 11 uso(s)
- dominios (nº 22, `funcoes/022-dominios.sql`): 5 uso(s)
- adegaListar (nº 23, `funcoes/023-adegaListar.sql`): 1 uso(s)
- vinhoFicha (nº 24, `funcoes/024-vinhoFicha.sql`): 1 uso(s)
- vinhoProcurarIgual (nº 25, `funcoes/025-vinhoProcurarIgual.sql`): 1 uso(s)
- vinhoCriar (nº 26, `funcoes/026-vinhoCriar.sql`): 1 uso(s)
- vinhoUltimo (nº 27, `funcoes/027-vinhoUltimo.sql`): 1 uso(s)
- vinhoAtualizar (nº 28, `funcoes/028-vinhoAtualizar.sql`): 1 uso(s)
- vinhoExcluir (nº 29, `funcoes/029-vinhoExcluir.sql`): 1 uso(s)
- safraCriar (nº 30, `funcoes/030-safraCriar.sql`): 1 uso(s)
- safraExcluir (nº 31, `funcoes/031-safraExcluir.sql`): 1 uso(s)
- safraJanela (nº 32, `funcoes/032-safraJanela.sql`): 4 uso(s)
- movimentar (nº 33, `funcoes/033-movimentar.sql`): 2 uso(s)
- avaliacaoPessoalCriar (nº 34, `funcoes/034-avaliacaoPessoalCriar.sql`): 1 uso(s)
- avaliacaoPessoalExcluir (nº 35, `funcoes/035-avaliacaoPessoalExcluir.sql`): 1 uso(s)
- avaliacaoExternaCriar (nº 36, `funcoes/036-avaliacaoExternaCriar.sql`): 2 uso(s)
- avaliacaoExternaExcluir (nº 37, `funcoes/037-avaliacaoExternaExcluir.sql`): 1 uso(s)
- fontesListar (nº 38, `funcoes/038-fontesListar.sql`): 1 uso(s)
- fonteSalvar (nº 39, `funcoes/039-fonteSalvar.sql`): 2 uso(s)
- fonteExcluir (nº 40, `funcoes/040-fonteExcluir.sql`): 1 uso(s)
- alertasListar (nº 41, `funcoes/041-alertasListar.sql`): 1 uso(s)
- alertasContar (nº 42, `funcoes/042-alertasContar.sql`): 1 uso(s)
- alertaMarcarLido (nº 43, `funcoes/043-alertaMarcarLido.sql`): 1 uso(s)
- alertasMarcarTodos (nº 44, `funcoes/044-alertasMarcarTodos.sql`): 1 uso(s)
- exportarTudo (nº 46, `funcoes/046-exportarTudo.sql`): 7 uso(s)
- fotoKeys (nº 47, `funcoes/047-fotoKeys.sql`): 1 uso(s)
- sommelierContexto (nº 48, `funcoes/048-sommelierContexto.sql`): 4 uso(s)
- sommelierGravar (nº 49, `funcoes/049-sommelierGravar.sql`): 4 uso(s)
- sommelierHistorico (nº 50, `funcoes/050-sommelierHistorico.sql`): 1 uso(s)
- sommelierApagar (nº 51, `funcoes/051-sommelierApagar.sql`): 1 uso(s)
- adegaGarantir (nº 61, `funcoes/061-adegaGarantir.sql`): 2 uso(s)
- servicoContexto (nº 63, `funcoes/063-servicoContexto.sql`): 1 uso(s)
- servicoSalvar (nº 64, `funcoes/064-servicoSalvar.sql`): 1 uso(s)
- adegaRenomear (nº 66, `funcoes/066-adegaRenomear.sql`): 2 uso(s)
- preferenciasLer (nº 67, `funcoes/067-preferenciasLer.sql`): 1 uso(s)
- preferenciasSalvar (nº 68, `funcoes/068-preferenciasSalvar.sql`): 2 uso(s)
- estoqueSafras (nº 69, `funcoes/069-estoqueSafras.sql`): 1 uso(s)
- pacoteUltimo (nº 70, `funcoes/070-pacoteUltimo.sql`): 1 uso(s)
- alertasConferir (nº 72, `funcoes/072-alertasConferir.sql`): 1 uso(s)
- gostoSalvar (nº 73, `funcoes/073-gostoSalvar.sql`): 2 uso(s)
- alertasEscolher (nº 74, `funcoes/074-alertasEscolher.sql`): 2 uso(s)
- contaEu (nº 75, `funcoes/075-contaEu.sql`): 1 uso(s)
- alertaArquivar (nº 77, `funcoes/077-alertaArquivar.sql`): 1 uso(s)

Total: 43 funções.

## Usos de mitra-sdk, mitra-interactions-sdk, uploadFilePrivate, getFileLink e downloadFilePrivate

### No código-fonte (`codigo/`)

| Arquivo:linha | Trecho |
|---|---|
| `backend/scripts/01-tabelas.mjs:2` | `import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';` |
| `backend/scripts/02-visao.mjs:2` | `import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';` |
| `backend/scripts/03-funcoes.mjs:8` | `} from 'mitra-sdk';` |
| `backend/scripts/03-funcoes.mjs:355` | `const mitra = require('mitra-sdk');` |
| `backend/scripts/03-funcoes.mjs:393` | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| `backend/scripts/03-funcoes.mjs:406` | `try { const l = await mitra.getFileLinkMitra({ projectId, key: r.FOTO_KEY, ttlSeconds: 3600 }); links[r.ID] = l.result.url; } catch (e) {}` |
| `backend/scripts/03-funcoes.mjs:415` | `const l = await mitra.getFileLinkMitra({ projectId, key: r.CHAVE, ttlSeconds: 3600 });` |
| `backend/scripts/04-dados-exemplo.mjs:5` | `import { configureSdkMitra, runDmlMitra, listProjectUsersMitra, executeServerFunctionMitra, listServerFunctionsMitra } from 'mitra-sdk';` |
| `backend/scripts/05-rotina-perfil.mjs:5` | `} from 'mitra-sdk';` |
| `backend/scripts/06-servico.mjs:3` | `import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';` |
| `backend/scripts/07-preferencias.mjs:3` | `import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';` |
| `backend/scripts/08-pacote.mjs:17` | `listProfilesMitra, getProfileDetailsMitra, listProjectUsersMitra, listIntegrationsMitra, uploadFilePrivateMitra, downloadFilePrivateMitra,` |
| `backend/scripts/08-pacote.mjs:18` | `} from 'mitra-sdk';` |
| `backend/scripts/08-pacote.mjs:185` | `const buf = Buffer.from(await (await downloadFilePrivateMitra({ projectId, key: chave })).arrayBuffer());` |
| `backend/scripts/08-pacote.mjs:266` | `const USO_SDK = /mitra-sdk\|mitra-interactions-sdk\|uploadFilePrivate\|getFileLink\|downloadFilePrivate/;` |
| `backend/scripts/08-pacote.mjs:292` | `## Usos de mitra-sdk, mitra-interactions-sdk, uploadFilePrivate, getFileLink e downloadFilePrivate` |
| `backend/scripts/08-pacote.mjs:313` | `- Login e sessão: \`frontend/src/lib/mitra-auth.ts\` e \`frontend/src/pages/LoginPage.tsx\` (\`mitra-interactions-sdk\`, variáveis \`VITE_MI` |
| `backend/scripts/08-pacote.mjs:316` | `- Arquivos privados: fotos de rótulo e áudios enviados por \`uploadFilePrivateMitra\` e lidos pelas funções com \`downloadFilePrivateMitra\`` |
| `backend/scripts/08-pacote.mjs:317` | `- Scripts de \`backend/scripts/\`: usam \`mitra-sdk\` com o token de desenvolvimento.` |
| `backend/scripts/08-pacote.mjs:378` | `# backend/.env (usadas pelos scripts de backend/scripts com mitra-sdk)` |
| `backend/scripts/08-pacote.mjs:417` | `'Bibliotecas do Mitra (mitra-sdk, mitra-interactions-sdk): vêm só como dependência no package.json. O login, a chamada das funções, o envio ` |
| `backend/scripts/08-pacote.mjs:477` | `const up = await uploadFilePrivateMitra({ projectId, file: new File([bytes], path.basename(zip), { type: 'application/zip' }) });` |
| `backend/scripts/09-preferencias-gosto.mjs:3` | `import { configureSdkMitra, runDdlMitra, runDmlMitra } from 'mitra-sdk';` |
| `backend/scripts/10-alertas-arquivado.mjs:4` | `import { configureSdkMitra, runDdlMitra, runQueryMitra } from 'mitra-sdk';` |
| `backend/scripts/11-pacote-exportacoes.mjs:4` | `import { configureSdkMitra, runDdlMitra } from 'mitra-sdk';` |
| `backend/scripts/sf/pacoteGerar.js:113` | `const zipEst = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: String(est.CHAVE) })).arrayBuffer());` |
| `backend/scripts/sf/pacoteGerar.js:227` | `const buf = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: chave })).arrayBuffer());` |
| `backend/scripts/sf/pacoteGerar.js:299` | `const up = await mitra.uploadFilePrivateMitra({ projectId, file: new File([zip], nomeArquivo, { type: 'application/zip' }) });` |
| `backend/scripts/sf/pacoteGerar.js:302` | `resposta.url = (await mitra.getFileLinkMitra({ projectId, key: chave, ttlSeconds: 120 })).result.url;` |
| `backend/scripts/teste-ia.mjs:4` | `import { configureSdkMitra, executeServerFunctionMitra, listServerFunctionsMitra, uploadFilePrivateMitra } from 'mitra-sdk';` |
| `backend/scripts/teste-ia.mjs:22` | `const up = await uploadFilePrivateMitra({ projectId, file: new Blob([fs.readFileSync(audio)], { type: 'audio/wav' }) });` |
| `backend/scripts/teste-ia.mjs:26` | `const up = await uploadFilePrivateMitra({ projectId, file: new Blob([fs.readFileSync(rotulo)], { type: 'image/jpeg' }) });` |
| `backend/scripts/teste-regras.mjs:3` | `import { configureSdkMitra, executeServerFunctionMitra, listServerFunctionsMitra } from 'mitra-sdk';` |
| `backend/setup-gemini.mjs:10` | `import { configureSdkMitra, createIntegrationMitra, listIntegrationsMitra, callIntegrationMitra } from 'mitra-sdk';` |
| `frontend/eslint.config.js:29` | `name: 'mitra-sdk',` |
| `frontend/eslint.config.js:32` | `'mitra-sdk é exclusiva de scripts de backend — em telas use mitra-interactions-sdk (mesmos nomes de função). Única exceção permitida: manage` |
| `frontend/eslint.config.js:35` | `name: 'mitra-interactions-sdk',` |
| `frontend/src/lib/api.ts:1` | `import { executeServerFunctionMitra, uploadFilePrivateMitra } from 'mitra-interactions-sdk';` |
| `frontend/src/lib/api.ts:49` | `const r = await uploadFilePrivateMitra({ projectId: PROJECT_ID, file: arquivo });` |
| `frontend/src/lib/mitra-auth.ts:1` | `import { configureSdkMitra } from 'mitra-interactions-sdk';` |
| `frontend/src/pages/LoginPage.tsx:13` | `} from 'mitra-interactions-sdk';` |
| `frontend/src/pages/LoginPage.tsx:14` | `import type { LoginResponse } from 'mitra-interactions-sdk';` |

### Dentro das Server Functions JavaScript (`funcoes/`)

| Função (arquivo:linha) | Trecho |
|---|---|
| fotosLinks (`funcoes/052-fotosLinks.js:2`) | `const mitra = require('mitra-sdk');` |
| fotosLinks (`funcoes/052-fotosLinks.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| fotosLinks (`funcoes/052-fotosLinks.js:51`) | `try { const l = await mitra.getFileLinkMitra({ projectId, key: r.FOTO_KEY, ttlSeconds: 3600 }); links[r.ID] = l.result.url; } catch (e) {}` |
| lerRotulo (`funcoes/053-lerRotulo.js:2`) | `const mitra = require('mitra-sdk');` |
| lerRotulo (`funcoes/053-lerRotulo.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| sommelierPerguntar (`funcoes/054-sommelierPerguntar.js:2`) | `const mitra = require('mitra-sdk');` |
| sommelierPerguntar (`funcoes/054-sommelierPerguntar.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| vinhoBuscarNome (`funcoes/062-vinhoBuscarNome.js:2`) | `const mitra = require('mitra-sdk');` |
| vinhoBuscarNome (`funcoes/062-vinhoBuscarNome.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| servicoGerar (`funcoes/065-servicoGerar.js:2`) | `const mitra = require('mitra-sdk');` |
| servicoGerar (`funcoes/065-servicoGerar.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| pacoteLink (`funcoes/071-pacoteLink.js:2`) | `const mitra = require('mitra-sdk');` |
| pacoteLink (`funcoes/071-pacoteLink.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| pacoteLink (`funcoes/071-pacoteLink.js:49`) | `const l = await mitra.getFileLinkMitra({ projectId, key: r.CHAVE, ttlSeconds: 3600 });` |
| janelaSugerir (`funcoes/076-janelaSugerir.js:2`) | `const mitra = require('mitra-sdk');` |
| janelaSugerir (`funcoes/076-janelaSugerir.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| pacoteCodigoPedir (`funcoes/080-pacoteCodigoPedir.js:2`) | `const mitra = require('mitra-sdk');` |
| pacoteCodigoPedir (`funcoes/080-pacoteCodigoPedir.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:2`) | `const mitra = require('mitra-sdk');` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:40`) | `const blob = await mitra.downloadFilePrivateMitra({ projectId, key });` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:158`) | `const zipEst = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: String(est.CHAVE) })).arrayBuffer());` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:272`) | `const buf = Buffer.from(await (await mitra.downloadFilePrivateMitra({ projectId, key: chave })).arrayBuffer());` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:344`) | `const up = await mitra.uploadFilePrivateMitra({ projectId, file: new File([zip], nomeArquivo, { type: 'application/zip' }) });` |
| pacoteGerar (`funcoes/081-pacoteGerar.js:347`) | `resposta.url = (await mitra.getFileLinkMitra({ projectId, key: chave, ttlSeconds: 120 })).result.url;` |

## Rotina agendada

- **alertasRotina** (nº 45, `funcoes/045-alertasRotina.sql`): agendamento `0 0 6 * * *` (formato do Mitra com segundos: todo dia às 6h00, fuso do servidor do Mitra). Rotina diária (agendada): gera os alertas de janela de todas as adegas. Não vai para perfil.
  Cria em ALERTAS os avisos de janela (INICIO, AUGE, SAINDO) das safras com estoque, sem repetir (INSERT IGNORE). Fora do Mitra: um cron `0 6 * * *` rodando esse SQL.

## Outros recursos do Mitra

- Login e sessão: `frontend/src/lib/mitra-auth.ts` e `frontend/src/pages/LoginPage.tsx` (`mitra-interactions-sdk`, variáveis `VITE_MITRA_AUTH_URL` e `VITE_MITRA_PROJECT_ID`).
- Perfis e permissões: `plataforma/perfis-e-acessos.json`.
- Chamadas ao Google Gemini: funções de integração ligadas às conexões do Mitra (`config/CONEXOES.md`).
- Arquivos privados: fotos de rótulo e áudios enviados por `uploadFilePrivateMitra` e lidos pelas funções com `downloadFilePrivateMitra` / `getFileLinkMitra`.
- Scripts de `backend/scripts/`: usam `mitra-sdk` com o token de desenvolvimento.
