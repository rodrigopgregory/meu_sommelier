import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, Home, LogOut, Menu, MessageCircle, Moon, Settings, Sun, Wine, X } from 'lucide-react';
import { salvarTema, temaEfetivo } from '../lib/tema';
import { logoAtual } from '../lib/logo';
import { callRows, callSF } from '../lib/api';
import { clearSession } from '../lib/mitra-auth';
import ConfirmDialog from './ui/ConfirmDialog';
import { SF } from '../lib/sf';

const ITENS = [
  { to: '/', rotulo: 'Início', icone: Home },
  { to: '/adega', rotulo: 'Adega', icone: Wine },
  { to: '/sommelier', rotulo: 'Sommelier', icone: MessageCircle },
  { to: '/alertas', rotulo: 'Alertas', icone: Bell },
  { to: '/fontes', rotulo: 'Fontes', icone: BookOpen },
];

export default function Layout() {
  const [aberto, setAberto] = useState(false);
  const [naoLidos, setNaoLidos] = useState(0);
  const [sair, setSair] = useState(false);
  const [escuro, setEscuro] = useState(temaEfetivo() === 'escuro');
  const [logo, setLogo] = useState(logoAtual());
  const local = useLocation();
  const navegar = useNavigate();

  const contar = useCallback(async () => {
    try {
      const r = await callRows<{ NAO_LIDOS: number }>(SF.alertasContar);
      setNaoLidos(Number(r[0]?.NAO_LIDOS ?? 0));
    } catch { /* contador é só informativo */ }
  }, []);

  useEffect(() => {
    callSF(SF.adegaGarantir).catch(() => {});
  }, []);

  useEffect(() => {
    contar();
    callSF(SF.alertasConferir).then(contar).catch(() => {});
    window.addEventListener('alertas-mudaram', contar);
    return () => window.removeEventListener('alertas-mudaram', contar);
  }, [contar]);

  useEffect(() => { setAberto(false); }, [local.pathname]);

  useEffect(() => {
    const f = () => { setEscuro(temaEfetivo() === 'escuro'); setLogo(logoAtual()); };
    window.addEventListener('tema-mudou', f);
    return () => window.removeEventListener('tema-mudou', f);
  }, []);

  const alternarTema = () => salvarTema(escuro ? 'claro' : 'escuro');
  const botaoTema = (
    <button type="button" className="nav-item nav-icone" onClick={alternarTema} aria-label={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'} title={escuro ? 'Modo claro' : 'Modo escuro'}>
      {escuro ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
  const marca = (
    <span className="flex items-center gap-2.5 min-w-0">
      <img className="marca-icone" src={logo} alt="" aria-hidden="true" />
      <span className="marca-nome truncate">Karanu</span>
    </span>
  );

  const noInicio = local.pathname === '/';
  function voltar() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navegar(-1); else navegar('/', { replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {ITENS.map(({ to, rotulo, icone: Icone }) => (
        <NavLink key={to} to={to} end={to === '/'} className="nav-item"
          data-active={(to === '/' ? local.pathname === '/' : local.pathname.startsWith(to) || (to === '/adega' && local.pathname.startsWith('/vinho'))) ? 'true' : 'false'}>
          <Icone size={16} />
          <span className="flex-1">{rotulo}</span>
          {to === '/alertas' && naoLidos > 0 && <span className="pilula pilula-acento">{naoLidos}</span>}
        </NavLink>
      ))}
      <div className="border-t border-border-subtle mt-3 pt-3 flex flex-col gap-1">
        <button type="button" className="nav-item w-full" onClick={alternarTema}>{escuro ? <Sun size={16} /> : <Moon size={16} />}<span className="flex-1 text-left">{escuro ? 'Modo claro' : 'Modo escuro'}</span></button>
        <NavLink to="/configuracoes" className="nav-item" data-active={local.pathname.startsWith('/configuracoes') ? 'true' : 'false'}><Settings size={16} /><span className="flex-1">Configurações</span></NavLink>
        <button className="nav-item w-full" onClick={() => setSair(true)}><LogOut size={16} /><span className="flex-1 text-left">Sair</span></button>
      </div>
    </nav>
  );

  function encerrarSessao() {
    clearSession();
    navegar('/login', { replace: true });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-bg text-fg md:flex">
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-surface px-3 py-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 pb-5">{marca}</div>
        {nav}
      </aside>

      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-3 border-b border-border bg-surface">
        <button className="nav-item nav-icone" aria-label="Abrir menu" onClick={() => setAberto(true)}><Menu size={18} /></button>
        {marca}
        <span className="ml-auto flex items-center gap-1">
          {naoLidos > 0 && <NavLink to="/alertas" className="pilula pilula-acento h-8 px-3">{naoLidos} alerta{naoLidos > 1 ? 's' : ''}</NavLink>}
          {botaoTema}
        </span>
      </header>

      {aberto && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fadeIn" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-surface border-r border-border px-3 py-4 animate-slideIn">
            <div className="flex items-center justify-between gap-2 pl-2 pb-4">
              {marca}
              <button className="nav-item nav-icone" aria-label="Fechar menu" onClick={() => setAberto(false)}><X size={18} /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="max-w-6xl mx-auto flex items-center gap-2 mb-4" aria-label="Navegação">
          {!noInicio && (
            <button type="button" onClick={voltar} className="nav-item w-auto px-3 text-[13px] border border-border bg-surface" aria-label="Voltar para a tela anterior">
              <ArrowLeft size={15} /><span>Voltar</span>
            </button>
          )}
          <NavLink to="/" className="nav-item w-auto px-3 text-[13px] border border-border bg-surface" data-active={noInicio ? 'true' : 'false'} aria-label="Ir para o Início">
            <Home size={15} /><span>Início</span>
          </NavLink>
        </div>
        <Outlet />
      </main>
      <ConfirmDialog isOpen={sair} onClose={() => setSair(false)} onConfirm={encerrarSessao} title="Sair do Karanu"
        message="Encerrar a sua sessão neste aparelho? Para voltar, entre de novo com o seu e-mail." confirmLabel="Sair" />
    </div>
  );
}
