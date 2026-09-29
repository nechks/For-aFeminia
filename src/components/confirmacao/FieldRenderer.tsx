import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FormField } from '@/lib/confirmacao-fields'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Baby, Plus, Trash2 } from 'lucide-react'

interface FieldRendererProps {
  field: FormField
  value: any
  onChange: (value: any) => void
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const [novoItem, setNovoItem] = useState('')
  const labelClass = cn(
    'text-sm font-medium',
    field.required && "after:content-['*'] after:ml-0.5 after:text-red-500",
  )

  // Profissão é texto livre: a busca na Classificação Brasileira de Ocupações foi retirada por
  // dificultar o preenchimento — quem responde nem sempre reconhece o próprio trabalho na lista.
  if (field.type === 'profession') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.readonly}
          placeholder="Ex.: costureira, diarista, vendedora"
        />
      </div>
    )
  }

  if (field.type === 'children') {
    const criancas: { nome: string; idade: string | number }[] = Array.isArray(value) ? value : []
    const atualizar = (indice: number, chave: 'nome' | 'idade', novoValor: string) =>
      onChange(
        criancas.map((crianca, atual) =>
          atual === indice ? { ...crianca, [chave]: novoValor } : crianca,
        ),
      )
    const adicionar = () => onChange([...criancas, { nome: '', idade: '' }])
    const remover = (indice: number) => onChange(criancas.filter((_, atual) => atual !== indice))

    return (
      <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className={`${labelClass} flex items-center gap-2`}>
              <Baby className="h-4 w-4 text-violet-600" /> {field.label}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Informe o nome e a idade de cada criança que será levada.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={adicionar}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar criança
          </Button>
        </div>
        {criancas.map((crianca, indice) => (
          <div
            key={indice}
            className="grid grid-cols-1 items-end gap-3 rounded-md border bg-background p-3 sm:grid-cols-[1fr_120px_auto]"
          >
            <div className="space-y-2">
              <Label>Nome da criança *</Label>
              <Input
                value={crianca.nome ?? ''}
                onChange={(e) => atualizar(indice, 'nome', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Idade *</Label>
              <Input
                type="number"
                min={0}
                max={17}
                value={crianca.idade ?? ''}
                onChange={(e) => atualizar(indice, 'idade', e.target.value)}
                placeholder="Idade"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => remover(indice)}
              aria-label={`Remover criança ${indice + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  // Valor derivado de outros campos (renda per capita e a faixa dela). A usuária confere, mas não
  // digita — quem calcula é a página, que enxerga os campos irmãos.
  if (field.type === 'computed') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
          {value ? String(value) : '—'}
        </div>
        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <Input
          type="number"
          inputMode="decimal"
          min={field.min}
          step={field.step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.readonly}
        />
        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      </div>
    )
  }

  // Bens da família: cada item marcado carrega a quantidade que a família tem.
  if (field.type === 'multi-select-qtd') {
    const itens: { item: string; quantidade: number }[] = Array.isArray(value)
      ? value.map((registro: any) =>
          typeof registro === 'string'
            ? { item: registro, quantidade: 1 }
            : { item: String(registro?.item ?? ''), quantidade: Number(registro?.quantidade) || 1 },
        )
      : []
    const opcoes = Array.from(new Set([...(field.options ?? []), ...itens.map((i) => i.item)]))
    const quantidadeDe = (item: string) => itens.find((i) => i.item === item)?.quantidade
    const alternarItem = (item: string, marcado: boolean) =>
      onChange(
        marcado
          ? [...itens, { item, quantidade: 1 }]
          : itens.filter((atual) => atual.item !== item),
      )
    const mudarQuantidade = (item: string, quantidade: string) =>
      onChange(
        itens.map((atual) =>
          atual.item === item
            ? { ...atual, quantidade: Math.max(1, Number(quantidade) || 1) }
            : atual,
        ),
      )
    const adicionarItem = () => {
      const item = novoItem.trim()
      if (!item) return
      if (!itens.some((atual) => atual.item.toLocaleLowerCase() === item.toLocaleLowerCase())) {
        onChange([...itens, { item, quantidade: 1 }])
      }
      setNovoItem('')
    }
    return (
      <div className="space-y-3">
        <Label className={labelClass}>{field.label}</Label>
        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {opcoes.map((item) => {
            const marcado = itens.some((atual) => atual.item === item)
            return (
              <div
                key={item}
                className={cn(
                  'flex items-center gap-2 rounded-md border p-3 text-sm',
                  marcado && 'border-primary bg-primary/5',
                )}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={marcado}
                    onCheckedChange={(checked) => alternarItem(item, checked === true)}
                  />
                  <span>{item}</span>
                </label>
                {marcado && (
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    aria-label={`Quantidade de ${item}`}
                    className="h-8 w-20"
                    value={quantidadeDe(item) ?? 1}
                    onChange={(e) => mudarQuantidade(item, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarItem()
              }
            }}
            placeholder={field.placeholder}
          />
          <Button
            type="button"
            variant="outline"
            onClick={adicionarItem}
            disabled={!novoItem.trim()}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar item
          </Button>
        </div>
      </div>
    )
  }

  if (field.type === 'multi-select-add') {
    const selecionados: string[] = Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim()
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : []
    const opcoes = Array.from(new Set([...(field.options ?? []), ...selecionados]))
    const alternarItem = (item: string, marcado: boolean) =>
      onChange(marcado ? [...selecionados, item] : selecionados.filter((atual) => atual !== item))
    const adicionarItem = () => {
      const item = novoItem.trim()
      if (!item) return
      if (!selecionados.some((atual) => atual.toLocaleLowerCase() === item.toLocaleLowerCase())) {
        onChange([...selecionados, item])
      }
      setNovoItem('')
    }
    return (
      <div className="space-y-3">
        <Label className={labelClass}>{field.label}</Label>
        <p className="text-xs text-muted-foreground">
          Selecione todos os bens que a família possui.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {opcoes.map((item) => {
            const marcado = selecionados.includes(item)
            return (
              <label
                key={item}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm',
                  marcado && 'border-primary bg-primary/5',
                )}
              >
                <Checkbox
                  checked={marcado}
                  onCheckedChange={(checked) => alternarItem(item, checked === true)}
                />
                <span>{item}</span>
              </label>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarItem()
              }
            }}
            placeholder={field.placeholder}
          />
          <Button
            type="button"
            variant="outline"
            onClick={adicionarItem}
            disabled={!novoItem.trim()}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar item
          </Button>
        </div>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.readonly}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <Select value={value || ''} onValueChange={onChange} disabled={field.readonly}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <div className="space-y-2">
        <Label className={labelClass}>{field.label}</Label>
        <RadioGroup value={value || ''} onValueChange={onChange}>
          <div className="flex flex-wrap gap-4">
            {field.options?.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${field.name}-${opt}`} />
                <Label htmlFor={`${field.name}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-start space-x-3">
        <Checkbox checked={!!value} onCheckedChange={onChange} id={field.name} className="mt-1" />
        <Label htmlFor={field.name} className="text-sm leading-snug">
          {field.label}
        </Label>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className={labelClass}>{field.label}</Label>
      <Input
        type={field.type === 'date' ? 'date' : 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={field.readonly}
        className="h-11"
      />
    </div>
  )
}
