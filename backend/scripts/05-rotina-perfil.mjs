// Agenda a rotina diária de alertas e cria o perfil "Usuária" com as Server Functions de tela.
import 'dotenv/config';
import {
  configureSdkMitra, listServerFunctionsMitra, updateServerFunctionMitra, listProfilesMitra, createProfileMitra, setProfileServerFunctionsMitra,
} from 'mitra-sdk';
configureSdkMitra({ baseURL: process.env.MITRA_BASE_URL, token: process.env.MITRA_TOKEN, integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS });
const projectId = Number(process.env.MITRA_PROJECT_ID);
if (projectId !== 67509) throw new Error('Projeto errado');

const sfs = new Map(((await listServerFunctionsMitra({ projectId })).result || []).map(f => [f.name, f.id]));
await updateServerFunctionMitra({ projectId, serverFunctionId: sfs.get('alertasRotina'), cronExpression: '0 0 6 * * *' });
console.log('rotina agendada', sfs.get('alertasRotina'));

const ids = [...sfs.entries()].filter(([n]) => n !== 'alertasRotina').map(([, id]) => id);
const perfis = (await listProfilesMitra({ projectId })).result || [];
let perfil = perfis.find(p => p.name === 'Usuária');
if (!perfil) perfil = (await createProfileMitra({ projectId, name: 'Usuária', color: '#7b1e3a' })).result;
const profileId = perfil.id ?? perfil.profileId;
await setProfileServerFunctionsMitra({ projectId, profileId, serverFunctionIds: ids });
console.log('perfil', profileId, 'com', ids.length, 'funções');
