import { useState } from 'react';
import { Wine } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { callSF, hojeISO, notificarAlertas } from '../lib/api';
import { SF } from '../lib/sf';
import { useAviso } from './ToastContext';

export interface GarrafaParaBeber { safraId: number; nome: string; ano: number; estoque: number }

export default function BeberLogoDialog({ garrafa, onClose, onFeito }: { garrafa: GarrafaParaBeber | null; onClose: () => void; onFeito: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();
  if (!garrafa) return null;

  async function confirmar() {
    if (!garrafa) return;
    if (garrafa.estoque < 1) { avisar('error', 'Esta safra não tem garrafas.'); return; }
    setSalvando(true);
    try {
      await callSF(SF.movimentar, { safraId: garrafa.safraId, tipo: 'S', quantidade: 1, motivo: 'beber logo', data: hojeISO() });
      avisar('success', `Baixa de 1 garrafa: ${garrafa.nome} ${garrafa.ano}.`);
      notificarAlertas();
      onFeito();
      onClose();
    } catch (e) {
      avisar('error', (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Beber logo" size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-soft text-primary shrink-0"><Wine size={18} /></div>
          <p className="text-[13.5px] text-fg-muted">
            Registrar a baixa de <b className="text-fg">1 garrafa</b> de {garrafa.nome} {garrafa.ano}? Ficam {garrafa.estoque - 1} garrafa{garrafa.estoque - 1 === 1 ? '' : 's'} desta safra.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button className="flex-1" onClick={confirmar} disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar baixa'}</Button>
        </div>
      </div>
    </Modal>
  );
}
