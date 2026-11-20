import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, Bell, Check, CheckCheck, Undo2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { SkeletonListItems } from '../components/ui/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { Vazio } from '../components/Campos';
import { useAviso } from '../components/ToastContext';
import { callRows, callSF, dataBR, notificarAlertas, TIPO_ALERTA } from '../lib/api';
import { SF } from '../lib/sf';

interface Alerta { ID: number; TIPO: string; ANO_REF: number; LIDO: number | boolean; ARQUIVADO: number | boolean; CRIADO_EM: string; SAFRA_ID: number; ANO: number; ESTOQUE: number; STATUS: string; VINHO_ID: number; NOME: string; PRODUTOR: string | null }

const PAGINA = 50;

export default function AlertasPage() {
  const [tipo, setTipo] = useState('');
  const [lido, setLido] = useState('');
  const [aba, setAba] = useState<'normal' | 'arquivados'>('normal');
  const [itens, setItens] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mais, setMais] = useState(false);
  const [erro, setErro] = useState('');
  const avisar = useAviso();

  const carregar = useCallback(async (offset = 0) => {
    setCarregando(true);
    try {
      const rows = await callRows<Alerta>(SF.alertasListar, { tipo, lido, arquivado: aba === 'arquivados' ? '1' : '0', limit: PAGINA, offset });
      setItens(prev => (offset === 0 ? rows : [...prev, ...rows]));
      setMais(rows.length === PAGINA);
      setErro('');
    } catch (e) { setErro((e as Error).message); }
    finally { setCarregando(false); }
  }, [tipo, lido, aba]);

  useEffect(() => { carregar(0); }, [carregar]);

  async function marcar(a: Alerta, comoLido: boolean) {
    try { await callSF(SF.alertaMarcarLido, { id: a.ID, lido: comoLido ? '1' : '0' }); notificarAlertas(); carregar(0); }
    catch (e) { avisar('error', (e as Error).message); }
  }
  async function arquivar(a: Alerta, arquivado: boolean) {
    try {
      await callSF(SF.alertaArquivar, { id: a.ID, arquivado: arquivado ? '1' : '0' });
      notificarAlertas();
      avisar('success', arquivado ? 'Alerta arquivado. Ele fica em Arquivados.' : 'Alerta desarquivado. Ele voltou para a lista.');
      carregar(0);
    } catch (e) { avisar('error', (e as Error).message); }
  }
  async function marcarTodos() {
    try { await callSF(SF.alertasMarcarTodos); notificarAlertas(); avisar('success', 'Todos os alertas marcados como lidos.'); carregar(0); }
    catch (e) { avisar('error', (e as Error).message); }
  }

  const ehLido = (a: Alerta) => a.LIDO === true || Number(a.LIDO) === 1;
  const arquivados = aba === 'arquivados';

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader titulo="Alertas" descricao="Avisos de início da janela, auge e saída da janela das safras com garrafas. A verificação roda todo dia de manhã."
        acoes={!arquivados && <Button variant="secondary" onClick={marcarTodos}><CheckCheck size={16} />Marcar todos como lidos</Button>} />
      <div role="tablist" className="inline-flex gap-1 p-1 mb-4 rounded-xl bg-surface-muted">
        {([['normal', 'Alertas'], ['arquivados', 'Arquivados']] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${aba === v ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-w-lg">
        <Select value={tipo} onChange={setTipo} options={[{ value: '', label: 'Todos os tipos' }, ...Object.entries(TIPO_ALERTA).map(([v, l]) => ({ value: v, label: l }))]} />
        <Select value={lido} onChange={setLido} options={[{ value: '', label: 'Lidos e não lidos' }, { value: '0', label: 'Não lidos' }, { value: '1', label: 'Lidos' }]} />
      </div>
      {erro && <Vazio titulo="Não foi possível carregar os alertas." texto={erro} acao={<Button variant="secondary" onClick={() => carregar(0)}>Tentar de novo</Button>} />}
      {!erro && !carregando && itens.length === 0 && (arquivados
        ? <Vazio titulo="Nenhum alerta arquivado." texto="Arquive um alerta na lista para tirá-lo da frente. Ele fica aqui, e dá para desarquivar quando quiser." />
        : <Vazio titulo="Nenhum alerta aqui." texto="Os alertas aparecem quando uma safra com garrafas entra na janela, chega ao auge ou está saindo da janela." />)}
      <ul className="flex flex-col gap-3">
        {itens.map(a => (
          <li key={a.ID} className={`cartao p-4 flex flex-wrap items-center gap-3 ${ehLido(a) || arquivados ? '' : 'ring-1 ring-primary/30'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ehLido(a) ? 'bg-surface-muted text-fg-subtle' : 'bg-brand-soft text-primary'}`}><Bell size={16} /></div>
            <div className="flex-1 min-w-[180px]">
              <div className={ehLido(a) ? 'text-fg-muted' : 'text-fg'}><b>{TIPO_ALERTA[a.TIPO] ?? a.TIPO}</b> · {a.NOME} {a.ANO}{!ehLido(a) && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-primary">novo</span>}</div>
              <div className="text-[12px] text-fg-subtle">{a.PRODUTOR ? `${a.PRODUTOR} · ` : ''}ano {a.ANO_REF} · {a.ESTOQUE} garrafa{Number(a.ESTOQUE) === 1 ? '' : 's'} · gerado em {dataBR(a.CRIADO_EM)}</div>
            </div>
            <StatusBadge status={a.STATUS} />
            <Link to={`/vinho/${a.VINHO_ID}`}><Button size="sm" variant="secondary">Abrir ficha</Button></Link>
            {ehLido(a)
              ? <Button size="sm" variant="ghost" onClick={() => marcar(a, false)}><Undo2 size={14} />Marcar como não lido</Button>
              : <Button size="sm" variant="ghost" onClick={() => marcar(a, true)}><Check size={14} />Marcar como lido</Button>}
            {arquivados
              ? <Button size="sm" variant="ghost" onClick={() => arquivar(a, false)}><ArchiveRestore size={14} />Desarquivar</Button>
              : <Button size="sm" variant="ghost" onClick={() => arquivar(a, true)}><Archive size={14} />Arquivar</Button>}
          </li>
        ))}
      </ul>
      {carregando && <div className="mt-3"><SkeletonListItems count={3} /></div>}
      {mais && !carregando && <div className="mt-4 text-center"><Button variant="secondary" onClick={() => carregar(itens.length)}>Carregar mais</Button></div>}
    </div>
  );
}
