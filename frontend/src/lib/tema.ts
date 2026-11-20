export type Tema = 'escuro' | 'claro' | 'sistema';

const CHAVE = 'my-sommelier-tema';
const midia = () => window.matchMedia('(prefers-color-scheme: dark)');

export function temaSalvo(): Tema {
  const v = localStorage.getItem(CHAVE);
  return v === 'claro' || v === 'sistema' ? v : 'escuro';
}

export function temaEfetivo(t: Tema = temaSalvo()): 'escuro' | 'claro' {
  if (t === 'sistema') return midia().matches ? 'escuro' : 'claro';
  return t;
}

export function aplicarTema(t: Tema = temaSalvo()): void {
  const escuro = temaEfetivo(t) === 'escuro';
  const html = document.documentElement;
  html.setAttribute('data-theme', escuro ? 'dark' : 'light');
  html.classList.toggle('dark', escuro);
  const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (escuro ? '#120d10' : '#faf8f7'));
}

export function salvarTema(t: Tema): void {
  localStorage.setItem(CHAVE, t);
  aplicarTema(t);
  window.dispatchEvent(new Event('tema-mudou'));
}

export function acompanharSistema(): () => void {
  const m = midia();
  const f = () => { if (temaSalvo() === 'sistema') { aplicarTema('sistema'); window.dispatchEvent(new Event('tema-mudou')); } };
  m.addEventListener('change', f);
  return () => m.removeEventListener('change', f);
}
