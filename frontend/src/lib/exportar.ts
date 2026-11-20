import writeXlsxFile from 'write-excel-file/browser';
import { callRows, parseJson } from './api';
import { SF } from './sf';

type Linha = Record<string, unknown>;

const ABAS: { chave: string; aba: string; colunas: [string, string][] }[] = [
  { chave: 'VINHOS', aba: 'Vinhos', colunas: [['id', 'Id'], ['nome', 'Nome'], ['produtor', 'Produtor'], ['pais', 'País'], ['regiao', 'Região'], ['uva', 'Uva'], ['tipo', 'Tipo'], ['notas', 'Notas'], ['criadoEm', 'Criado em']] },
  { chave: 'SAFRAS', aba: 'Safras', colunas: [['id', 'Id'], ['vinhoId', 'Id do vinho'], ['vinho', 'Vinho'], ['ano', 'Safra'], ['estoque', 'Garrafas'], ['inicio', 'Início da janela'], ['auge', 'Auge'], ['fim', 'Fim da janela'], ['status', 'Status']] },
  { chave: 'MOVIMENTACOES', aba: 'Movimentações', colunas: [['id', 'Id'], ['vinho', 'Vinho'], ['ano', 'Safra'], ['tipo', 'Tipo'], ['quantidade', 'Quantidade'], ['motivo', 'Motivo'], ['data', 'Data']] },
  { chave: 'AVALIACOES', aba: 'Avaliações', colunas: [['vinho', 'Vinho'], ['ano', 'Safra'], ['tipo', 'Tipo'], ['fonte', 'Fonte'], ['avaliador', 'Avaliador'], ['nota', 'Nota original'], ['escala', 'Escala (máx.)'], ['nota100', 'Nota 0–100'], ['comentario', 'Comentário'], ['data', 'Data'], ['url', 'Link']] },
  { chave: 'FONTES', aba: 'Fontes', colunas: [['id', 'Id'], ['nome', 'Nome'], ['categoria', 'Categoria'], ['url', 'Link'], ['condicoes', 'Condições de uso']] },
  { chave: 'ALERTAS', aba: 'Alertas', colunas: [['id', 'Id'], ['vinho', 'Vinho'], ['ano', 'Safra'], ['tipo', 'Tipo'], ['anoRef', 'Ano'], ['lido', 'Lido'], ['arquivado', 'Arquivado'], ['criadoEm', 'Criado em']] },
];

const TRADUCAO: Record<string, string> = { E: 'Entrada', S: 'Baixa', CEDO: 'Ainda cedo', JANELA: 'Na janela', AUGE: 'Auge', AUGE_FIM: 'Auge (último ano)', SAINDO: 'Saindo da janela', PASSOU: 'Passou', SEM_JANELA: 'Sem janela', INICIO: 'Início da janela', PROFISSIONAL: 'Profissional', COMUNIDADE: 'Comunidade', PESSOAL: 'Pessoal', OUTRA: 'Outra' };

function celula(v: unknown, campo: string) {
  if (v == null || v === '') return null;
  if (campo === 'lido' || campo === 'arquivado') return { value: v === true || v === 1 || v === '1' ? 'Sim' : 'Não' };
  if (typeof v === 'number') return { type: Number, value: v };
  if (typeof v === 'boolean') return { value: v ? 'Sim' : 'Não' };
  const s = String(v);
  return { value: TRADUCAO[s] ?? s };
}

export async function exportarTudo(): Promise<void> {
  const linha = (await callRows<Linha>(SF.exportarTudo))[0] ?? {};
  const sheets = ABAS.map(({ chave, aba, colunas }) => {
    const itens = parseJson<Linha[]>(linha[chave], []);
    return {
      sheet: aba,
      stickyRowsCount: 1,
      columns: colunas.map(() => ({ width: 18 })),
      data: [
        colunas.map(([, titulo]) => ({ value: titulo, fontWeight: 'bold' as const })),
        ...itens.map(item => colunas.map(([campo]) => celula(item[campo], campo))),
      ],
    };
  });
  const d = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile(sheets as any).toFile(`karanu-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.xlsx`);
}
