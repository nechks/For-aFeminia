import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { buscarProfissoes, type ProfissaoCbo } from '@/services/profissoes'

interface ProfissaoAutocompleteProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const formatarCodigo = (codigo: string) =>
  codigo.length === 6 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo

export function ProfissaoAutocomplete({
  value,
  onChange,
  disabled,
  placeholder = 'Digite pelo menos 2 letras para buscar...',
}: ProfissaoAutocompleteProps) {
  const [resultados, setResultados] = useState<ProfissaoCbo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const termo = value.trim()
    if (termo.length < 2 || /^\d{4}-?\d{2}\s+-\s+/.test(termo)) {
      setResultados([])
      setAberto(false)
      return
    }
    const timer = window.setTimeout(async () => {
      setBuscando(true)
      try {
        const lista = await buscarProfissoes(termo)
        setResultados(lista)
        setAberto(true)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        onBlur={() => window.setTimeout(() => setAberto(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-11 pl-9 pr-9"
        autoComplete="off"
      />
      {buscando && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {aberto && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
          {resultados.length > 0 ? (
            resultados.map((profissao) => (
              <button
                key={profissao.codigo}
                type="button"
                className="flex w-full items-start gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(`${formatarCodigo(profissao.codigo)} - ${profissao.titulo}`)
                  setAberto(false)
                }}
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatarCodigo(profissao.codigo)}
                </span>
                <span>{profissao.titulo}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma profissão encontrada.</p>
          )}
        </div>
      )}
    </div>
  )
}
