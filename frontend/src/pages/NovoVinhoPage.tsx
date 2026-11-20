import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, PenLine, ScanText, Search, Sparkles, Square } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import VinhoForm, { VINHO_VAZIO, enviarFoto } from '../components/VinhoForm';
import type { DadosVinho, FotoEstado } from '../components/VinhoForm';
import { useAviso } from '../components/ToastContext';
import { callSF, callRows, hojeISO, MOTIVOS_ENTRADA, enviarArquivoPrivado } from '../lib/api';
import { paraWav } from '../lib/midia';
import { SF } from '../lib/sf';

interface Leitura { ok: boolean; campos?: { nome: string; produtor: string; pais: string; regiao: string; uva: string; tipoId: number; safra: number }; duplicado?: { id: number; nome: string; produtor: string } | null; motivo?: string; aviso?: string }

export default function NovoVinhoPage() {
  const [modo, setModo] = useState<'escolha' | 'form'>('escolha');
  const [dados, setDados] = useState<DadosVinho>(VINHO_VAZIO);
  const [foto, setFoto] = useState<FotoEstado>({ key: '', preview: '', remover: false });
  const [ano, setAno] = useState('');
  const [qtd, setQtd] = useState('1');
  const [motivo, setMotivo] = useState('compra');
  const [janela, setJanela] = useState({ inicio: '', auge: '', fim: '' });
  const [erroJanela, setErroJanela] = useState('');
  const [sugerindo, setSugerindo] = useState(false);
  const [comentario, setComentario] = useState('');
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos(x => { if (x + 1 >= 20) gravador.current?.stop(); return x + 1; }), 1000);
    return () => clearInterval(t);
  }, [gravando]);

  async function falarNome() {
    if (gravando) { gravador.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setErroBusca('Este navegador não grava áudio. Escreva o nome.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      pedacos.current = [];
      rec.ondataavailable = e => { if (e.data.size) pedacos.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setGravando(false);
        const gravado = new Blob(pedacos.current, { type: rec.mimeType || 'audio/webm' });
        if (gravado.size < 1000) { setErroBusca('O áudio ficou curto demais. Fale de novo.'); return; }
        setErroBusca(''); setBuscando(true); setAviso(''); setDuplicado(null);
        try {
          const key = await enviarArquivoPrivado(await paraWav(gravado), 'vinho.wav');
          const r = await callSF<Leitura & { falado?: string }>(SF.vinhoBuscarNome, { nome: '', audioKey: key });
          if (r?.falado) setBusca(r.falado);
          if (r?.ok && r.campos) { aplicarLeitura(r, 'pelo nome falado'); setModo('form'); }
          else if (r?.campos?.nome) { setDados({ ...VINHO_VAZIO, nome: r.campos.nome }); setAno(''); setAviso(r.aviso || 'Não encontrei as características agora. Complete à mão.'); setModo('form'); }
          else setErroBusca(r?.motivo === 'nao_encontrado' || !r?.aviso ? 'Não entendi o nome no áudio. Fale de novo, perto do microfone, ou escreva.' : r.aviso);
        } catch {
          setErroBusca('A busca não respondeu agora. Fale de novo ou escreva o nome.');
        } finally { setBuscando(false); }
      };
      gravador.current = rec;
      setSegundos(0);
      rec.start();
      setGravando(true);
    } catch { setErroBusca('Sem acesso ao microfone. Libere o microfone no navegador ou escreva o nome.'); }
  }
  const [lendo, setLendo] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const [aviso, setAviso] = useState('');
  const [duplicado, setDuplicado] = useState<Leitura['duplicado']>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; ano?: string; qtd?: string }>({});
  const arquivo = useRef<HTMLInputElement>(null);
  const avisar = useAviso();
  const navegar = useNavigate();

  async function lerRotulo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setLendo(true); setAviso(''); setDuplicado(null);
    let enviada: { key: string; preview: string };
    try { enviada = await enviarFoto(f); }
    catch (err) { avisar('error', (err as Error).message); setLendo(false); return; }
    setFoto({ key: enviada.key, preview: enviada.preview, remover: false });
    try {
      const r = await callSF<Leitura>(SF.lerRotulo, { fotoKey: enviada.key, mime: 'image/jpeg' });
      if (r?.ok && r.campos) {
        aplicarLeitura(r, 'pela leitura do rótulo');
      } else {
        setDados(VINHO_VAZIO);
        setAviso(r?.aviso || 'Não consegui ler o rótulo agora. Preencha à mão; a foto fica anexada.');
      }
    } catch {
      setAviso('A leitura do rótulo não respondeu agora. Preencha à mão; a foto fica anexada.');
    } finally {
      setLendo(false);
      setModo('form');
    }
  }

  function aplicarLeitura(r: Leitura, origem: string) {
    const c = r.campos!;
    setDados({ ...VINHO_VAZIO, nome: c.nome, produtor: c.produtor, pais: c.pais, regiao: c.regiao, uva: c.uva, tipoId: String(c.tipoId || 0) });
    setAno(c.safra ? String(c.safra) : '');
    setDuplicado(r.duplicado ?? null);
    setAviso(`Confira os campos sugeridos ${origem}. Nada foi gravado ainda.`);
  }

  async function buscarNome(e?: React.FormEvent) {
    e?.preventDefault();
    const termo = busca.trim();
    if (termo.length < 3) { setErroBusca('Escreva pelo menos 3 letras do nome do vinho.'); return; }
    setErroBusca(''); setBuscando(true); setAviso(''); setDuplicado(null);
    try {
      const r = await callSF<Leitura>(SF.vinhoBuscarNome, { nome: termo });
      if (r?.ok && r.campos) aplicarLeitura(r, 'pela busca do nome');
      else {
        setDados({ ...VINHO_VAZIO, nome: r?.campos?.nome || termo });
        setAno(''); setAviso(r?.aviso || 'Não encontrei as características agora. Complete à mão.');
      }
    } catch {
      setDados({ ...VINHO_VAZIO, nome: termo });
      setAviso('A busca não respondeu agora. Complete à mão.');
    } finally {
      setBuscando(false);
      setModo('form');
    }
  }

  async function sugerirJanela() {
    if (!dados.nome.trim()) { setErros({ ...erros, nome: 'Informe o nome do vinho.' }); return; }
    if (!ano.trim()) { setErros({ ...erros, ano: 'Informe o ano da safra.' }); return; }
    setSugerindo(true); setErroJanela(''); setComentario('');
    try {
      const r = await callSF<{ ok: boolean; inicio?: number; auge?: number; fim?: number; comentario?: string; aviso?: string }>(SF.janelaSugerir, {
        nome: dados.nome.trim(), produtor: dados.produtor, pais: dados.pais, regiao: dados.regiao, uva: dados.uva, tipoId: Number(dados.tipoId), ano: Number(ano),
      });
      if (r?.ok && r.inicio) {
        setJanela({ inicio: String(r.inicio), auge: String(r.auge), fim: String(r.fim) });
        setComentario(r.comentario || '');
      } else setErroJanela(r?.aviso || 'O sommelier não respondeu agora. Tente de novo em instantes.');
    } catch {
      setErroJanela('O sommelier não respondeu agora. Tente de novo em instantes.');
    } finally { setSugerindo(false); }
  }

  async function salvar() {
    const novoErro: typeof erros = {};
    if (!dados.nome.trim()) novoErro.nome = 'Informe o nome do vinho.';
    const anoN = ano.trim() ? Number(ano) : 0;
    if (ano.trim() && (!Number.isInteger(anoN) || anoN < 1900 || anoN > 2100)) novoErro.ano = 'Ano entre 1900 e 2100.';
    const qtdN = Number(qtd);
    if (anoN && (!Number.isInteger(qtdN) || qtdN < 0 || qtdN > 10000)) novoErro.qtd = 'Quantidade inteira de 0 a 10.000.';
    const [ji, ja, jf] = [Number(janela.inicio), Number(janela.auge), Number(janela.fim)];
    const algumaJanela = janela.inicio || janela.auge || janela.fim;
    if (anoN && algumaJanela) {
      if (![ji, ja, jf].every(v => v >= 1900 && v <= 2200)) { setErroJanela('Preencha início, auge e fim com anos entre 1900 e 2200.'); return; }
      if (ja < ji || jf < ja) { setErroJanela('A ordem precisa ser início, depois auge, depois fim.'); return; }
    }
    setErroJanela('');
    setErros(novoErro);
    if (Object.keys(novoErro).length) return;
    setSalvando(true);
    try {
      await callSF(SF.vinhoCriar, {
        nome: dados.nome.trim(), produtor: dados.produtor, pais: dados.pais, regiao: dados.regiao, uva: dados.uva, tipoId: Number(dados.tipoId),
        fotoKey: foto.remover ? '' : foto.key, notas: dados.notas, ano: anoN, quantidade: anoN ? qtdN : 0, motivo, data: hojeISO(),
        inicio: anoN && algumaJanela ? ji : 0, auge: anoN && algumaJanela ? ja : 0, fim: anoN && algumaJanela ? jf : 0,
      });
      const id = (await callRows<{ ID: number }>(SF.vinhoUltimo))[0]?.ID;
      avisar('success', 'Vinho cadastrado.');
      navegar(id ? `/vinho/${id}` : '/adega', { replace: true });
    } catch (err) {
      avisar('error', (err as Error).message);
    } finally { setSalvando(false); }
  }

  if (modo === 'escolha') {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader titulo="Novo vinho" descricao="Procure pelo nome, leia o rótulo por foto ou preencha à mão." />
        <form onSubmit={buscarNome} className="cartao p-5 mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-soft text-primary flex items-center justify-center shrink-0"><Search size={20} /></div>
            <div>
              <div className="font-medium text-fg">Procurar pelo nome</div>
              <p className="text-[13px] text-fg-subtle">Escreva ou fale o nome do vinho (produtor, uva, safra ajudam). O formulário abre com as características encontradas para você revisar.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="flex-1"><Input aria-label="Nome do vinho" placeholder="Ex.: Catena Malbec 2020" value={busca} onChange={e => setBusca(e.target.value.slice(0, 200))} error={erroBusca} disabled={buscando || lendo} /></div>
            <div className="flex gap-2">
              <Button type="button" variant={gravando ? 'primary' : 'secondary'} onClick={falarNome} disabled={buscando || lendo} aria-label={gravando ? 'Parar e procurar' : 'Falar o nome'}>
                {gravando ? <><Square size={16} />Parar ({segundos}s)</> : <><Mic size={16} />Falar</>}
              </Button>
              <Button type="submit" disabled={buscando || lendo || gravando}><Search size={16} />{buscando ? 'Procurando...' : 'Procurar'}</Button>
            </div>
          </div>
        </form>
        <input ref={arquivo} type="file" accept="image/*" capture="environment" className="hidden" onChange={lerRotulo} />
        <div className="grid sm:grid-cols-2 gap-4">
          <button className="cartao cartao-vivo p-6 text-left flex flex-col gap-3 disabled:opacity-60" onClick={() => arquivo.current?.click()} disabled={lendo || buscando}>
            <div className="w-11 h-11 rounded-xl bg-brand-soft text-primary flex items-center justify-center"><ScanText size={20} /></div>
            <div className="font-medium text-fg">{lendo ? 'Lendo o rótulo...' : 'Ler rótulo'}</div>
            <p className="text-[13px] text-fg-subtle">{lendo ? 'Isso leva alguns segundos.' : 'Tire ou envie a foto do rótulo. O formulário abre preenchido para você revisar.'}</p>
          </button>
          <button className="cartao cartao-vivo p-6 text-left flex flex-col gap-3" onClick={() => setModo('form')} disabled={lendo || buscando}>
            <div className="w-11 h-11 rounded-xl bg-brand-soft text-primary flex items-center justify-center"><PenLine size={20} /></div>
            <div className="font-medium text-fg">Cadastrar à mão</div>
            <p className="text-[13px] text-fg-subtle">Preencha os campos. A foto é opcional.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader titulo="Novo vinho" acoes={<Button variant="ghost" onClick={() => { setModo('escolha'); setAviso(''); setDuplicado(null); }}><Camera size={16} />Procurar ou ler outro</Button>} />
      {aviso && <div className="cartao p-4 mb-4 text-[13.5px] text-fg-muted">{aviso}</div>}
      {duplicado && (
        <div className="cartao p-4 mb-4 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[13.5px] text-fg">Parece que <b>{duplicado.nome}</b>{duplicado.produtor ? ` (${duplicado.produtor})` : ''} já está na sua adega. Você pode abrir esse vinho e só adicionar a safra.</p>
          <Button size="sm" onClick={() => navegar(`/vinho/${duplicado.id}${ano ? `?novaSafra=${ano}` : ''}`)}>Abrir o vinho existente</Button>
        </div>
      )}
      <div className="flex flex-col gap-5">
        <Card><CardContent className="pt-5"><VinhoForm dados={dados} onChange={setDados} foto={foto} onFoto={setFoto} erroNome={erros.nome} /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Primeira safra</CardTitle><CardDescription>Opcional. Deixe o ano vazio para cadastrar só o vinho.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="Ano da safra" inputMode="numeric" value={ano} onChange={e => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))} error={erros.ano} />
              <Input label="Garrafas" inputMode="numeric" value={qtd} onChange={e => setQtd(e.target.value.replace(/\D/g, '').slice(0, 5))} error={erros.qtd} disabled={!ano} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-fg-muted">Motivo da entrada</label>
                <Select value={motivo} onChange={setMotivo} options={MOTIVOS_ENTRADA} disabled={!ano} />
              </div>
            </div>
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="rotulo-secao mr-auto">Janela de consumo (anos)</div>
                <Button size="sm" variant="secondary" onClick={sugerirJanela} disabled={!ano || sugerindo || salvando}><Sparkles size={14} />{sugerindo ? 'Consultando o sommelier...' : 'Sommelier sugere'}</Button>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <Input label="Início" inputMode="numeric" value={janela.inicio} onChange={e => setJanela({ ...janela, inicio: e.target.value.replace(/\D/g, '').slice(0, 4) })} disabled={!ano} />
                <Input label="Auge" inputMode="numeric" value={janela.auge} onChange={e => setJanela({ ...janela, auge: e.target.value.replace(/\D/g, '').slice(0, 4) })} disabled={!ano} />
                <Input label="Fim" inputMode="numeric" value={janela.fim} onChange={e => setJanela({ ...janela, fim: e.target.value.replace(/\D/g, '').slice(0, 4) })} disabled={!ano} />
              </div>
              {comentario && <p className="mt-2 text-[13px] text-fg-muted">{comentario} Confira e ajuste se quiser.</p>}
              {erroJanela && <p className="mt-2 text-[13px]" style={{ color: 'var(--danger)' }}>{erroJanela}</p>}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navegar(-1)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar vinho'}</Button>
        </div>
      </div>
    </div>
  );
}
