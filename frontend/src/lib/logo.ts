import { estiloSalvo } from './estilo';

export type Logo = 'automatico' | 'a-azul' | 'b-azul' | 'a-bordo' | 'b-bordo';

const CHAVE = 'karanu-logo';
const LOGOS: Logo[] = ['automatico', 'a-azul', 'b-azul', 'a-bordo', 'b-bordo'];

export const LOGO_ARQUIVO: Record<Exclude<Logo, 'automatico'>, string> = {
  'a-azul': '/marca/karanu-a-azul.png',
  'b-azul': '/marca/karanu-b-azul.png',
  'a-bordo': '/marca/karanu-a-bordo.png',
  'b-bordo': '/marca/karanu-b-bordo.png',
};

export function logoSalvo(): Logo {
  const v = localStorage.getItem(CHAVE) as Logo | null;
  return v && LOGOS.includes(v) ? v : 'automatico';
}

export function logoAtual(): string {
  const l = logoSalvo();
  if (l !== 'automatico') return LOGO_ARQUIVO[l];
  return estiloSalvo() === 'karanu-bordo' ? LOGO_ARQUIVO['b-bordo'] : LOGO_ARQUIVO['a-azul'];
}

export function salvarLogo(l: Logo): void {
  localStorage.setItem(CHAVE, l);
  window.dispatchEvent(new Event('tema-mudou'));
}
