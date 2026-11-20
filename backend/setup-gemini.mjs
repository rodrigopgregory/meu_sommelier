// Cria as conexões do Gemini do produto, uma por chave do cofre.
// A ordem de uso fica em CHAVES_GEMINI (scripts/03-funcoes.mjs). Para trocar ou acrescentar uma chave:
// 1) guarde a chave no cofre e baixe com dev.segredoLer (vai para ~/.mitra/segredos/<nome>);
// 2) acrescente { slug, segredo } aqui e rode `node setup-gemini.mjs`;
// 3) ajuste a ordem em CHAVES_GEMINI e rode `node scripts/03-funcoes.mjs`.
// O valor da chave é lido do arquivo local e vai direto para a conexão: nunca fica no código.
import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import { configureSdkMitra, createIntegrationMitra, listIntegrationsMitra, callIntegrationMitra } from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');

export const CONEXOES = [
  { slug: 'gemini-sommelier', nome: 'Google Gemini (chave própria)', segredo: 'gemini-meu-sommelier' },
  { slug: 'gemini', nome: 'Google Gemini (reserva 1: Monitor de Canais)', segredo: 'gemini_monitor_youtube' },
  { slug: 'gemini-reserva-2', nome: 'Google Gemini (reserva 2: Monitor de Canais)', segredo: 'gemini-monitor-youtube-2' },
  { slug: 'gemini-reserva-3', nome: 'Google Gemini (reserva 3: Monitor de Canais)', segredo: 'gemini-monitor-youtube-3' },
];

const lista = await listIntegrationsMitra({ projectId });
const existentes = new Set((Array.isArray(lista) ? lista : (lista.result || [])).map(i => i.slug));
for (const c of CONEXOES) {
  if (!existentes.has(c.slug)) {
    const arquivo = `${os.homedir()}/.mitra/segredos/${c.segredo}`;
    if (!fs.existsSync(arquivo)) { console.log(c.slug, 'sem arquivo da chave: rode dev.segredoLer', c.segredo); continue; }
    const api_key = fs.readFileSync(arquivo, 'utf8').trim();
    await createIntegrationMitra({
      projectId, name: c.nome, slug: c.slug, blueprintId: null, blueprintType: 'HTTP_REQUEST', authType: 'STATIC_KEY',
      credentials: { base_url: 'https://generativelanguage.googleapis.com/v1beta', api_key },
      authorizationConfig: { type: 'query', config: { name: 'key', value: '{{api_key}}' } },
    });
    console.log(c.slug, 'criada');
  }
  const t = await callIntegrationMitra({ projectId, connection: c.slug, method: 'POST', endpoint: '/models/gemini-3.5-flash:generateContent',
    body: { contents: [{ parts: [{ text: 'Responda só: ok' }] }] } });
  console.log(c.slug, 'teste', t.result?.statusCode ?? t.statusCode);
}
