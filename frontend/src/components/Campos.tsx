import type { TextareaHTMLAttributes } from 'react';

export function AreaTexto({ label, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-medium text-fg-muted">{label}</label>}
      <textarea className={`controle w-full py-2 min-h-[84px] resize-y ${className}`} style={{ height: 'auto' }} {...props} />
    </div>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="cartao p-8 text-center flex flex-col items-center gap-2">
      <p className="font-medium text-fg">{titulo}</p>
      {texto && <p className="text-[13px] text-fg-subtle max-w-md">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
