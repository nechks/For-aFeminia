import { cn } from '@/lib/utils'

/** Selo do Força Feminina — Defesa Pessoal. Recortado da arte oficial, com fundo transparente. */
export default function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo-forca.png"
      alt="Força Feminina — Defesa Pessoal"
      className={cn('h-8 w-8 shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
