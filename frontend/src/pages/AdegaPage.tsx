import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Wine, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { SkeletonListItems } from '../components/ui/Skeleton';
import StatusBadge from '../components/StatusBadge';
import ContadorGarrafas from '../components/ContadorGarrafas';
import { Vazio } from '../components/Campos';
import { callRows, callSF, parseJson, FILTRO_STATUS } from '../lib/api';
import { SF } from '../lib/sf';

interface VinhoLinha { ID: number; NOME: string; PRODUTOR: string | null; PAIS: string | null; REGIAO: string | null; UVA: string | null; TIPO: string | null; TEM_FOTO: number; SAFRAS: number; GARRAFAS: number; ANOS: string | null; STATUS: string | null; SAFRAS_LISTA: string | { id: number; ano: number; estoque: number }[] | null }
interface Tipo { id: number; nome: string }

const PAGINA = 30;

export default function AdegaPage() {
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const [buscaAtiva, setBuscaAtiva] = useState(params.get('busca') ?? '');
  const tipoId = params.get('tipo') ?? '0';
  const pais = params.get('pais') ?? '';
  const status = params.get('status') ?? '';
  const ano = params.get('ano') ?? '';
  const uva = params.get('uva') ?? '';
  const produtor = params.get('produtor') ?? '';
  const [anos, setAnos] = useState<number[]>([]);
  const [uvas, setUvas] = useState<string[]>([]);
  const [produtores, setProdutores] = useState<string[]>([]);
  const mudar = useCallback((chave: string, valor: string, vazio = '') => {
    setParams(prev => {
      const n = new URLSearchParams(prev);
      if (!valor || valor === vazio) n.delete(chave); else n.set(chave, valor);
      return n;
    }, { replace: true });
  }, [setParams]);
  const setTipoId = (v: string) => mudar('tipo', v, '0');
  const setPais = (v: string) => mudar('pais', v);
  const setStatus = (v: string) => mudar('status', v);
  const setAno = (v: string) => mudar('ano', v);
  const setUva = (v: string) => mudar('uva', v);
  const setProdutor = (v: string) => mudar('produtor', v);
  const [itens, setItens] = useState<VinhoLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState('');
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [paises, setPaises] = useState<string[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const sentinela = useRef<HTMLDivElement>(null);
  const pedido = useRef(0);
  const navegar = useNavigate();

  useEffect(() => {
    callRows<Record<string, unknown>>(SF.dominios).then(r => {
      setTipos(parseJson<Tipo[]>(r[0]?.TIPOS, []));
      setPaises(parseJson<string[]>(r[0]?.PAISES, []));
      setAnos(parseJson<number[]>(r[0]?.ANOS, []));
      setUvas(parseJson<string[]>(r[0]?.UVAS, []));
      setProdutores(parseJson<string[]>(r[0]?.PRODUTORES, []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setBuscaAtiva(busca.trim()); mudar('busca', busca.trim()); }, 350);
    return () => clearTimeout(t);
  }, [busca, mudar]);

  const carregar = useCallback(async (offset: number) => {
    const meu = ++pedido.current;
    setCarregando(true);
    try {
      const rows = await callRows<VinhoLinha>(SF.adegaListar, { busca: buscaAtiva, tipoId: Number(tipoId) || 0, pais, status, ano: Number(ano) || 0, uva, produtor, limit: PAGINA, offset });
      if (meu !== pedido.current) return;
      setItens(prev => (offset === 0 ? rows : [...prev, ...rows]));
      setFim(rows.length < PAGINA);
      setErro('');
      const comFoto = rows.filter(r => Number(r.TEM_FOTO) === 1).map(r => r.ID);
      if (comFoto.length) {
        callSF<{ links?: Record<string, string> }>(SF.fotosLinks, { ids: comFoto.join(',') })
          .then(o => setFotos(prev => ({ ...prev, ...(o?.links ?? {}) }))).catch(() => {});
      }
    } catch (e) {
      if (meu === pedido.current) setErro((e as Error).message);
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
  }, [buscaAtiva, tipoId, pais, status, ano, uva, produtor]);

  useEffect(() => { setItens([]); setFim(false); carregar(0); }, [carregar]);

  useEffect(() => {
    const el = sentinela.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !carregando && !fim && !erro) carregar(itens.length);
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [carregando, fim, erro, itens.length, carregar]);

  const filtrando = buscaAtiva || tipoId !== '0' || pais || status || ano || uva || produtor;
  const nomeTipo = tipoId === '-1' ? 'Sem tipo' : tipos.find(t => String(t.id) === tipoId)?.nome ?? '';
  const ativos: { rotulo: string; limpar: () => void }[] = [
    ...(buscaAtiva ? [{ rotulo: `Busca: ${buscaAtiva}`, limpar: () => { setBusca(''); setBuscaAtiva(''); mudar('busca', ''); } }] : []),
    ...(tipoId !== '0' ? [{ rotulo: `Tipo: ${nomeTipo || tipoId}`, limpar: () => setTipoId('0') }] : []),
    ...(pais ? [{ rotulo: `País: ${pais}`, limpar: () => setPais('') }] : []),
    ...(status ? [{ rotulo: `Status: ${FILTRO_STATUS.find(f => f.value === status)?.label ?? status}`, limpar: () => setStatus('') }] : []),
    ...(ano ? [{ rotulo: `Safra: ${ano}`, limpar: () => setAno('') }] : []),
    ...(uva ? [{ rotulo: `Uva: ${uva}`, limpar: () => setUva('') }] : []),
    ...(produtor ? [{ rotulo: `Produtor: ${produtor}`, limpar: () => setProdutor('') }] : []),
  ];
  const limparTudo = () => { setBusca(''); setBuscaAtiva(''); setParams(new URLSearchParams(), { replace: true }); };
  const opcoesAno = [{ value: '', label: 'Todas as safras' }, ...[...new Set([...anos.map(String), ...(ano ? [ano] : [])])].map(a => ({ value: a, label: a }))];
  const opcoesProdutor = [{ value: '', label: 'Todos os produtores' }, ...[...new Set([...produtores, ...(produtor ? [produtor] : [])])].map(p => ({ value: p, label: p }))];
  const opcoesUva = [{ value: '', label: 'Todas as uvas' }, ...[...new Set([...uvas, ...(uva ? [uva] : [])])].map(u => ({ value: u, label: u }))];

  function safrasDe(v: VinhoLinha) { return parseJson<{ id: number; ano: number; estoque: number }[]>(v.SAFRAS_LISTA, []) ?? []; }
  function atualizarGarrafas(vinhoId: number, safraId: number, novo: number) {
    setItens(lista => lista.map(v => {
      if (v.ID !== vinhoId) return v;
      const safras = safrasDe(v).map(x => (x.id === safraId ? { ...x, estoque: novo } : x));
      return { ...v, SAFRAS_LISTA: safras, GARRAFAS: safras.reduce((t, x) => t + Number(x.estoque), 0) };
    }));
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo="Adega" descricao="Busque por nome, produtor, uva ou região."
        acoes={<Button onClick={() => navegar('/vinho/novo')}><Plus size={16} />Novo vinho</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input className="controle controle-com-icone w-full" placeholder="Buscar vinho" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={tipoId} onChange={setTipoId} options={[{ value: '0', label: 'Todos os tipos' }, ...tipos.map(t => ({ value: String(t.id), label: t.nome }))]} />
        <Select value={pais} onChange={setPais} options={[{ value: '', label: 'Todos os países' }, ...paises.map(p => ({ value: p, label: p }))]} />
        <Select value={status} onChange={setStatus} options={FILTRO_STATUS} />
        <Select value={ano} onChange={setAno} options={opcoesAno} />
        <Select value={uva} onChange={setUva} options={opcoesUva} />
        <Select value={produtor} onChange={setProdutor} options={opcoesProdutor} />
      </div>
      {ativos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5" aria-label="Filtros ativos">
          {ativos.map(a => (
            <button key={a.rotulo} type="button" onClick={a.limpar} className="pilula inline-flex items-center gap-1 hover:text-primary" title="Remover este filtro">
              {a.rotulo}<X size={12} />
            </button>
          ))}
          <button type="button" onClick={limparTudo} className="text-[13px] text-primary hover:underline ml-1">Limpar filtros</button>
        </div>
      )}
      {ativos.length === 0 && <div className="mb-2" />}

      {erro && <Vazio titulo="Não foi possível carregar a adega." texto={erro} acao={<Button variant="secondary" onClick={() => carregar(0)}>Tentar de novo</Button>} />}

      {!erro && !carregando && itens.length === 0 && (
        filtrando
          ? <Vazio titulo="Nenhum vinho encontrado." texto="Mude a busca ou os filtros." />
          : <Vazio titulo="Sua adega está vazia." texto="Cadastre o primeiro vinho." acao={<Button onClick={() => navegar('/vinho/novo')}><Plus size={16} />Novo vinho</Button>} />
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {itens.map(v => (
          <div key={v.ID} className="cartao cartao-vivo p-4 flex flex-col gap-3 min-w-0">
          <Link to={`/vinho/${v.ID}`} className="flex gap-3 min-w-0">
            <div className="w-14 h-20 rounded-xl overflow-hidden bg-brand-soft text-primary flex items-center justify-center shrink-0">
              {fotos[v.ID] ? <img src={fotos[v.ID]} alt="" className="w-full h-full object-cover" /> : <Wine size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-fg truncate">{v.NOME}</div>
              <div className="text-[12px] text-fg-subtle truncate">{[v.PRODUTOR, v.TIPO, v.UVA].filter(Boolean).join(' · ')}</div>
              <div className="text-[12px] text-fg-subtle truncate">{[v.REGIAO, v.PAIS].filter(Boolean).join(', ')}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="pilula">{Number(v.GARRAFAS)} garrafa{Number(v.GARRAFAS) === 1 ? '' : 's'}</span>
                {v.STATUS && <StatusBadge status={v.STATUS} />}
              </div>
            </div>
          </Link>
          {safrasDe(v).length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-border-subtle pt-3" aria-label={`Safras de ${v.NOME}`}>
              {safrasDe(v).map(sf => (
                <li key={sf.id} className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] text-fg">Safra {sf.ano}</span>
                  <ContadorGarrafas tamanho="sm" safraId={sf.id} estoque={Number(sf.estoque)} rotulo={`${v.NOME} ${sf.ano}`}
                    onMudou={novo => atualizarGarrafas(v.ID, sf.id, novo)} />
                </li>
              ))}
            </ul>
          )}
          <Link to={`/vinho/${v.ID}?novaSafra=`} className="self-start inline-flex items-center gap-1.5 min-h-9 text-[13px] text-primary hover:underline">
            <Plus size={14} />Outra safra deste vinho
          </Link>
          </div>
        ))}
      </div>
      {carregando && <div className="mt-3"><SkeletonListItems count={3} /></div>}
      <div ref={sentinela} className="h-4" />
    </div>
  );
}
