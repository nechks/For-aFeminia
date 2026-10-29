import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getMeuHistorico, type HistoricoProfissional } from '@/services/historico-profissional'
import { getErrorMessage } from '@/lib/api/errors'
import { useToast } from '@/hooks/use-toast'
import HistoricoProfissionalView from './HistoricoProfissionalView'

export default function MeuHistorico() {
  const { toast } = useToast()
  const [historico, setHistorico] = useState<HistoricoProfissional | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMeuHistorico()
      .then(setHistorico)
      .catch((err) => toast({ title: 'Erro ao carregar histórico', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!historico) return null
  return <HistoricoProfissionalView historico={historico} />
}
