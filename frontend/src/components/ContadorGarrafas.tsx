import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAviso } from './ToastContext';
import { callSF, hojeISO, notificarAlertas } from '../lib/api';
import { SF } from '../lib/sf';

/** Mais e menos de uma garrafa por toque; cada toque fica no histórico como "ajuste". */
export default function ContadorGarrafas({ safraId, estoque, rotulo, tamanho = 'md', onMudou }: {
  safraId: number; estoque: number; rotulo: string; tamanho?: 'sm' | 'md'; onMudou?: (novo: number) => void;
}) {
  const [valor, setValor] = useState(estoque);
  const fila = useRef(Promise.resolve());
  const avisar = useAviso();
  useEffect(() => { setValor(estoque); }, [estoque]);

  function mudar(delta: 1 | -1, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (delta < 0 && valor <= 0) return;
    const novo = valor + delta;
    setValor(novo);
    fila.current = fila.current.then(async () => {
      try {
        const r = await callSF<{ affectedRows?: number }>(SF.movimentar, { safraId, tipo: delta > 0 ? 'E' : 'S', quantidade: 1, motivo: 'ajuste', data: hojeISO() });
        if (r && r.affectedRows === 0) throw new Error('Não deu para tirar: o estoque já está em zero.');
        notificarAlertas();
        onMudou?.(novo);
      } catch (err) {
        setValor(v => v - delta);
        avisar('error', (err as Error).message);
      }
    });
  }

  const botao = tamanho === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-0.5" role="group" aria-label={`Garrafas de ${rotulo}`}
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <button type="button" className={`${botao} rounded-full inline-flex items-center justify-center text-fg hover:bg-surface-hover disabled:opacity-40`}
        onClick={e => mudar(-1, e)} disabled={valor <= 0} aria-label={`Tirar uma garrafa de ${rotulo}`}><Minus size={tamanho === 'sm' ? 15 : 17} /></button>
      <span className={`min-w-7 text-center font-semibold tabular-nums text-fg ${tamanho === 'sm' ? 'text-[14px]' : 'text-[18px]'}`} aria-live="polite">{valor}</span>
      <button type="button" className={`${botao} rounded-full inline-flex items-center justify-center text-primary hover:bg-surface-hover`}
        onClick={e => mudar(1, e)} aria-label={`Pôr uma garrafa de ${rotulo}`}><Plus size={tamanho === 'sm' ? 15 : 17} /></button>
    </div>
  );
}
