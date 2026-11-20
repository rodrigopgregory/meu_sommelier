import { executeServerFunctionMitra, uploadFilePrivateMitra } from 'mitra-interactions-sdk';
import { getMitraErrorMessage } from './utils';

const PROJECT_ID = Number(import.meta.env.VITE_MITRA_PROJECT_ID);

function extractOutput(res: unknown): unknown {
  const r = res as { result?: { output?: unknown } };
  let output = r?.result?.output;
  if (typeof output === 'string') {
    try { output = JSON.parse(output); } catch { /* mantém texto */ }
  }
  return output;
}

export async function callSF<T = unknown>(serverFunctionId: number, input: Record<string, unknown> = {}): Promise<T> {
  let res;
  try {
    res = await executeServerFunctionMitra({ projectId: PROJECT_ID, serverFunctionId, input });
  } catch (err) {
    throw new Error(traduzirErro(getMitraErrorMessage(err)));
  }
  if (res?.result?.executionStatus !== 'COMPLETED') {
    throw new Error(traduzirErro(getMitraErrorMessage(res?.result?.error)));
  }
  return extractOutput(res) as T;
}

function traduzirErro(msg: string): string {
  if (/RATE_LIMIT|429/.test(msg)) return 'Muitas ações ao mesmo tempo. Espere alguns segundos e tente de novo.';
  if (/Duplicate entry/i.test(msg)) return 'Esse registro já existe.';
  return 'Não foi possível concluir agora. Tente de novo.';
}

export async function callRows<T = Record<string, unknown>>(id: number, input: Record<string, unknown> = {}): Promise<T[]> {
  const o = await callSF<{ rows?: T[] }>(id, input);
  return o?.rows ?? [];
}

export function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try { return (JSON.parse(v) as T) ?? fallback; } catch { return fallback; }
  }
  return v as T;
}

export async function enviarArquivoPrivado(file: Blob, nome: string): Promise<string> {
  const arquivo = new File([file], nome, { type: file.type });
  const r = await uploadFilePrivateMitra({ projectId: PROJECT_ID, file: arquivo });
  const key = r?.result?.key || r?.result?.currentPath;
  if (!key) throw new Error('Não foi possível enviar o arquivo.');
  return key;
}

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dataBR(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function numBR(n: number | string | null | undefined, casas = 0): string {
  if (n == null || n === '') return '–';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export type StatusJanela = 'CEDO' | 'JANELA' | 'AUGE' | 'AUGE_FIM' | 'SAINDO' | 'PASSOU' | 'SEM_JANELA';

export const STATUS_INFO: Record<StatusJanela, { rotulo: string; variante: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' }> = {
  CEDO: { rotulo: 'Ainda cedo', variante: 'info' },
  JANELA: { rotulo: 'Na janela', variante: 'success' },
  AUGE: { rotulo: 'Auge', variante: 'accent' },
  AUGE_FIM: { rotulo: 'Auge – último ano, beber logo', variante: 'warning' },
  SAINDO: { rotulo: 'Saindo da janela – beber logo', variante: 'warning' },
  PASSOU: { rotulo: 'Passou', variante: 'danger' },
  SEM_JANELA: { rotulo: 'Sem janela', variante: 'neutral' },
};

export const FILTRO_STATUS = [
  { value: '', label: 'Todos os status' },
  { value: 'CEDO', label: 'Ainda cedo' },
  { value: 'JANELA', label: 'Na janela' },
  { value: 'AUGE', label: 'Auge' },
  { value: 'SAINDO', label: 'Saindo da janela' },
  { value: 'PASSOU', label: 'Passou' },
  { value: 'SEM_JANELA', label: 'Sem janela' },
];

export const TIPO_ALERTA: Record<string, string> = {
  INICIO: 'Início da janela',
  AUGE: 'Chegou ao auge',
  SAINDO: 'Saindo da janela',
};

export function anosParaFim(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 0) return n === -1 ? 'passou há 1 ano' : `passou há ${-n} anos`;
  if (n === 0) return 'último ano da janela';
  return n === 1 ? 'falta 1 ano' : `faltam ${n} anos`;
}

export const MOTIVOS_ENTRADA = [
  { value: 'compra', label: 'Compra' },
  { value: 'presente', label: 'Presente' },
  { value: 'outro', label: 'Outro' },
];
export const MOTIVOS_BAIXA = [
  { value: 'jantar', label: 'Jantar' },
  { value: 'presente', label: 'Presente' },
  { value: 'outro', label: 'Outro' },
];

export function notificarAlertas() {
  window.dispatchEvent(new Event('alertas-mudaram'));
}
