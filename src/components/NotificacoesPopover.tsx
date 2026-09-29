import { useCallback, useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import {
  getNotificacoes,
  marcarNotificacaoLida,
  type Notificacao,
} from '@/services/notificacoes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR')

/**
 * Avisos internos da pessoa logada: é por aqui que a aluna recebe a mensagem automática da ficha e
 * a data da aula inaugural, e que a gestão vê a fila de fichas aguardando definição da 1ª aula.
 */
export default function NotificacoesPopover() {
  const [avisos, setAvisos] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(false)
  const [aberto, setAberto] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setAvisos(await getNotificacoes())
    } catch {
      // Um aviso que não carregou não pode quebrar o cabeçalho: a lista fica como está.
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const naoLidas = avisos.filter((a) => !a.lida).length

  const abrir = (proximo: boolean) => {
    setAberto(proximo)
    if (proximo) carregar()
  }

  const marcar = async (aviso: Notificacao) => {
    if (aviso.lida) return
    try {
      const atualizado = await marcarNotificacaoLida(aviso.id)
      setAvisos((atual) => atual.map((a) => (a.id === atualizado.id ? atualizado : a)))
    } catch {
      // Sem efeito visível: o aviso continua marcado como não lido.
    }
  }

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-muted-foreground"
          aria-label={naoLidas ? `${naoLidas} avisos não lidos` : 'Avisos'}
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="font-semibold">Avisos</p>
          <p className="text-xs text-muted-foreground">
            {naoLidas ? `${naoLidas} não lido(s)` : 'Tudo em dia'}
          </p>
        </div>
        <ScrollArea className="max-h-80">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : avisos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum aviso por enquanto.
            </p>
          ) : (
            <ul className="divide-y">
              {avisos.map((aviso) => (
                <li key={aviso.id}>
                  <button
                    type="button"
                    onClick={() => marcar(aviso)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      !aviso.lida && 'bg-primary/5',
                    )}
                  >
                    <p className="flex items-start gap-2 text-sm font-medium">
                      {!aviso.lida && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      {aviso.titulo}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{aviso.mensagem}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{quando(aviso.created)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
