import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, ShoppingBag, Square, Trash2, Wine } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SkeletonListItems } from '../components/ui/Skeleton';
import StatusBadge from '../components/StatusBadge';
import BeberLogoDialog from '../components/BeberLogoDialog';
import type { GarrafaParaBeber } from '../components/BeberLogoDialog';
import { useAviso } from '../components/ToastContext';
import { callRows, callSF, parseJson, enviarArquivoPrivado } from '../lib/api';
import { paraWav } from '../lib/midia';
import { SF } from '../lib/sf';

interface Sugestao { safraId: number; vinhoId: number; nome: string; produtor: string; ano: number; estoque: number; status: string; porQue: string }
interface Mensagem { id: string; papel: 'usuario' | 'sommelier'; texto: string; viaAudio?: boolean; sugestoes?: Sugestao[]; comprar?: string; erro?: boolean }
interface Resposta { ok: boolean; pergunta?: string; viaAudio?: boolean; resposta?: string; sugestoes?: Sugestao[]; comprar?: string; aviso?: string }
interface Historico { ID: number; PAPEL: 'usuario' | 'sommelier'; TEXTO: string; SUGESTOES: string | null; VIA_AUDIO: number | boolean }

const EXEMPLOS = ['Vou jantar risoto de cogumelos', 'Churrasco com amigos no sábado', 'Quando abrir o meu Barolo 2012?', 'O que é um vinho laranja?'];

export default function SommelierPage() {
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [apagar, setApagar] = useState(false);
  const [beber, setBeber] = useState<GarrafaParaBeber | null>(null);
  const [agora, setAgora] = useState<Map<number, { estoque: number; status: string }>>(new Map());
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const fimLista = useRef<HTMLDivElement>(null);
  const avisar = useAviso();
  const navegar = useNavigate();

  const carregar = useCallback(async () => {
    try {
      const rows = await callRows<Historico>(SF.sommelierHistorico);
      setMsgs(rows.map(r => {
        const extra = parseJson<{ sugestoes?: Sugestao[]; comprar?: string }>(r.SUGESTOES, {});
        return { id: `h${r.ID}`, papel: r.PAPEL, texto: r.TEXTO, viaAudio: r.VIA_AUDIO === true || Number(r.VIA_AUDIO) === 1, sugestoes: extra.sugestoes ?? [], comprar: extra.comprar ?? '' };
      }));
    } catch { setMsgs([]); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const idsSugeridos = [...new Set((msgs ?? []).flatMap(m => (m.sugestoes ?? []).map(s => s.safraId)))].sort((a, b) => a - b).join(',');
  const atualizarEstoque = useCallback(async () => {
    if (!idsSugeridos) return;
    try {
      const rows = await callRows<{ ID: number; ESTOQUE: number; STATUS: string }>(SF.estoqueSafras, { ids: idsSugeridos });
      const mapa = new Map<number, { estoque: number; status: string }>();
      for (const id of idsSugeridos.split(',')) mapa.set(Number(id), { estoque: 0, status: '' });
      for (const r of rows) mapa.set(Number(r.ID), { estoque: Number(r.ESTOQUE), status: r.STATUS });
      setAgora(mapa);
    } catch { /* mantém o que veio na resposta */ }
  }, [idsSugeridos]);
  useEffect(() => { atualizarEstoque(); }, [atualizarEstoque]);
  useEffect(() => { fimLista.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, enviando]);
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos(s => {
      if (s + 1 >= 60) gravador.current?.stop();
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [gravando]);

  async function perguntar(input: { texto?: string; audioKey?: string }, provisoria?: string) {
    const temp = `t${Date.now()}`;
    setMsgs(m => [...(m ?? []), { id: temp, papel: 'usuario', texto: provisoria ?? input.texto ?? '', viaAudio: !!input.audioKey }]);
    setEnviando(true);
    try {
      const r = await callSF<Resposta>(SF.sommelierPerguntar, { texto: input.texto ?? '', audioKey: input.audioKey ?? '' });
      if (!r?.ok) {
        setMsgs(m => [...(m ?? []), { id: `${temp}e`, papel: 'sommelier', texto: r?.aviso || 'O sommelier não respondeu agora. Tente de novo em instantes.', erro: true }]);
        return;
      }
      setMsgs(m => [...(m ?? []).map(x => (x.id === temp ? { ...x, texto: r.pergunta ?? x.texto } : x)),
        { id: `${temp}r`, papel: 'sommelier', texto: r.resposta ?? '', sugestoes: r.sugestoes ?? [], comprar: r.comprar ?? '' }]);
    } catch {
      setMsgs(m => [...(m ?? []), { id: `${temp}e`, papel: 'sommelier', texto: 'O sommelier não respondeu agora. Tente de novo em instantes.', erro: true }]);
    } finally { setEnviando(false); }
  }

  function enviarTexto(t = texto) {
    const v = t.trim();
    if (!v || enviando) return;
    setTexto('');
    perguntar({ texto: v });
  }

  async function iniciarGravacao() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { avisar('error', 'Este navegador não grava áudio. Escreva a pergunta.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      pedacos.current = [];
      rec.ondataavailable = e => { if (e.data.size) pedacos.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setGravando(false);
        const gravado = new Blob(pedacos.current, { type: rec.mimeType || 'audio/webm' });
        if (gravado.size < 1000) { avisar('error', 'O áudio ficou curto demais. Grave de novo.'); return; }
        setEnviando(true);
        try {
          const wav = await paraWav(gravado);
          const key = await enviarArquivoPrivado(wav, 'pergunta.wav');
          setEnviando(false);
          await perguntar({ audioKey: key }, '🎤 Transcrevendo o áudio...');
        } catch {
          setEnviando(false);
          avisar('error', 'Não consegui enviar o áudio. Tente de novo ou escreva.');
        }
      };
      gravador.current = rec;
      setSegundos(0);
      rec.start();
      setGravando(true);
    } catch { avisar('error', 'Sem acesso ao microfone. Libere o microfone no navegador ou escreva a pergunta.'); }
  }

  async function apagarConversa() {
    try { await callSF(SF.sommelierApagar); setMsgs([]); avisar('success', 'Conversa apagada.'); }
    catch (e) { avisar('error', (e as Error).message); }
    finally { setApagar(false); }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <PageHeader titulo="Sommelier" descricao="Pergunte sobre um prato, uma ocasião ou um vinho. Para indicar garrafas, ele procura primeiro na sua adega."
        acoes={(msgs?.length ?? 0) > 0 ? <Button variant="ghost" onClick={() => setApagar(true)}><Trash2 size={15} />Apagar conversa</Button> : undefined} />

      <div className="flex-1 flex flex-col gap-4 pb-4">
        {!msgs && <SkeletonListItems count={3} />}
        {msgs && msgs.length === 0 && (
          <div className="cartao p-6 text-center flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-soft text-primary flex items-center justify-center"><Wine size={20} /></div>
            <p className="text-fg">O que você quer saber sobre vinho hoje?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXEMPLOS.map(e => <Button key={e} size="sm" variant="secondary" onClick={() => enviarTexto(e)}>{e}</Button>)}
            </div>
          </div>
        )}
        {msgs?.map(m => m.papel === 'usuario' ? (
          <div key={m.id} className="self-end max-w-[85%] rounded-2xl px-4 py-2.5 bg-brand-soft text-fg text-[14px] whitespace-pre-wrap break-words">
            {m.viaAudio && <span className="block text-[11px] text-fg-subtle mb-0.5">🎤 por áudio</span>}
            {m.texto}
          </div>
        ) : (
          <div key={m.id} className="self-start w-full max-w-[95%] flex flex-col gap-2">
            {m.texto && <div className={`cartao px-4 py-3 text-[14px] whitespace-pre-wrap break-words ${m.erro ? 'text-danger-text' : 'text-fg'}`}>{m.texto}</div>}
            {(m.sugestoes ?? []).map(s => {
              const atual = agora.get(s.safraId);
              const estoque = atual ? atual.estoque : s.estoque;
              const status = atual?.status || s.status;
              return (
              <div key={s.safraId} className="cartao p-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pilula pilula-acento">Da sua adega</span>
                  <span className="font-medium text-fg">{s.nome} {s.ano}</span>
                  <StatusBadge status={status} />
                </div>
                <div className="text-[12.5px] text-fg-subtle">{s.produtor ? `${s.produtor} · ` : ''}{estoque > 0 ? `${estoque} garrafa${estoque === 1 ? '' : 's'} na adega agora` : 'Não tem mais na adega'}</div>
                {s.porQue && <p className="text-[13.5px] text-fg-muted">{s.porQue}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navegar(`/vinho/${s.vinhoId}`)}>Abrir ficha</Button>
                  {estoque > 0 && <Button size="sm" onClick={() => setBeber({ safraId: s.safraId, nome: s.nome, ano: s.ano, estoque })}><Wine size={14} />Beber logo</Button>}
                </div>
              </div>
              );
            })}
            {m.comprar && (
              <div className="cartao p-4 flex gap-3">
                <ShoppingBag size={18} className="text-primary shrink-0 mt-0.5" />
                <div><div className="text-[12px] text-fg-subtle mb-0.5">Para comprar (não está na sua adega)</div><p className="text-[13.5px] text-fg">{m.comprar}</p></div>
              </div>
            )}
          </div>
        ))}
        {enviando && <div className="self-start cartao px-4 py-3 text-[13.5px] text-fg-subtle">O sommelier está pensando...</div>}
        <div ref={fimLista} />
      </div>

      <div className="sticky bottom-0 bg-bg pt-2 pb-1">
        <div className="cartao p-2 flex items-end gap-2">
          {gravando ? (
            <div className="flex-1 h-9 flex items-center gap-2 px-2 text-[14px] text-fg"><span className="w-2 h-2 rounded-full bg-danger animate-pulse" />Gravando... {segundos}s (até 60s)</div>
          ) : (
            <textarea className="controle flex-1 py-2 resize-none" rows={1} style={{ height: 'auto', minHeight: 36, maxHeight: 140 }} placeholder="Pergunte sobre um prato ou um vinho"
              value={texto} onChange={e => setTexto(e.target.value)} maxLength={2000} disabled={enviando}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }} />
          )}
          {gravando
            ? <Button variant="danger" onClick={() => gravador.current?.stop()} aria-label="Parar e enviar"><Square size={15} />Enviar</Button>
            : <Button variant="secondary" onClick={iniciarGravacao} disabled={enviando} aria-label="Gravar áudio"><Mic size={16} /></Button>}
          {!gravando && <Button onClick={() => enviarTexto()} disabled={enviando || !texto.trim()} aria-label="Enviar"><Send size={16} /></Button>}
        </div>
        <p className="text-[11.5px] text-fg-subtle mt-1.5 px-1">O sommelier só consulta a adega. Nada muda sem você tocar em Beber logo.</p>
      </div>

      <BeberLogoDialog garrafa={beber} onClose={() => setBeber(null)} onFeito={() => { atualizarEstoque(); }} />
      <ConfirmDialog isOpen={apagar} onClose={() => setApagar(false)} onConfirm={apagarConversa} title="Apagar conversa" confirmLabel="Apagar"
        message="Apagar todo o histórico de conversa com o sommelier? A sua adega não muda." />
    </div>
  );
}
