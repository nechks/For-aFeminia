import AlunasDoProfissional from '@/components/profissional/AlunasDoProfissional'
import { UsersRound } from 'lucide-react'

/** Página "Alunas" do menu lateral: consulta das alunas das turmas em que o profissional atua. */
export default function AlunasPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <UsersRound className="h-7 w-7 text-primary" /> Alunas
      </h1>
      <AlunasDoProfissional />
    </div>
  )
}
