import Badge from './ui/Badge';
import { STATUS_INFO } from '../lib/api';
import type { StatusJanela } from '../lib/api';

export default function StatusBadge({ status }: { status?: string | null }) {
  const info = STATUS_INFO[(status || 'SEM_JANELA') as StatusJanela] ?? STATUS_INFO.SEM_JANELA;
  return <Badge variant={info.variante} dot>{info.rotulo}</Badge>;
}
