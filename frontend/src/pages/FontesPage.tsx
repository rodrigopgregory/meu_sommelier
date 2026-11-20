import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { SkeletonListItems } from '../components/ui/Skeleton';
import { AreaTexto, Vazio } from '../components/Campos';
import { useAviso } from '../components/ToastContext';
import { callRows, callSF } from '../lib/api';
import { SF } from '../lib/sf';

interface Fonte { ID: number; NOME: string; CATEGORIA: string; URL: string | null; CONDICOES: string | null; AVALIACOES: number }
const CATEGORIAS = [{ value: 'PROFISSIONAL', label: 'Profissional (críticos)' }, { value: 'COMUNIDADE', label: 'Comunidade' }, { value: 'OUTRA', label: 'Outra' }];
const ROTULO_CAT: Record<string, string> = { PROFISSIONAL: 'Profissional', COMUNIDADE: 'Comunidade', OUTRA: 'Outra' };

export default function FontesPage() {
  const [itens, setItens] = useState<Fonte[] | null>(null);
  const [erro, setErro] = useState('');
  const [editar, setEditar] = useState<Partial<Fonte> | null>(null);
  const [excluir, setExcluir] = useState<Fonte | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const avisar = useAviso();

  const carregar = useCallback(async () => {
    try { setItens(await callRows<Fonte>(SF.fontesListar)); setErro(''); }
    catch (e) { setErro((e as Error).message); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try { await callSF(SF.fonteExcluir, { id: excluir.ID }); avisar('success', 'Fonte excluída.'); setExcluir(null); carregar(); }
    catch (e) { avisar('error', (e as Error).message); }
    finally { setExcluindo(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader titulo="Fontes" descricao="Sites e publicações que você consulta. O app não acessa esses sites: as avaliações são registradas à mão na ficha do vinho."
        acoes={<Button onClick={() => setEditar({ ID: 0, CATEGORIA: 'PROFISSIONAL' })}><Plus size={16} />Nova fonte</Button>} />
      {erro && <Vazio titulo="Não foi possível carregar as fontes." texto={erro} acao={<Button variant="secondary" onClick={carregar}>Tentar de novo</Button>} />}
      {!itens && !erro && <SkeletonListItems count={3} />}
      {itens && itens.length === 0 && <Vazio titulo="Nenhuma fonte cadastrada." texto="Não é obrigatório: dá para registrar avaliações externas sem fonte." />}
      <ul className="flex flex-col gap-3">
        {itens?.map(f => (
          <li key={f.ID} className="cartao p-4 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-fg">{f.NOME}</span><Badge variant="neutral">{ROTULO_CAT[f.CATEGORIA] ?? f.CATEGORIA}</Badge></div>
              {f.CONDICOES && <p className="text-[12.5px] text-fg-subtle mt-1 break-words">{f.CONDICOES}</p>}
              <p className="text-[12px] text-fg-subtle mt-1">{Number(f.AVALIACOES)} avaliação(ões) registrada(s)</p>
            </div>
            {f.URL && <a href={f.URL} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="secondary"><ExternalLink size={14} />Abrir site</Button></a>}
            <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => setEditar(f)}><Pencil size={14} /></Button>
            <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => setExcluir(f)}><Trash2 size={14} /></Button>
          </li>
        ))}
      </ul>
      {editar && <EditarFonte fonte={editar} onClose={() => setEditar(null)} onSalvo={() => { setEditar(null); carregar(); }} />}
      <ConfirmDialog isOpen={!!excluir} onClose={() => setExcluir(null)} onConfirm={confirmarExclusao} loading={excluindo} title="Excluir fonte"
        message={excluir ? `Excluir a fonte ${excluir.NOME}?${Number(excluir.AVALIACOES) > 0 ? ` As ${Number(excluir.AVALIACOES)} avaliação(ões) que usam esta fonte continuam na ficha, com o nome e o link originais.` : ''}` : ''} />
    </div>
  );
}

function EditarFonte({ fonte, onClose, onSalvo }: { fonte: Partial<Fonte>; onClose: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(fonte.NOME ?? '');
  const [categoria, setCategoria] = useState(fonte.CATEGORIA ?? 'PROFISSIONAL');
  const [url, setUrl] = useState(fonte.URL ?? '');
  const [condicoes, setCondicoes] = useState(fonte.CONDICOES ?? '');
  const [erro, setErro] = useState<{ nome?: string; url?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();

  async function salvar() {
    const e: typeof erro = {};
    if (!nome.trim()) e.nome = 'Informe o nome.';
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) e.url = 'O link começa com http:// ou https://.';
    setErro(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    try { await callSF(SF.fonteSalvar, { id: fonte.ID ?? 0, nome: nome.trim(), categoria, url: url.trim(), condicoes }); avisar('success', 'Fonte salva.'); onSalvo(); }
    catch (err) { avisar('error', (err as Error).message); }
    finally { setSalvando(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title={fonte.ID ? 'Editar fonte' : 'Nova fonte'} size="md">
      <div className="flex flex-col gap-4">
        <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} error={erro.nome} maxLength={120} autoFocus />
        <div className="flex flex-col gap-1.5"><label className="text-[13px] font-medium text-fg-muted">Categoria</label><Select value={categoria} onChange={setCategoria} options={CATEGORIAS} /></div>
        <Input label="Link" value={url} onChange={e => setUrl(e.target.value)} error={erro.url} placeholder="https://" maxLength={500} />
        <AreaTexto label="Condições de uso (opcional)" value={condicoes} onChange={e => setCondicoes(e.target.value)} maxLength={1000} />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
