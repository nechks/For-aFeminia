import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Selo do Força Feminina — Defesa Pessoal. Recortado da arte oficial, com fundo transparente. */
export default function Logo({ className }: { className?: string }) {
  const [falhou, setFalhou] = useState(false)

  if (falhou) {
    return (
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-red-700',
          className,
        )}
        role="img"
        aria-label="Força Feminina — Defesa Pessoal"
      >
        <ShieldCheck className="h-2/3 w-2/3" />
      </span>
    )
  }

  return (
    <img
      src="/logo-forca.png?v=20261006"
      alt="Força Feminina — Defesa Pessoal"
      className={cn('h-8 w-8 shrink-0 select-none', className)}
      draggable={false}
      onError={() => setFalhou(true)}
    />
  )
}
