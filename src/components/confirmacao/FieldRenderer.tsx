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

interface FieldRendererProps {
  field: FormField
  value: any
  onChange: (value: any) => void
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const labelClass = cn(
    'text-sm font-medium',
    field.required && "after:content-['*'] after:ml-0.5 after:text-red-500",
  )

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
