import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Download, Plus, Wine } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { SkeletonKpis, SkeletonCards } from '../components/ui/Skeleton';
import StatusBadge from '../components/StatusBadge';
import BeberLogoDialog from '../components/BeberLogoDialog';
import { Vazio } from '../components/Campos';
import { useAviso } from '../components/ToastContext';
import { callRows, parseJson, numBR, anosParaFim, TIPO_ALERTA } from '../lib/api';
import { exportarTudo } from '../lib/exportar';
import { SF } from '../lib/sf';

interface Beber { safraId: number; vinhoId: number; nome: string; produtor: string; ano: number; uva: string | null; tipoId: number | null; tipo: string | null; estoque: number; status: string; anosFim: number | null }
interface AlertaR { id: number; tipo: string; anoRef: number; vinhoId: number; nome: string; ano: number }
interface PorTipo { tipoId: number; tipo: string; garrafas: number }
interface PorSafra { ano: number; garrafas: number }
interface PorUva { uva: string; garrafas: number }
interface PorProdutor { produtor: string; garrafas: number }
interface Resumo { adega: string; vinhos: number; safras: number; garrafas: number; naoLidos: number; beber: Beber[]; alertas: AlertaR[]; porTipo: PorTipo[]; porSafra: PorSafra[]; porUva: PorUva[]; porProdutor: PorProdutor[] }

export default function InicioPage() {
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');
  const [beber, setBeber] = useState<Beber | null>(null);
  const [exportando, setExportando] = useState(false);
  const avisar = useAviso();
  const navegar = useNavigate();

  const carregar = useCallback(async () => {
    try {
      const l = (await callRows<Record<string, unknown>>(SF.inicioResumo))[0] ?? {};
      setR({
        adega: String(l.ADEGA || 'Minha adega'), vinhos: Number(l.VINHOS || 0), safras: Number(l.SAFRAS || 0),
        garrafas: Number(l.GARRAFAS || 0), naoLidos: Number(l.NAO_LIDOS || 0),
        beber: parseJson<Beber[]>(l.BEBER_LOGO, []), alertas: parseJson<AlertaR[]>(l.ALERTAS, []), porTipo: parseJson<PorTipo[]>(l.POR_TIPO, []),
        porSafra: parseJson<PorSafra[]>(l.POR_SAFRA, []), porUva: parseJson<PorUva[]>(l.POR_UVA, []), porProdutor: parseJson<PorProdutor[]>(l.POR_PRODUTOR, []),
      });
      setErro('');
    } catch (e) { setErro((e as Error).message); }
  }, []);

  useEffect(() => {
    carregar();
    window.addEventListener('alertas-mudaram', carregar);
    return () => window.removeEventListener('alertas-mudaram', carregar);
  }, [carregar]);

  async function exportar() {
    setExportando(true);
    try { await exportarTudo(); avisar('success', 'Planilha baixada.'); }
    catch (e) { avisar('error', (e as Error).message); }
    finally { setExportando(false); }
  }

  const adega = (filtros: Record<string, string | number>) => `/adega?${new URLSearchParams(Object.entries(filtros).map(([k, v]) => [k, String(v)])).toString()}`;
  const barras = (itens: { chave: string; rotulo: string; garrafas: number; para: string }[]) => {
    const max = Math.max(1, ...itens.map(i => Number(i.garrafas)));
    return (
      <ul className="flex flex-col gap-1">
        {itens.map(i => (
          <li key={i.chave}>
            <Link to={i.para} className="flex items-center gap-3 text-[13px] rounded-lg px-2 py-2.5 md:py-1.5 -mx-2 hover:bg-surface-muted group" title={`Ver ${i.rotulo} na Adega`}>
              <span className="w-[38%] max-w-40 shrink-0 text-fg-muted group-hover:text-primary truncate">{i.rotulo}</span>
              <span className="flex-1 min-w-12 h-2 rounded-full bg-surface-muted overflow-hidden"><span className="block h-full rounded-full bg-brand" style={{ width: `${(Number(i.garrafas) / max) * 100}%` }} /></span>
              <span className="w-10 text-right text-fg tabular-nums">{numBR(i.garrafas)}</span>
              <ChevronRight size={14} className="text-fg-subtle group-hover:text-primary shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader titulo={r?.adega ?? 'Início'} descricao="O que está na sua adega e o que pede para ser aberto."
        acoes={<>
          <Button variant="secondary" onClick={exportar} disabled={exportando}><Download size={16} />{exportando ? 'Gerando...' : 'Exportar tudo'}</Button>
          <Button onClick={() => navegar('/vinho/novo')}><Plus size={16} />Novo vinho</Button>
        </>} />

      {erro && <Vazio titulo="Não foi possível carregar o Início." texto={erro} acao={<Button variant="secondary" onClick={carregar}>Tentar de novo</Button>} />}
      {!r && !erro && <><SkeletonKpis count={4} /><div className="mt-5"><SkeletonCards count={2} /></div></>}

      {r && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {([['Vinhos', r.vinhos, '/adega'], ['Safras', r.safras, '/adega'], ['Garrafas', r.garrafas, '/adega'], ['Alertas não lidos', r.naoLidos, '/alertas']] as const).map(([rot, val, para]) => (
              <Link key={rot} to={para} className="cartao cartao-vivo p-4 block group" title={para === '/alertas' ? 'Abrir alertas' : 'Abrir a Adega'}>
                <div className="flex items-center justify-between text-[12px] text-fg-subtle">{rot}<ChevronRight size={14} className="group-hover:text-primary" /></div>
                <div className="text-[24px] font-semibold text-fg mt-1">{numBR(val)}</div>
              </Link>
            ))}
          </div>

          {r.vinhos === 0 && <Vazio titulo="Sua adega ainda está vazia." texto="Cadastre o primeiro vinho lendo o rótulo por foto ou preenchendo à mão." acao={<Button onClick={() => navegar('/vinho/novo')}><Plus size={16} />Novo vinho</Button>} />}

          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardHeader action={<Link to={adega({ status: 'SAINDO' })} className="inline-flex items-center min-h-9 px-1 text-[13px] text-primary">Ver saindo da janela</Link>}><CardTitle>Beber logo</CardTitle></CardHeader>
              <CardContent>
                {r.beber.length === 0 ? <p className="text-[13px] text-fg-subtle">Nenhuma garrafa no auge ou saindo da janela agora.</p> : (
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {r.beber.map(b => (
                      <li key={b.safraId} className="py-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[180px]">
                          <Link to={`/vinho/${b.vinhoId}`} className="inline-flex items-center min-h-10 font-medium text-fg hover:text-primary">{b.nome} {b.ano}</Link>
                          <div className="text-[12px] text-fg-subtle flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                            {b.tipo && b.tipoId && <Link to={adega({ tipo: b.tipoId })} className="pilula min-h-8 hover:text-primary" title={`Ver ${b.tipo} na Adega`}>{b.tipo}</Link>}
                            <Link to={adega({ ano: b.ano })} className="pilula min-h-8 hover:text-primary" title={`Ver safra ${b.ano} na Adega`}>Safra {b.ano}</Link>
                            {b.uva && <Link to={adega({ uva: b.uva })} className="pilula min-h-8 hover:text-primary" title={`Ver ${b.uva} na Adega`}>{b.uva}</Link>}
                            {b.produtor && <Link to={adega({ produtor: b.produtor })} className="pilula min-h-8 hover:text-primary" title={`Ver ${b.produtor} na Adega`}>{b.produtor}</Link>}
                            <span>{b.estoque} garrafa{b.estoque === 1 ? '' : 's'} · {anosParaFim(b.anosFim)}</span>
                          </div>
                        </div>
                        <StatusBadge status={b.status} />
                        <Button size="sm" variant="secondary" onClick={() => setBeber(b)}><Wine size={14} />Beber logo</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader action={<Link to="/alertas" className="inline-flex items-center min-h-9 px-1 text-[13px] text-primary">Ver todos</Link>}><CardTitle>Alertas não lidos</CardTitle></CardHeader>
              <CardContent>
                {r.alertas.length === 0 ? <p className="text-[13px] text-fg-subtle">Nenhum alerta novo.</p> : (
                  <ul className="flex flex-col gap-1">
                    {r.alertas.map(a => (
                      <li key={a.id} className="flex gap-2 items-center">
                        <Bell size={14} className="text-primary shrink-0" />
                        <Link to={`/vinho/${a.vinhoId}`} className="inline-flex items-center min-h-10 text-[13.5px] text-fg hover:text-primary">
                          <span><b>{TIPO_ALERTA[a.tipo] ?? a.tipo}</b> · {a.nome} {a.ano}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {(r.porTipo.length > 0 || r.porSafra.length > 0 || r.porUva.length > 0 || r.porProdutor.length > 0) && (
            <div className="grid md:grid-cols-2 gap-5">
              {r.porTipo.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Garrafas por tipo</CardTitle></CardHeader>
                  <CardContent>{barras(r.porTipo.map(t => ({ chave: String(t.tipoId), rotulo: t.tipo, garrafas: t.garrafas, para: adega({ tipo: t.tipoId }) })))}</CardContent>
                </Card>
              )}
              {r.porSafra.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Garrafas por safra</CardTitle></CardHeader>
                  <CardContent>{barras(r.porSafra.map(t => ({ chave: String(t.ano), rotulo: String(t.ano), garrafas: t.garrafas, para: adega({ ano: t.ano }) })))}</CardContent>
                </Card>
              )}
              {r.porUva.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Garrafas por uva</CardTitle></CardHeader>
                  <CardContent>{barras(r.porUva.map(t => ({ chave: t.uva, rotulo: t.uva, garrafas: t.garrafas, para: adega({ uva: t.uva }) })))}</CardContent>
                </Card>
              )}
              {r.porProdutor.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Garrafas por produtor</CardTitle></CardHeader>
                  <CardContent>{barras(r.porProdutor.map(t => ({ chave: t.produtor, rotulo: t.produtor, garrafas: t.garrafas, para: adega({ produtor: t.produtor }) })))}</CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      <BeberLogoDialog garrafa={beber} onClose={() => setBeber(null)} onFeito={carregar} />
    </div>
  );
}
