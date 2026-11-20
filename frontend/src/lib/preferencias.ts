import { useEffect, useState } from 'react';
import { callRows, callSF, numBR } from './api';
import { SF } from './sf';

export interface Preferencias { temperatura: 'C' | 'F'; escala: 100 | 5; pais: string }
export const PADRAO: Preferencias = { temperatura: 'C', escala: 100, pais: 'Brasil' };

let atual: Preferencias = PADRAO;
let carregando: Promise<Preferencias> | null = null;
const EVENTO = 'preferencias-mudaram';

export function carregarPreferencias(): Promise<Preferencias> {
  if (!carregando) {
    carregando = callRows<{ TEMPERATURA: string; ESCALA_NOTA: number; PAIS: string }>(SF.preferenciasLer)
      .then(r => {
        const p = r[0];
        atual = p ? { temperatura: p.TEMPERATURA === 'F' ? 'F' : 'C', escala: Number(p.ESCALA_NOTA) === 5 ? 5 : 100, pais: p.PAIS || 'Brasil' } : PADRAO;
        window.dispatchEvent(new Event(EVENTO));
        return atual;
      })
      .catch(() => { carregando = null; return atual; });
  }
  return carregando;
}

export async function salvarPreferencias(p: Preferencias) {
  await callSF(SF.preferenciasSalvar, { temperatura: p.temperatura, escala: String(p.escala), pais: p.pais });
  atual = p;
  carregando = Promise.resolve(p);
  window.dispatchEvent(new Event(EVENTO));
}

export function usePreferencias(): Preferencias {
  const [p, setP] = useState(atual);
  useEffect(() => {
    const f = () => setP(atual);
    window.addEventListener(EVENTO, f);
    carregarPreferencias();
    return () => window.removeEventListener(EVENTO, f);
  }, []);
  return p;
}

/** Nota guardada em 0–100 mostrada na escala escolhida (0–5 com uma casa). */
export function notaNaEscala(nota100: number | null | undefined, escala: 100 | 5): string {
  if (nota100 == null || !Number.isFinite(Number(nota100))) return '–';
  const n = Number(nota100);
  if (escala === 5) return numBR(Math.round(n / 2) / 10, 1);
  return numBR(n, Number.isInteger(n) ? 0 : 1);
}

/** Nota digitada na escala escolhida convertida para 0–100 (inteiro). */
export function notaPara100(nota: number, escala: 100 | 5): number {
  return Math.round(escala === 5 ? nota * 20 : nota);
}

const paraF = (c: string) => String(Math.round(Number(c.replace(',', '.')) * 9 / 5 + 32));

/** Troca as temperaturas em °C de um texto para °F quando a usuária prefere Fahrenheit. */
export function temperaturaNoTexto(texto: string, unidade: 'C' | 'F'): string {
  if (unidade === 'C' || !texto) return texto;
  return texto.replace(/(\d+(?:[.,]\d+)?)((?:\s*°\s*C?)?(?:\s*(?:a|e|até|-|–)\s*\d+(?:[.,]\d+)?)*)\s*°\s*C\b/g, (_t, primeiro: string, resto: string) => {
    const meio = resto.replace(/\s*°\s*C?/g, '').replace(/\d+(?:[.,]\d+)?/g, n => paraF(n));
    return `${paraF(primeiro)}${meio} °F`;
  });
}
