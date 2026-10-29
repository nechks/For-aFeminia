import { Loader2 } from 'lucide-react'
import RegistrosAula from '@/components/professor/RegistrosAula'
import { useMinhasTurmas } from '@/components/turmas/MinhasTurmas'
import { type TipoRegistroAula } from '@/services/registros-aula'

export default function RegistroAulaPage({ tipo }: { tipo: TipoRegistroAula }) {
  const { turmas, loading } = useMinhasTurmas()

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <RegistrosAula tipo={tipo} turmas={turmas} />
    </div>
  )
}
