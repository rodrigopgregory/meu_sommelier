import { useEffect, useRef, useState } from 'react';
import { Camera, ImageOff, Wine } from 'lucide-react';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { AreaTexto } from './Campos';
import { callRows, parseJson, enviarArquivoPrivado } from '../lib/api';
import { prepararFoto } from '../lib/midia';
import { SF } from '../lib/sf';
import { useAviso } from './ToastContext';

export interface DadosVinho { nome: string; produtor: string; pais: string; regiao: string; uva: string; tipoId: string; notas: string }
export interface FotoEstado { key: string; preview: string; remover: boolean }
interface Tipo { id: number; nome: string }

export const VINHO_VAZIO: DadosVinho = { nome: '', produtor: '', pais: '', regiao: '', uva: '', tipoId: '0', notas: '' };

export async function enviarFoto(file: File): Promise<{ key: string; preview: string }> {
  const blob = await prepararFoto(file);
  const key = await enviarArquivoPrivado(blob, 'rotulo.jpg');
  return { key, preview: URL.createObjectURL(blob) };
}

export default function VinhoForm({ dados, onChange, foto, onFoto, erroNome }: {
  dados: DadosVinho; onChange: (d: DadosVinho) => void; foto: FotoEstado; onFoto: (f: FotoEstado) => void; erroNome?: string;
}) {
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const avisar = useAviso();

  useEffect(() => {
    callRows<Record<string, unknown>>(SF.dominios).then(r => setTipos(parseJson<Tipo[]>(r[0]?.TIPOS, []))).catch(() => {});
  }, []);

  const campo = (k: keyof DadosVinho) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...dados, [k]: e.target.value });

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setEnviando(true);
    try { const r = await enviarFoto(f); onFoto({ key: r.key, preview: r.preview, remover: false }); }
    catch (err) { avisar('error', (err as Error).message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="grid md:grid-cols-[160px_1fr] gap-5">
      <div className="flex flex-col gap-2 items-start">
        <div className="w-40 h-52 max-w-full rounded-2xl overflow-hidden bg-brand-soft text-primary flex items-center justify-center border border-border">
          {foto.preview && !foto.remover ? <img src={foto.preview} alt="Foto do rótulo" className="w-full h-full object-cover" /> : <Wine size={32} />}
        </div>
        <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={escolher} />
        <Button size="sm" variant="secondary" onClick={() => arquivo.current?.click()} disabled={enviando}><Camera size={14} />{enviando ? 'Enviando...' : foto.preview && !foto.remover ? 'Trocar foto' : 'Adicionar foto'}</Button>
        {foto.preview && !foto.remover && <Button size="sm" variant="ghost" onClick={() => onFoto({ key: '', preview: '', remover: true })}><ImageOff size={14} />Tirar foto</Button>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Input label="Nome do vinho *" value={dados.nome} onChange={campo('nome')} error={erroNome} maxLength={200} /></div>
        <Input label="Produtor" value={dados.produtor} onChange={campo('produtor')} maxLength={200} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-fg-muted">Tipo</label>
          <Select value={dados.tipoId} onChange={v => onChange({ ...dados, tipoId: v })} options={[{ value: '0', label: 'Sem tipo' }, ...tipos.map(t => ({ value: String(t.id), label: t.nome }))]} />
        </div>
        <Input label="País" value={dados.pais} onChange={campo('pais')} maxLength={80} />
        <Input label="Região" value={dados.regiao} onChange={campo('regiao')} maxLength={120} />
        <div className="sm:col-span-2"><Input label="Uva(s)" value={dados.uva} onChange={campo('uva')} maxLength={200} /></div>
        <div className="sm:col-span-2"><AreaTexto label="Notas" value={dados.notas} onChange={campo('notas')} maxLength={2000} /></div>
      </div>
    </div>
  );
}
