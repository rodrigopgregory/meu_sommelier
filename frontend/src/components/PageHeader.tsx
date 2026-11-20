import type { ReactNode } from 'react';

export default function PageHeader({ titulo, descricao, acoes }: { titulo: ReactNode; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="titulo-rotulo text-[24px] md:text-[26px] leading-tight text-fg">{titulo}</h1>
        {descricao && <p className="text-[13px] text-fg-subtle mt-1">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
