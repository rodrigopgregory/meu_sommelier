import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Minus, Pencil, Plus, RefreshCw, Sparkles, Trash2, Wine } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DatePicker from '../components/ui/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { SkeletonPage } from '../components/ui/Skeleton';
import StatusBadge from '../components/StatusBadge';
import BeberLogoDialog from '../components/BeberLogoDialog';
import ContadorGarrafas from '../components/ContadorGarrafas';
import VinhoForm from '../components/VinhoForm';
import type { DadosVinho, FotoEstado } from '../components/VinhoForm';
import { AreaTexto, Vazio } from '../components/Campos';
import { useAviso } from '../components/ToastContext';
import { callRows, callSF, parseJson, hojeISO, dataBR, numBR, anosParaFim, notificarAlertas, MOTIVOS_ENTRADA, MOTIVOS_BAIXA } from '../lib/api';
import { SF } from '../lib/sf';
import { notaNaEscala, notaPara100, temperaturaNoTexto, usePreferencias } from '../lib/preferencias';

interface Mov { id: number; tipo: 'E' | 'S'; quantidade: number; motivo: string | null; data: string; criadoEm: string }
interface Pessoal { id: number; nota: number; comentario: string | null; data: string }
interface Externa { id: number; fonteId: number | null; fonte: string | null; fonteUrl: string | null; avaliador: string | null; nota: number; escala: number; tipo: string; data: string | null; url: string | null }
interface Servico { temperatura: string | null; decantacao: string | null; abertura: string | null; taca: string | null; depoisAberto: string | null; origem: string; atualizadoEm: string | null }
interface Safra { servico: Servico | null; id: number; ano: number; inicio: number | null; auge: number | null; fim: number | null; estoque: number; status: string; anosFim: number | null; mediaPessoal: number | null; mediaProfissional: number | null; mediaComunidade: number | null; movimentacoes: Mov[] | null; pessoais: Pessoal[] | null; externas: Externa[] | null }
interface Ficha { ID: number; NOME: string; PRODUTOR: string | null; PAIS: string | null; REGIAO: string | null; UVA: string | null; TIPO_ID: number | null; TIPO: string | null; NOTAS: string | null; TEM_FOTO: number; safras: Safra[] }
interface Fonte { id: number; nome: string; categoria: string; url: string | null }

const soDigitos = (v: string, n = 4) => v.replace(/\D/g, '').slice(0, n);

export default function VinhoPage() {
  const { id } = useParams();
  const vinhoId = Number(id);
  const [busca] = useSearchParams();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [erro, setErro] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [editando, setEditando] = useState(false);
  const [novaSafra, setNovaSafra] = useState<string | null>(busca.get('novaSafra'));
  const [excluir, setExcluir] = useState<{ tipo: 'vinho' | 'safra'; safra?: Safra } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [movimento, setMovimento] = useState<{ safra: Safra; tipo: 'E' | 'S' } | null>(null);
  const [beber, setBeber] = useState<Safra | null>(null);
  const [avaliar, setAvaliar] = useState<{ safra: Safra; tipo: 'pessoal' | 'externa' } | null>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const avisar = useAviso();
  const navegar = useNavigate();

  const carregar = useCallback(async () => {
    try {
      const r = (await callRows<Record<string, unknown>>(SF.vinhoFicha, { id: vinhoId }))[0];
      if (!r) { setErro('Vinho não encontrado na sua adega.'); return; }
      const safras = parseJson<Safra[]>(r.SAFRAS, []).sort((a, b) => b.ano - a.ano);
      setFicha({ ...(r as unknown as Ficha), safras });
      setErro('');
      if (Number(r.TEM_FOTO) === 1) {
        callSF<{ links?: Record<string, string> }>(SF.fotosLinks, { ids: String(vinhoId) }).then(o => setFotoUrl(o?.links?.[vinhoId] ?? '')).catch(() => {});
      } else setFotoUrl('');
    } catch (e) { setErro((e as Error).message); }
  }, [vinhoId]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    callRows<Record<string, unknown>>(SF.dominios).then(r => setFontes(parseJson<Fonte[]>(r[0]?.FONTES, []))).catch(() => {});
  }, []);

  function irParaSafra(sid: number) {
    setDestaque(sid);
    setTimeout(() => document.getElementById(`safra-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    setTimeout(() => setDestaque(null), 2500);
  }

  async function confirmarExclusao() {
    if (!excluir || !ficha) return;
    setExcluindo(true);
    try {
      if (excluir.tipo === 'vinho') {
        await callSF(SF.vinhoExcluir, { id: ficha.ID });
        avisar('success', 'Vinho excluído.');
        notificarAlertas();
        navegar('/adega', { replace: true });
      } else if (excluir.safra) {
        await callSF(SF.safraExcluir, { id: excluir.safra.id });
        avisar('success', `Safra ${excluir.safra.ano} excluída.`);
        notificarAlertas();
        setExcluir(null);
        carregar();
      }
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setExcluindo(false); }
  }

  if (erro) return <div className="max-w-5xl mx-auto"><Vazio titulo={erro} acao={<Link to="/adega"><Button variant="secondary">Voltar para a adega</Button></Link>} /></div>;
  if (!ficha) return <div className="max-w-5xl mx-auto"><SkeletonPage /></div>;

  const total = ficha.safras.reduce((s, x) => s + Number(x.estoque), 0);
  const registros = (lista: Safra[]) => lista.reduce((s, x) => s + (x.movimentacoes?.length ?? 0) + (x.pessoais?.length ?? 0) + (x.externas?.length ?? 0), 0);
  const msgExcluir = excluir?.tipo === 'vinho'
    ? `Excluir ${ficha.NOME}? Saem ${ficha.safras.length} safra${ficha.safras.length === 1 ? '' : 's'}, ${total} garrafa${total === 1 ? '' : 's'} em estoque e ${registros(ficha.safras)} registro${registros(ficha.safras) === 1 ? '' : 's'} de histórico e avaliações, além dos alertas. Não dá para desfazer.`
    : excluir?.safra ? `Excluir a safra ${excluir.safra.ano}? Saem ${excluir.safra.estoque} garrafa${excluir.safra.estoque === 1 ? '' : 's'} em estoque e ${registros([excluir.safra])} registro${registros([excluir.safra]) === 1 ? '' : 's'} de histórico e avaliações, além dos alertas. Não dá para desfazer.` : '';

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/adega" className="inline-flex items-center gap-1 text-[13px] text-fg-subtle hover:text-fg mb-3"><ArrowLeft size={14} />Adega</Link>
      <PageHeader titulo={ficha.NOME} descricao={[ficha.PRODUTOR, ficha.TIPO].filter(Boolean).join(' · ')}
        acoes={<>
          <Button variant="secondary" onClick={() => setEditando(true)}><Pencil size={15} />Editar</Button>
          <Button variant="ghost" onClick={() => setExcluir({ tipo: 'vinho' })}><Trash2 size={15} />Excluir</Button>
        </>} />

      <Card className="mb-5">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-28 h-36 rounded-2xl overflow-hidden bg-brand-soft text-primary flex items-center justify-center shrink-0 border border-border">
              {fotoUrl ? <img src={fotoUrl} alt="Rótulo" className="w-full h-full object-cover" /> : <Wine size={28} />}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-[13.5px] flex-1 min-w-0">
              {[['País', ficha.PAIS], ['Região', ficha.REGIAO], ['Uva(s)', ficha.UVA], ['Tipo', ficha.TIPO], ['Safras', String(ficha.safras.length)], ['Garrafas', numBR(total)]].map(([r, v]) => (
                <div key={r as string} className="min-w-0"><dt className="text-[12px] text-fg-subtle">{r}</dt><dd className="text-fg break-words">{v || '–'}</dd></div>
              ))}
              {ficha.NOTAS && <div className="col-span-2 sm:col-span-3"><dt className="text-[12px] text-fg-subtle">Notas</dt><dd className="text-fg whitespace-pre-wrap break-words">{ficha.NOTAS}</dd></div>}
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-fg">Safras</h2>
        <Button size="sm" onClick={() => setNovaSafra('')}><Plus size={14} />Adicionar safra</Button>
      </div>

      {ficha.safras.length === 0 && <Vazio titulo="Nenhuma safra ainda." texto="Adicione a safra (ano) com a quantidade de garrafas." />}

      <div className="flex flex-col gap-5">
        {ficha.safras.map(s => (
          <SafraCartao key={s.id} safra={s} vinho={ficha} destaque={destaque === s.id} onRecarregar={carregar}
            onMovimento={tipo => setMovimento({ safra: s, tipo })} onBeber={() => setBeber(s)}
            onAvaliar={tipo => setAvaliar({ safra: s, tipo })} onExcluir={() => setExcluir({ tipo: 'safra', safra: s })} />
        ))}
      </div>

      {editando && <EditarVinho ficha={ficha} fotoUrl={fotoUrl} onClose={() => setEditando(false)} onSalvo={() => { setEditando(false); carregar(); }} />}
      {novaSafra !== null && <NovaSafra vinhoId={ficha.ID} anoInicial={novaSafra} safras={ficha.safras} onClose={() => setNovaSafra(null)}
        onExistente={sid => { setNovaSafra(null); irParaSafra(sid); }} onSalvo={() => { setNovaSafra(null); carregar(); }} />}
      {movimento && <Movimentar {...movimento} onClose={() => setMovimento(null)} onSalvo={() => { setMovimento(null); carregar(); }} />}
      {avaliar && <Avaliar {...avaliar} fontes={fontes} onClose={() => setAvaliar(null)} onSalvo={() => { setAvaliar(null); carregar(); }} />}
      <BeberLogoDialog garrafa={beber ? { safraId: beber.id, nome: ficha.NOME, ano: beber.ano, estoque: beber.estoque } : null} onClose={() => setBeber(null)} onFeito={carregar} />
      <ConfirmDialog isOpen={!!excluir} onClose={() => setExcluir(null)} onConfirm={confirmarExclusao} loading={excluindo}
        title={excluir?.tipo === 'vinho' ? 'Excluir vinho' : 'Excluir safra'} message={msgExcluir} />
    </div>
  );
}

function Indicador({ rotulo, valor, nota }: { rotulo: string; valor: number | null; nota: string }) {
  const { escala } = usePreferencias();
  return (
    <div className="rounded-xl border border-border-subtle p-2.5 sm:p-3 min-w-0">
      <div className="text-[12px] text-fg-subtle truncate">{rotulo}</div>
      <div className="text-[20px] font-semibold text-fg">{notaNaEscala(valor, escala)}</div>
      <div className="text-[11.5px] text-fg-subtle truncate">{nota}</div>
    </div>
  );
}

function SafraCartao({ safra: s, vinho, destaque, onRecarregar, onMovimento, onBeber, onAvaliar, onExcluir }: {
  safra: Safra; vinho: Ficha; destaque: boolean; onRecarregar: () => void; onMovimento: (t: 'E' | 'S') => void; onBeber: () => void; onAvaliar: (t: 'pessoal' | 'externa') => void; onExcluir: () => void;
}) {
  const [janela, setJanela] = useState({ inicio: s.inicio ? String(s.inicio) : '', auge: s.auge ? String(s.auge) : '', fim: s.fim ? String(s.fim) : '' });
  const [erroJanela, setErroJanela] = useState<{ campo?: 'inicio' | 'auge' | 'fim'; msg?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [comentario, setComentario] = useState('');
  const avisar = useAviso();
  const movs = [...(s.movimentacoes ?? [])].sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm));
  const mudou = janela.inicio !== (s.inicio ? String(s.inicio) : '') || janela.auge !== (s.auge ? String(s.auge) : '') || janela.fim !== (s.fim ? String(s.fim) : '');

  useEffect(() => { setJanela({ inicio: s.inicio ? String(s.inicio) : '', auge: s.auge ? String(s.auge) : '', fim: s.fim ? String(s.fim) : '' }); }, [s.inicio, s.auge, s.fim]);

  async function sugerirJanela() {
    setSugerindo(true); setComentario('');
    try {
      const r = await callSF<{ ok: boolean; inicio?: number; auge?: number; fim?: number; comentario?: string; aviso?: string }>(SF.janelaSugerir, {
        nome: vinho.NOME, produtor: vinho.PRODUTOR || '', pais: vinho.PAIS || '', regiao: vinho.REGIAO || '', uva: vinho.UVA || '', tipoId: Number(vinho.TIPO_ID || 0), ano: s.ano,
      });
      if (r?.ok && r.inicio) {
        setErroJanela({});
        setJanela({ inicio: String(r.inicio), auge: String(r.auge), fim: String(r.fim) });
        setComentario((r.comentario ? r.comentario + ' ' : '') + 'Confira e clique em Salvar janela.');
      } else avisar('error', r?.aviso || 'O sommelier não respondeu agora. Tente de novo em instantes.');
    } catch { avisar('error', 'O sommelier não respondeu agora. Tente de novo em instantes.'); }
    finally { setSugerindo(false); }
  }

  async function salvarJanela() {
    const vazio = !janela.inicio && !janela.auge && !janela.fim;
    const [i, a, f] = [Number(janela.inicio), Number(janela.auge), Number(janela.fim)];
    if (!vazio) {
      for (const [k, v] of [['inicio', janela.inicio], ['auge', janela.auge], ['fim', janela.fim]] as const) {
        if (!v || Number(v) < 1900 || Number(v) > 2200) { setErroJanela({ campo: k, msg: 'Ano entre 1900 e 2200.' }); return; }
      }
      if (a < i) { setErroJanela({ campo: 'auge', msg: 'O auge não pode vir antes do início.' }); return; }
      if (f < a) { setErroJanela({ campo: 'fim', msg: 'O fim não pode vir antes do auge.' }); return; }
    }
    setErroJanela({});
    setSalvando(true);
    try {
      await callSF(SF.safraJanela, { safraId: s.id, inicio: vazio ? 0 : i, auge: vazio ? 0 : a, fim: vazio ? 0 : f });
      avisar('success', vazio ? 'Janela removida.' : 'Janela de consumo salva.');
      notificarAlertas();
      onRecarregar();
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setSalvando(false); }
  }

  const { escala } = usePreferencias();

  async function excluirAvaliacao(tipo: 'pessoal' | 'externa', aid: number) {
    try {
      await callSF(tipo === 'pessoal' ? SF.avaliacaoPessoalExcluir : SF.avaliacaoExternaExcluir, { id: aid });
      onRecarregar();
    } catch (e) { avisar('error', (e as Error).message); }
  }

  return (
    <Card id={`safra-${s.id}`} className={destaque ? 'ring-2 ring-[var(--accent)]' : ''}>
      <CardHeader action={<div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={onExcluir} aria-label="Excluir safra"><Trash2 size={14} /></Button></div>}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Safra {s.ano}</CardTitle>
          <StatusBadge status={s.status} />
          {s.anosFim != null && s.status !== 'SEM_JANELA' && <span className="text-[12px] text-fg-subtle">{anosParaFim(s.anosFim)}</span>}
        </div>
      </CardHeader>
      <CardContent className="gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-3">
            <ContadorGarrafas safraId={s.id} estoque={s.estoque} rotulo={`safra ${s.ano}`} onMudou={onRecarregar} />
            <span className="text-fg-subtle text-[13px]">garrafa{s.estoque === 1 ? '' : 's'}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onMovimento('E')}><Plus size={14} />Entrada</Button>
          <Button size="sm" variant="ghost" onClick={() => onMovimento('S')} disabled={s.estoque < 1}><Minus size={14} />Baixa</Button>
          <Button size="sm" onClick={onBeber} disabled={s.estoque < 1}><Wine size={14} />Beber logo</Button>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="rotulo-secao mr-auto">Janela de consumo (anos)</div>
            <Button size="sm" variant="secondary" onClick={sugerirJanela} disabled={sugerindo || salvando}><Sparkles size={14} />{sugerindo ? 'Consultando o sommelier...' : 'Sommelier sugere'}</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <Input label="Início" inputMode="numeric" value={janela.inicio} onChange={e => setJanela({ ...janela, inicio: soDigitos(e.target.value) })} error={erroJanela.campo === 'inicio' ? erroJanela.msg : undefined} />
            <Input label="Auge" inputMode="numeric" value={janela.auge} onChange={e => setJanela({ ...janela, auge: soDigitos(e.target.value) })} error={erroJanela.campo === 'auge' ? erroJanela.msg : undefined} />
            <Input label="Fim" inputMode="numeric" value={janela.fim} onChange={e => setJanela({ ...janela, fim: soDigitos(e.target.value) })} error={erroJanela.campo === 'fim' ? erroJanela.msg : undefined} />
          </div>
          {comentario && mudou && <p className="mt-2 text-[13px] text-fg-muted">{comentario}</p>}
          {mudou && <div className="mt-3 flex gap-2"><Button size="sm" onClick={salvarJanela} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar janela'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setErroJanela({}); setJanela({ inicio: s.inicio ? String(s.inicio) : '', auge: s.auge ? String(s.auge) : '', fim: s.fim ? String(s.fim) : '' }); }}>Desfazer</Button></div>}
        </div>

        <ComoServir safra={s} onRecarregar={onRecarregar} />

        <div>
          <div className="rotulo-secao mb-2">Indicadores ({escala === 5 ? '0–5' : '0–100'})</div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Indicador rotulo="Pessoal" valor={s.mediaPessoal} nota={`${s.pessoais?.length ?? 0} sua${(s.pessoais?.length ?? 0) === 1 ? '' : 's'}`} />
            <Indicador rotulo="Profissional" valor={s.mediaProfissional} nota={`${(s.externas ?? []).filter(e => e.tipo === 'PROFISSIONAL').length} de críticos`} />
            <Indicador rotulo="Comunidade" valor={s.mediaComunidade} nota={`${(s.externas ?? []).filter(e => e.tipo === 'COMUNIDADE').length} da comunidade`} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2"><div className="rotulo-secao">Minhas avaliações</div><Button size="sm" variant="ghost" onClick={() => onAvaliar('pessoal')}><Plus size={14} />Avaliar</Button></div>
          {(s.pessoais ?? []).length === 0 ? <p className="text-[13px] text-fg-subtle">Nenhuma avaliação sua ainda.</p> : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {(s.pessoais ?? []).map(p => (
                <li key={p.id} className="py-2 flex items-start gap-3 text-[13.5px]">
                  <span className="pilula pilula-acento">{notaNaEscala(p.nota, escala)}</span>
                  <div className="flex-1 min-w-0"><div className="text-fg break-words">{p.comentario || 'Sem comentário'}</div><div className="text-[12px] text-fg-subtle">{dataBR(p.data)}</div></div>
                  <Button size="sm" variant="ghost" aria-label="Excluir avaliação" onClick={() => excluirAvaliacao('pessoal', p.id)}><Trash2 size={13} /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2"><div className="rotulo-secao">O que estão dizendo sobre este vinho</div><Button size="sm" variant="ghost" onClick={() => onAvaliar('externa')}><Plus size={14} />Registrar</Button></div>
          {(s.externas ?? []).length === 0 ? <p className="text-[13px] text-fg-subtle">Nenhuma avaliação externa registrada. Você registra à mão o que leu em críticos ou na comunidade.</p> : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {(s.externas ?? []).map(e => {
                const link = e.url || e.fonteUrl;
                return (
                  <li key={e.id} className="py-2 flex items-start gap-3 text-[13.5px]">
                    <span className="pilula pilula-acento">{numBR(e.nota, Number.isInteger(Number(e.nota)) ? 0 : 1)} / {e.escala}</span>
                    <div className="flex-1 min-w-0 basis-0">
                      <div className="text-fg">{e.fonte || 'Sem fonte'}{e.avaliador ? ` · ${e.avaliador}` : ''}</div>
                      <div className="text-[12px] text-fg-subtle">{e.tipo === 'PROFISSIONAL' ? 'Profissional' : 'Comunidade'} · {notaNaEscala(Number(e.nota) * 100 / Number(e.escala), escala)} em {escala === 5 ? '0–5' : '0–100'}{e.data ? ` · ${dataBR(e.data)}` : ''}</div>
                    </div>
                    {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-8 text-[13px] text-primary shrink-0"><ExternalLink size={13} /><span className="hidden sm:inline">Abrir</span></a>}
                    <Button size="sm" variant="ghost" aria-label="Excluir avaliação" onClick={() => excluirAvaliacao('externa', e.id)}><Trash2 size={13} /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="rotulo-secao mb-2">Histórico</div>
          {movs.length === 0 ? <p className="text-[13px] text-fg-subtle">Sem movimentações.</p> : (
            <ul className="sm:hidden flex flex-col divide-y divide-border-subtle">
              {movs.map(m => (
                <li key={m.id} className="py-2 flex items-center gap-3 text-[13.5px]">
                  <span className={`pilula ${m.tipo === 'E' ? 'pilula-acento' : ''} tabular-nums`}>{m.tipo === 'E' ? '+' : '−'}{m.quantidade}</span>
                  <div className="flex-1 min-w-0"><div className="text-fg">{m.tipo === 'E' ? 'Entrada' : 'Baixa'}{m.motivo ? ` · ${m.motivo}` : ''}</div><div className="text-[12px] text-fg-subtle">{dataBR(m.data)}</div></div>
                </li>
              ))}
            </ul>
          )}
          {movs.length > 0 && (
            <div className="hidden sm:block overflow-x-auto -mx-5">
              <table className="tabela">
                <thead><tr><th>Data</th><th>Movimento</th><th className="text-right">Qtd.</th><th>Motivo</th></tr></thead>
                <tbody>
                  {movs.map(m => (
                    <tr key={m.id}><td>{dataBR(m.data)}</td><td>{m.tipo === 'E' ? 'Entrada' : 'Baixa'}</td><td className="text-right tabular-nums">{m.tipo === 'E' ? '+' : '−'}{m.quantidade}</td><td>{m.motivo || '–'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditarVinho({ ficha, fotoUrl, onClose, onSalvo }: { ficha: Ficha; fotoUrl: string; onClose: () => void; onSalvo: () => void }) {
  const [dados, setDados] = useState<DadosVinho>({ nome: ficha.NOME, produtor: ficha.PRODUTOR ?? '', pais: ficha.PAIS ?? '', regiao: ficha.REGIAO ?? '', uva: ficha.UVA ?? '', tipoId: String(ficha.TIPO_ID ?? 0), notas: ficha.NOTAS ?? '' });
  const [foto, setFoto] = useState<FotoEstado>({ key: '', preview: fotoUrl, remover: false });
  const [erroNome, setErroNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  async function salvar() {
    if (!dados.nome.trim()) { setErroNome('Informe o nome do vinho.'); return; }
    setSalvando(true);
    try {
      await callSF(SF.vinhoAtualizar, { id: ficha.ID, nome: dados.nome.trim(), produtor: dados.produtor, pais: dados.pais, regiao: dados.regiao, uva: dados.uva,
        tipoId: Number(dados.tipoId), notas: dados.notas, fotoKey: foto.remover ? '' : foto.key, removerFoto: foto.remover ? 1 : 0 });
      avisar('success', 'Vinho atualizado.');
      onSalvo();
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title="Editar vinho" size="lg">
      <VinhoForm dados={dados} onChange={setDados} foto={foto} onFoto={setFoto} erroNome={erroNome} />
      <div className="flex justify-end gap-3 mt-5">
        <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </Modal>
  );
}

function NovaSafra({ vinhoId, anoInicial, safras, onClose, onExistente, onSalvo }: { vinhoId: number; anoInicial: string; safras: Safra[]; onClose: () => void; onExistente: (id: number) => void; onSalvo: () => void }) {
  const [ano, setAno] = useState(anoInicial);
  const [qtd, setQtd] = useState('1');
  const [motivo, setMotivo] = useState('compra');
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<{ ano?: string; qtd?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const existente = safras.find(s => String(s.ano) === ano);
  const avisar = useAviso();

  async function salvar() {
    const a = Number(ano), q = Number(qtd);
    const e: typeof erro = {};
    if (!Number.isInteger(a) || a < 1900 || a > 2100) e.ano = 'Ano entre 1900 e 2100.';
    if (!Number.isInteger(q) || q < 0 || q > 10000) e.qtd = 'Quantidade inteira de 0 a 10.000.';
    setErro(e);
    if (Object.keys(e).length || existente) return;
    setSalvando(true);
    try {
      await callSF(SF.safraCriar, { vinhoId, ano: a, quantidade: q, motivo, data: data || hojeISO() });
      avisar('success', `Safra ${a} adicionada.`);
      notificarAlertas();
      onSalvo();
    } catch (err) { avisar('error', (err as Error).message === 'Esse registro já existe.' ? `A safra ${a} já existe neste vinho.` : (err as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title="Adicionar safra" size="sm">
      <div className="flex flex-col gap-4">
        <Input label="Ano da safra" inputMode="numeric" value={ano} onChange={e => setAno(soDigitos(e.target.value))} error={erro.ano} autoFocus />
        {existente && (
          <div className="rounded-xl p-3 text-[13px] bg-surface-muted text-fg-muted flex flex-wrap items-center gap-2">
            <span className="flex-1">A safra {ano} já existe neste vinho, com {existente.estoque} garrafa{existente.estoque === 1 ? '' : 's'}. Para somar garrafas, registre uma entrada nela.</span>
            <Button size="sm" variant="secondary" onClick={() => onExistente(existente.id)}>Ir para a safra {ano}</Button>
          </div>
        )}
        <Input label="Garrafas" inputMode="numeric" value={qtd} onChange={e => setQtd(soDigitos(e.target.value, 5))} error={erro.qtd} />
        <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Motivo</label><Select value={motivo} onChange={setMotivo} options={MOTIVOS_ENTRADA} /></div>
        <DatePicker label="Data" value={data} onChange={setData} />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" onClick={salvar} disabled={salvando || !!existente}>{salvando ? 'Salvando...' : 'Adicionar'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Movimentar({ safra, tipo, onClose, onSalvo }: { safra: Safra; tipo: 'E' | 'S'; onClose: () => void; onSalvo: () => void }) {
  const [qtd, setQtd] = useState('1');
  const [motivo, setMotivo] = useState(tipo === 'E' ? 'compra' : 'jantar');
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  async function salvar() {
    const q = Number(qtd);
    if (!Number.isInteger(q) || q < 1 || q > 10000) { setErro('Quantidade inteira a partir de 1.'); return; }
    if (tipo === 'S' && q > safra.estoque) { setErro(`Há só ${safra.estoque} garrafa${safra.estoque === 1 ? '' : 's'} desta safra.`); return; }
    setErro('');
    setSalvando(true);
    try {
      const r = await callSF<{ affectedRows?: number }>(SF.movimentar, { safraId: safra.id, tipo, quantidade: q, motivo, data: data || hojeISO() });
      if (r && r.affectedRows === 0) { setErro('Baixa recusada: o estoque mudou. Recarregue a ficha.'); return; }
      avisar('success', tipo === 'E' ? `Entrada de ${q} garrafa${q === 1 ? '' : 's'}.` : `Baixa de ${q} garrafa${q === 1 ? '' : 's'}.`);
      notificarAlertas();
      onSalvo();
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title={`${tipo === 'E' ? 'Entrada' : 'Baixa'} · safra ${safra.ano}`} size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-fg-subtle">Estoque atual: {safra.estoque} garrafa{safra.estoque === 1 ? '' : 's'}.</p>
        <Input label="Quantidade" inputMode="numeric" value={qtd} onChange={e => setQtd(soDigitos(e.target.value, 5))} error={erro} autoFocus />
        <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Motivo</label><Select value={motivo} onChange={setMotivo} options={tipo === 'E' ? MOTIVOS_ENTRADA : MOTIVOS_BAIXA} /></div>
        <DatePicker label="Data" value={data} onChange={setData} />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Registrar'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Avaliar({ safra, tipo, fontes, onClose, onSalvo }: { safra: Safra; tipo: 'pessoal' | 'externa'; fontes: Fonte[]; onClose: () => void; onSalvo: () => void }) {
  const pref = usePreferencias();
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [data, setData] = useState(hojeISO());
  const [fonteId, setFonteId] = useState('0');
  const [avaliador, setAvaliador] = useState('');
  const [escala, setEscala] = useState(String(pref.escala));
  const [cat, setCat] = useState('PROFISSIONAL');
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState<{ nota?: string; url?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  useEffect(() => {
    const f = fontes.find(x => String(x.id) === fonteId);
    if (f && f.categoria !== 'OUTRA') setCat(f.categoria);
  }, [fonteId, fontes]);

  async function salvar() {
    const n = Number(nota.replace(',', '.'));
    const max = tipo === 'pessoal' ? pref.escala : Number(escala);
    const e: typeof erro = {};
    if (nota.trim() === '' || !Number.isFinite(n) || n < 0 || n > max) e.nota = `Nota de 0 a ${max}.`;
    if (tipo === 'pessoal' && pref.escala === 100 && !e.nota && !Number.isInteger(n)) e.nota = 'Use número inteiro de 0 a 100.';
    if (tipo === 'externa' && url.trim() && !/^https?:\/\//i.test(url.trim())) e.url = 'O link começa com http:// ou https://.';
    setErro(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    try {
      if (tipo === 'pessoal') await callSF(SF.avaliacaoPessoalCriar, { safraId: safra.id, nota: notaPara100(n, pref.escala), comentario, data: data || hojeISO() });
      else await callSF(SF.avaliacaoExternaCriar, { safraId: safra.id, fonteId: Number(fonteId), avaliador, nota: n, escala: Number(escala), tipo: cat, data: data || '', url: url.trim() });
      avisar('success', 'Avaliação registrada.');
      onSalvo();
    } catch (err) { avisar('error', (err as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title={tipo === 'pessoal' ? `Minha avaliação · safra ${safra.ano}` : `Avaliação externa · safra ${safra.ano}`} size="md">
      <div className="flex flex-col gap-4">
        {tipo === 'externa' && (
          <>
            <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Fonte</label>
              <Select value={fonteId} onChange={setFonteId} options={[{ value: '0', label: 'Sem fonte' }, ...fontes.map(f => ({ value: String(f.id), label: f.nome }))]} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Quem avaliou</label>
                <Select value={cat} onChange={setCat} options={[{ value: 'PROFISSIONAL', label: 'Profissional (crítico)' }, { value: 'COMUNIDADE', label: 'Comunidade' }]} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Escala</label>
                <Select value={escala} onChange={setEscala} options={[{ value: '100', label: '0 a 100' }, { value: '5', label: '0 a 5' }]} /></div>
            </div>
            <Input label="Avaliador (opcional)" value={avaliador} onChange={e => setAvaliador(e.target.value)} maxLength={120} />
          </>
        )}
        <Input label={`Nota (0 a ${tipo === 'pessoal' ? pref.escala : escala})`} inputMode="decimal" value={nota} onChange={e => setNota(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))} error={erro.nota} />
        {tipo === 'pessoal' && <AreaTexto label="Comentário" value={comentario} onChange={e => setComentario(e.target.value)} maxLength={2000} />}
        {tipo === 'externa' && <Input label="Link da avaliação (opcional)" value={url} onChange={e => setUrl(e.target.value)} error={erro.url} placeholder="https://" maxLength={500} />}
        <DatePicker label="Data" value={data} onChange={setData} />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </Modal>
  );
}

const CAMPOS_SERVICO = [
  ['temperatura', 'Temperatura'],
  ['decantacao', 'Decantação'],
  ['abertura', 'Como abrir'],
  ['taca', 'Taça'],
  ['depoisAberto', 'Depois de aberto'],
] as const;
type CampoServico = typeof CAMPOS_SERVICO[number][0];

function ComoServir({ safra: s, onRecarregar }: { safra: Safra; onRecarregar: () => void }) {
  const [gerando, setGerando] = useState(false);
  const [editar, setEditar] = useState(false);
  const avisar = useAviso();
  const { temperatura: unidade } = usePreferencias();
  const sv = s.servico;
  const tem = !!sv && CAMPOS_SERVICO.some(([k]) => sv[k]);

  async function gerar() {
    setGerando(true);
    try {
      const r = await callSF<{ ok: boolean; aviso?: string }>(SF.servicoGerar, { safraId: s.id });
      if (!r?.ok) { avisar('error', r?.aviso || 'O sommelier não respondeu agora. Tente de novo.'); return; }
      avisar('success', 'Instruções de serviço prontas.');
      onRecarregar();
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setGerando(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="rotulo-secao">Como servir</div>
        <div className="flex gap-1">
          {tem && <Button size="sm" variant="ghost" onClick={() => setEditar(true)} disabled={gerando}><Pencil size={13} />Editar</Button>}
          <Button size="sm" variant={tem ? 'ghost' : 'secondary'} onClick={gerar} disabled={gerando}>
            {tem ? <RefreshCw size={13} /> : <Sparkles size={14} />}{gerando ? 'Gerando...' : tem ? 'Gerar de novo' : 'Pedir ao sommelier'}
          </Button>
        </div>
      </div>
      {!tem ? (
        <p className="text-[13px] text-fg-subtle">
          Temperatura, decantação, como abrir, taça e quanto tempo dura depois de aberto, pensados para a idade desta safra.{' '}
          <button type="button" className="text-primary" onClick={() => setEditar(true)}>Ou escreva você.</button>
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CAMPOS_SERVICO.filter(([k]) => sv![k]).map(([k, r]) => (
              <div key={k} className="rounded-xl border border-border-subtle p-3 min-w-0">
                <dt className="text-[12px] text-fg-subtle mb-1">{r}</dt>
                <dd className="text-[13.5px] text-fg whitespace-pre-wrap break-words">{k === 'temperatura' ? temperaturaNoTexto(sv![k] ?? '', unidade) : sv![k]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11.5px] text-fg-subtle">{sv!.origem === 'IA' ? 'Sugerido pelo sommelier' : 'Editado por você'}{sv!.atualizadoEm ? ` em ${dataBR(sv!.atualizadoEm.slice(0, 10))}` : ''}.</p>
        </>
      )}
      {editar && <EditarServico safra={s} onClose={() => setEditar(false)} onSalvo={() => { setEditar(false); onRecarregar(); }} />}
    </div>
  );
}

function EditarServico({ safra: s, onClose, onSalvo }: { safra: Safra; onClose: () => void; onSalvo: () => void }) {
  const [valores, setValores] = useState<Record<CampoServico, string>>(() => {
    const o = {} as Record<CampoServico, string>;
    for (const [k] of CAMPOS_SERVICO) o[k] = s.servico?.[k] ?? '';
    return o;
  });
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  async function salvar() {
    setSalvando(true);
    try {
      await callSF(SF.servicoSalvar, { safraId: s.id, ...valores, origem: 'MANUAL' });
      avisar('success', 'Como servir salvo.');
      onSalvo();
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Como servir · safra ${s.ano}`} size="md">
      <div className="flex flex-col gap-3">
        {CAMPOS_SERVICO.map(([k, r]) => (
          <AreaTexto key={k} label={r} value={valores[k]} maxLength={k === 'decantacao' || k === 'abertura' ? 2000 : k === 'depoisAberto' ? 600 : 400}
            onChange={e => setValores({ ...valores, [k]: e.target.value })} rows={2} />
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
