import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/Toast';

type Avisar = (tipo: 'success' | 'error' | 'info', mensagem: string) => void;
const Ctx = createContext<Avisar>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, addToast, removeToast } = useToast();
  return (
    <Ctx.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAviso() { return useContext(Ctx); }
