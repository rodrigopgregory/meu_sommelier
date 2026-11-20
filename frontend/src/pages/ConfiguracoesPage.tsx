import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Download, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAviso } from '../components/ToastContext';
import { callRows, callSF, dataBR } from '../lib/api';
import { exportarTudo } from '../lib/exportar';
import { clearSession } from '../lib/mitra-auth';
import { salvarTema, temaSalvo } from '../lib/tema';
import type { Tema } from '../lib/tema';
import { estiloSalvo, salvarEstilo } from '../lib/estilo';
import type { Estilo } from '../lib/estilo';
import { LOGO_ARQUIVO, logoSalvo, salvarLogo } from '../lib/logo';
import type { Logo } from '../lib/logo';
import { SF } from '../lib/sf';
import { carregarPreferencias, salvarPreferencias, PADRAO } from '../lib/preferencias';
import type { Preferencias } from '../lib/preferencias';

const PAISES = ['Brasil', 'Portugal', 'Argentina', 'Chile', 'Uruguai', 'Estados Unidos', 'Canadá', 'França', 'Itália', 'Espanha', 'Alemanha', 'Reino Unido', 'Outro'];

function Opcoes<T extends string | number>({ rotulo, valor, opcoes, onEscolher }: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string; texto: string }[]; onEscolher: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg-muted">{rotulo}</span>
      <div className={`grid grid-cols-1 gap-3 ${opcoes.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} role="radiogroup" aria-label={rotulo}>
        {opcoes.map(o => (
          <button key={String(o.valor)} type="button" role="radio" aria-checked={valor === o.valor} data-active={valor === o.valor ? 'true' : 'false'}
            className="opcao-tema" onClick={() => onEscolher(o.valor)}>
            <span className="text-[14px] font-medium text-fg">{o.rotulo}</span>
            <span className="text-[12.5px] text-fg-subtle">{o.texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TEMAS: { valor: Tema; rotulo: string; texto: string; icone: typeof Moon }[] = [
  { valor: 'escuro', rotulo: 'Escuro', texto: 'Padrão do app, confortável à noite e na adega.', icone: Moon },
  { valor: 'claro', rotulo: 'Claro', texto: 'Fundo claro, bom para ambientes iluminados.', icone: Sun },
  { valor: 'sistema', rotulo: 'Como o aparelho', texto: 'Segue o modo claro ou escuro do celular ou computador.', icone: Monitor },
];

const LOGOS: { valor: Exclude<Logo, 'automatico'>; rotulo: string }[] = [
  { valor: 'a-azul', rotulo: 'Ânfora azul' },
  { valor: 'b-azul', rotulo: 'Sinal azul' },
  { valor: 'a-bordo', rotulo: 'Ânfora bordô' },
  { valor: 'b-bordo', rotulo: 'Sinal bordô' },
];

const ESTILOS: { valor: Estilo; rotulo: string; texto: string }[] = [
  { valor: 'classico', rotulo: 'Clássico', texto: 'Tons de vinho e dourado, títulos com serifa.' },
  { valor: 'karanu-azul', rotulo: 'Karanu Azul', texto: 'Azul-noite, argila e creme, da marca Karanu.' },
  { valor: 'karanu-bordo', rotulo: 'Karanu Bordô', texto: 'Bordô, argila e creme, da marca Karanu.' },
];

type PacoteInfo = { ok: boolean; geradoEm?: string; versaoApp?: string | null };
type PacoteGerado = { ok: boolean; aviso?: string; nomeArquivo?: string; base64?: string; url?: string; dadosGeradosEm?: string; codigoGeradoEm?: string | null; avisos?: number };
const horaBR = (iso?: string | null) => dataBR(iso) + ' às ' + String(iso || '').slice(11, 16);
const VERSAO_APP = String(import.meta.env.VITE_APP_VERSAO || '');

export default function ConfiguracoesPage() {
  const [tema, setTema] = useState<Tema>(temaSalvo());
  const [estilo, setEstilo] = useState<Estilo>(estiloSalvo());
  const [logo, setLogo] = useState<Logo>(logoSalvo());
  const [nome, setNome] = useState('');
  const [nomeOriginal, setNomeOriginal] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [pacoteInfo, setPacoteInfo] = useState<PacoteInfo | null>(null);
  const [pacoteAberto, setPacoteAberto] = useState(false);
  const [emailCodigo, setEmailCodigo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pedindoCodigo, setPedindoCodigo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [avisoPacote, setAvisoPacote] = useState('');
  const [ultimoGerado, setUltimoGerado] = useState<PacoteGerado | null>(null);
  const [apagarConversa, setApagarConversa] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [sair, setSair] = useState(false);
  const [pref, setPref] = useState<Preferencias>(PADRAO);
  const avisar = useAviso();
  const navegar = useNavigate();

  useEffect(() => { carregarPreferencias().then(setPref); }, []);

  useEffect(() => {
    callSF<PacoteInfo>(SF.pacoteLink, { soInfo: true }).then(r => { if (r?.ok) setPacoteInfo(r); }).catch(() => {});
  }, []);

  async function mudarPreferencia(p: Preferencias) {
    const antes = pref;
    setPref(p);
    try { await salvarPreferencias(p); avisar('success', 'Preferência salva.'); }
    catch (e) { setPref(antes); avisar('error', (e as Error).message); }
  }

  useEffect(() => {
    callRows<{ ADEGA: string }>(SF.inicioResumo).then(r => {
      const n = String(r[0]?.ADEGA || 'Minha adega');
      setNome(n); setNomeOriginal(n);
    }).catch(() => {});
  }, []);

  function escolherTema(t: Tema) { setTema(t); salvarTema(t); }

  async function salvarNome() {
    const n = nome.trim();
    if (!n) { avisar('error', 'Escreva um nome para a adega.'); return; }
    setSalvandoNome(true);
    try {
      await callSF(SF.adegaRenomear, { nome: n });
      setNome(n); setNomeOriginal(n);
      avisar('success', 'Nome da adega salvo.');
    } catch (e) { avisar('error', (e as Error).message); }
    finally { setSalvandoNome(false); }
  }

  async function exportar() {
    setExportando(true);
    try { await exportarTudo(); avisar('success', 'Planilha baixada.'); }
    catch (e) { avisar('error', (e as Error).message); }
    finally { setExportando(false); }
  }

  function abrirPacote() {
    setPacoteAberto(true); setEmailCodigo(''); setCodigo(''); setAvisoPacote('');
  }

  async function pedirCodigo() {
    setPedindoCodigo(true); setAvisoPacote('');
    try {
      const r = await callSF<{ ok: boolean; email?: string; aviso?: string; semCodigo?: boolean }>(SF.pacoteCodigoPedir);
      if (!r.ok) { setAvisoPacote(r.aviso || 'Não foi possível enviar o código.'); return; }
      if (r.semCodigo) { setPedindoCodigo(false); await gerarPacote(''); return; }
      setEmailCodigo(r.email || 'seu e-mail'); setCodigo('');
    } catch (e) { setAvisoPacote((e as Error).message); }
    finally { setPedindoCodigo(false); }
  }

  async function gerarPacote(cod: string = codigo) {
    setGerando(true); setAvisoPacote('');
    try {
      const r = await callSF<PacoteGerado>(SF.pacoteGerar, { codigo: cod, versaoApp: VERSAO_APP });
      if (!r.ok) { setAvisoPacote(r.aviso || 'Não foi possível gerar o pacote.'); return; }
      if (r.base64) {
        const bin = atob(r.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
        const a = document.createElement('a');
        a.href = url; a.download = r.nomeArquivo || 'pacote.zip';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else if (r.url) window.open(r.url, '_blank', 'noopener');
      setUltimoGerado({ ok: true, dadosGeradosEm: r.dadosGeradosEm, codigoGeradoEm: r.codigoGeradoEm, avisos: r.avisos });
      setPacoteAberto(false);
      avisar('success', 'Pacote gerado agora e baixando.');
    } catch (e) { setAvisoPacote((e as Error).message); }
    finally { setGerando(false); }
  }

  async function confirmarApagarConversa() {
    setApagando(true);
    try { await callSF(SF.sommelierApagar); avisar('success', 'Conversa com o sommelier apagada.'); setApagarConversa(false); }
    catch (e) { avisar('error', (e as Error).message); }
    finally { setApagando(false); }
  }

  function encerrarSessao() {
    clearSession();
    navegar('/login', { replace: true });
    window.location.reload();
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <PageHeader titulo="Configurações" descricao="Aparência do app, a sua adega e os seus dados." />

      <Card>
        <CardHeader><CardTitle>Aparência</CardTitle></CardHeader>
        <CardContent className="gap-5">
          <Opcoes rotulo="Estilo" valor={estilo} onEscolher={v => { setEstilo(v); salvarEstilo(v); }} opcoes={ESTILOS} />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-muted">Logo</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" role="radiogroup" aria-label="Logo do app">
              <button type="button" role="radio" aria-checked={logo === 'automatico'} data-active={logo === 'automatico' ? 'true' : 'false'}
                className="opcao-tema items-center justify-center text-center" onClick={() => { setLogo('automatico'); salvarLogo('automatico'); }}>
                <span className="text-[14px] font-medium text-fg">Automático</span>
                <span className="text-[12.5px] text-fg-subtle">Segue o estilo</span>
              </button>
              {LOGOS.map(o => (
                <button key={o.valor} type="button" role="radio" aria-checked={logo === o.valor} data-active={logo === o.valor ? 'true' : 'false'}
                  className="opcao-tema items-center text-center" onClick={() => { setLogo(o.valor); salvarLogo(o.valor); }}>
                  <img className="logo-opcao" src={LOGO_ARQUIVO[o.valor]} alt="" aria-hidden="true" />
                  <span className="text-[13px] font-medium text-fg">{o.rotulo}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-fg-muted">Modo</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Modo claro ou escuro">
            {TEMAS.map(({ valor, rotulo, texto, icone: Icone }) => (
              <button key={valor} type="button" role="radio" aria-checked={tema === valor} data-active={tema === valor ? 'true' : 'false'}
                className="opcao-tema" onClick={() => escolherTema(valor)}>
                <span className="flex items-center gap-2 text-[14px] font-medium text-fg"><Icone size={16} />{rotulo}</span>
                <span className="text-[12.5px] text-fg-subtle">{texto}</span>
              </button>
            ))}
          </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preferências</CardTitle></CardHeader>
        <CardContent className="gap-5">
          <Opcoes rotulo="Temperatura" valor={pref.temperatura} onEscolher={v => mudarPreferencia({ ...pref, temperatura: v })} opcoes={[
            { valor: 'C', rotulo: 'Celsius (°C)', texto: 'Ex.: servir entre 16 e 18 °C.' },
            { valor: 'F', rotulo: 'Fahrenheit (°F)', texto: 'Ex.: servir entre 61 e 64 °F.' },
          ]} />
          <Opcoes rotulo="Escala de nota" valor={pref.escala} onEscolher={v => mudarPreferencia({ ...pref, escala: v })} opcoes={[
            { valor: 100, rotulo: '0 a 100', texto: 'Como os críticos (ex.: 94).' },
            { valor: 5, rotulo: '0 a 5', texto: 'Como as estrelas da comunidade (ex.: 4,7).' },
          ]} />
          <p className="text-[12.5px] text-fg-subtle">As notas ficam guardadas de 0 a 100 e são convertidas na hora de mostrar: 4,7 de 5 aparece como 94 de 100, e o contrário. Nada do que você já registrou muda.</p>
          <div className="flex flex-col gap-1.5 max-w-sm">
            <label className="text-[13px] font-medium text-fg-muted">País onde você mora</label>
            <Select value={pref.pais} onChange={v => mudarPreferencia({ ...pref, pais: v })} options={(PAISES.includes(pref.pais) ? PAISES : [pref.pais, ...PAISES]).map(p => ({ value: p, label: p }))} />
            <p className="text-[12.5px] text-fg-subtle">O sommelier leva em conta o clima e os vinhos que se encontram para comprar no seu país.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Minha adega</CardTitle></CardHeader>
        <CardContent className="gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><Input label="Nome da adega" value={nome} maxLength={120} onChange={e => setNome(e.target.value)} /></div>
            <Button onClick={salvarNome} disabled={salvandoNome || nome.trim() === nomeOriginal}>{salvandoNome ? 'Salvando...' : 'Salvar nome'}</Button>
          </div>
          <p className="text-[12.5px] text-fg-subtle">O nome aparece no alto do Início.</p>
          <Link to="/fontes" className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 hover:bg-surface-hover">
            <BookOpen size={16} className="text-primary shrink-0" />
            <span className="flex-1"><span className="block text-[14px] text-fg">Fontes de avaliação</span><span className="block text-[12.5px] text-fg-subtle">Sites e publicações que você usa para registrar notas.</span></span>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sommelier</CardTitle></CardHeader>
        <CardContent className="gap-3">
          <p className="text-[13px] text-fg-muted">A conversa fica guardada para o sommelier lembrar do contexto. Apagar a conversa não muda a sua adega nem as instruções de "Como servir".</p>
          <div><Button variant="secondary" onClick={() => setApagarConversa(true)}><Trash2 size={15} />Apagar conversa</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Meus dados</CardTitle></CardHeader>
        <CardContent className="gap-3">
          <p className="text-[13px] text-fg-muted">Baixa uma planilha com os vinhos, as safras, o histórico de garrafas, as avaliações, as fontes e os alertas.</p>
          <div><Button variant="secondary" onClick={exportar} disabled={exportando}><Download size={15} />{exportando ? 'Gerando...' : 'Exportar tudo'}</Button></div>
          <p className="text-[13px] text-fg-muted">O pacote completo do app traz o código, o histórico de versões, o banco pronto para MySQL (estrutura e dados, também em CSV), as fotos dos rótulos, as Server Functions, as dependências do Mitra e os acessos, para levar o app a outro lugar. Chaves e senhas não vêm: cadastre de novo no destino.</p>
          <div><Button variant="secondary" onClick={abrirPacote}><Download size={15} />Baixar pacote completo do app</Button></div>
          <p className="text-[13px] text-fg-muted">O banco, os dados, as fotos e os usuários são gerados na hora do clique. Só o dono do app pode gerar, com um código enviado para o e-mail dele. O pacote traz os dados de todas as contas.</p>
          {ultimoGerado?.dadosGeradosEm && (
            <p className="text-[13px] text-fg-muted">Último pacote desta sessão: dados gerados em {horaBR(ultimoGerado.dadosGeradosEm)}.</p>
          )}
          {pacoteInfo?.geradoEm && (
            <p className="text-[13px] text-fg-muted">Código, histórico e funções do pacote gerados em {horaBR(pacoteInfo.geradoEm)}.</p>
          )}
          {pacoteInfo?.geradoEm && VERSAO_APP && pacoteInfo.versaoApp && pacoteInfo.versaoApp !== VERSAO_APP && (
            <p className="text-[13px] text-warning-text">O app foi publicado de novo depois da parte de código do pacote: os dados vêm atualizados, mas o código e as funções podem não ter as mudanças mais recentes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conta</CardTitle></CardHeader>
        <CardContent className="gap-3">
          <p className="text-[13px] text-fg-muted">Encerra a sessão neste aparelho. A adega continua guardada.</p>
          <div><Button variant="secondary" onClick={() => setSair(true)}><LogOut size={15} />Sair</Button></div>
        </CardContent>
      </Card>

      <Modal isOpen={pacoteAberto} onClose={() => setPacoteAberto(false)} title="Gerar pacote completo agora" size="sm">
        <div className="flex flex-col gap-3">
          {!emailCodigo ? (
            <>
              <p className="text-[13px] text-fg-muted">Para proteger os seus dados, o dono do app recebe um código de 6 números por e-mail, que vale 10 minutos e só uma vez. Na conta de desenvolvimento, o pacote é gerado direto.</p>
              <div><Button onClick={pedirCodigo} disabled={pedindoCodigo || gerando}>{pedindoCodigo || gerando ? 'Preparando...' : 'Continuar'}</Button></div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-fg-muted">Enviamos o código para {emailCodigo}. Digite abaixo.</p>
              <Input label="Código do e-mail" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => { if (e.key === 'Enter' && codigo.length === 6 && !gerando) gerarPacote(codigo); }} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => gerarPacote(codigo)} disabled={gerando || codigo.length !== 6}><Download size={15} />{gerando ? 'Gerando o pacote...' : 'Gerar e baixar'}</Button>
                <Button variant="secondary" onClick={pedirCodigo} disabled={pedindoCodigo || gerando}>{pedindoCodigo ? 'Enviando...' : 'Enviar outro código'}</Button>
              </div>
            </>
          )}
          {avisoPacote && <p className="text-[13px] text-danger-text" role="alert">{avisoPacote}</p>}
        </div>
      </Modal>

      <ConfirmDialog isOpen={apagarConversa} onClose={() => setApagarConversa(false)} onConfirm={confirmarApagarConversa} loading={apagando}
        title="Apagar conversa" confirmLabel="Apagar" message="Apagar todo o histórico de conversa com o sommelier? A sua adega não muda." />
      <ConfirmDialog isOpen={sair} onClose={() => setSair(false)} onConfirm={encerrarSessao} title="Sair do Karanu"
        message="Encerrar a sua sessão neste aparelho? Para voltar, entre de novo com o seu e-mail." confirmLabel="Sair" />
    </div>
  );
}
