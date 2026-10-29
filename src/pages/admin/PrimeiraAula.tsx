import { useCallback, useEffect, useState } from 'react'
import {
  definirDataPrimeiraAula,
  getAguardandoPrimeiraAula,
  type AguardandoPrimeiraAula,
} from '@/services/ficha-inscricao'
import { getErrorMessage } from '@/lib/api/errors'
import { turmaLabels } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR')

/**
 * Fila do fluxo pós-ficha de confirmação: quem já entregou a ficha e ainda espera a data da aula
 * inaugural. Salvar a data avisa a aluna na hora e tira o registro da fila.
 */
export default function PrimeiraAula() {
  const [fila, setFila] = useState<AguardandoPrimeiraAula[]>([])
  const [datas, setDatas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setFila(await getAguardandoPrimeiraAula())
    } catch (e) {
      toast({
        title: 'Erro ao carregar a fila',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvar = async (item: AguardandoPrimeiraAula) => {
    const data = datas[item.inscricao_id]
    if (!data) return
    setSalvando(item.inscricao_id)
    try {
      await definirDataPrimeiraAula(item.inscricao_id, data)
      toast({
        title: '📅 Data enviada para a aluna!',
        description: `${item.nome_completo} foi avisada da aula inaugural.`,
      })
      await carregar()
    } catch (e) {
      toast({
        title: 'Não foi possível salvar a data',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <CalendarCheck className="h-7 w-7 text-primary" />
          Fichas aguardando a 1ª aula
        </h1>
        <p className="text-muted-foreground">
          Alunas que enviaram a ficha de confirmação e ainda não sabem quando começam. Ao salvar a
          data, o aviso é enviado para a aluna imediatamente.
        </p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : fila.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            🎉 Nenhuma ficha esperando. Todas as alunas já sabem a data da aula inaugural.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fila.map((item) => (
            <Card key={item.inscricao_id}>
              <CardHeader>
                <CardTitle>{item.nome_completo}</CardTitle>
                <CardDescription>
                  {item.nucleo_nome ?? turmaLabels[item.nucleo_codigo ?? ''] ?? '—'}
                  {item.telefone ? ` · ${item.telefone}` : ''} · ficha enviada em{' '}
                  {dataHora(item.ficha_enviada_em)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label
                    className="text-sm font-medium"
                    htmlFor={`data-${item.inscricao_id}`}
                  >
                    Data da primeira aula
                  </label>
                  <Input
                    id={`data-${item.inscricao_id}`}
                    type="date"
                    value={datas[item.inscricao_id] ?? ''}
                    onChange={(e) =>
                      setDatas((atual) => ({ ...atual, [item.inscricao_id]: e.target.value }))
                    }
                  />
                </div>
                <Button
                  onClick={() => salvar(item)}
                  disabled={!datas[item.inscricao_id] || salvando === item.inscricao_id}
                >
                  {salvando === item.inscricao_id ? 'Enviando...' : 'Salvar e avisar a aluna'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
