export type Estilo = 'classico' | 'karanu-azul' | 'karanu-bordo';

const CHAVE = 'my-sommelier-estilo';
const ESTILOS: Estilo[] = ['classico', 'karanu-azul', 'karanu-bordo'];

export function estiloSalvo(): Estilo {
  const v = localStorage.getItem(CHAVE) as Estilo | null;
  return v && ESTILOS.includes(v) ? v : 'classico';
}

export function aplicarEstilo(e: Estilo = estiloSalvo()): void {
  document.documentElement.setAttribute('data-estilo', e);
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

export function salvarEstilo(e: Estilo): void {
  localStorage.setItem(CHAVE, e);
  aplicarEstilo(e);
  window.dispatchEvent(new Event('tema-mudou'));
}
