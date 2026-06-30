import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import { getMinhaConfirmacao, submitConfirmacao } from '@/services/ficha-confirmacao'
import { formSections } from '@/lib/confirmacao-fields'
import { FieldRenderer } from '@/components/confirmacao/FieldRenderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { ArrowRight, ArrowLeft, CheckCircle2, Lock } from 'lucide-react'

export default function FichaConfirmacao() {
  const { user, inscricoes } = useApp()
  const navigate = useNavigate()
  const minhaInscricao = inscricoes.find((i) => i.user_id === user?.id)
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    getMinhaConfirmacao(user.id)
      .then((res) => {
        if (res) setSubmitted(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!minhaInscricao) return
    const prefilled: Record<string, any> = {}
    formSections.forEach((s) =>
      s.fields.forEach((f) => {
        if (f.prefillKey) {
          const v = (minhaInscricao as any)[f.prefillKey]
          if (v != null) prefilled[f.name] = v
        }
      }),
    )
    setValues((prev) => ({ ...prefilled, ...prev }))
  }, [minhaInscricao])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  if (!minhaInscricao || minhaInscricao.status !== 'APROVADA')
    return (
      <div className="p-8 text-center">
        Acesso negado. Apenas alunas aprovadas podem preencher esta ficha.
      </div>
    )
  if (submitted)
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Ficha Enviada!</h1>
        <p className="text-muted-foreground mt-2">
          Sua ficha foi registrada e nao pode ser modificada.
        </p>
        <Button className="mt-6" onClick={() => navigate('/aluna/dashboard')}>
          Voltar ao Painel
        </Button>
      </div>
    )

  const section = formSections[step - 1]
  const totalSteps = formSections.length
  const handleChange = (n: string, v: any) => setValues((p) => ({ ...p, [n]: v }))
  const handleFileChange = (n: string, f: File | null) =>
    setFiles((p) => {
      const n2 = { ...p }
      if (f) n2[n] = f
      else delete n2[n]
      return n2
    })

  const validateStep = () => {
    for (const f of section.fields)
      if (f.required && f.type === 'checkbox' && !values[f.name]) return false
      else if (f.required && f.type !== 'checkbox' && !values[f.name]) return false
    if (step === totalSteps && (!files.foto_rg || !files.foto_cpf || !files.foto_perfil))
      return false
    return true
  }

  const handleNext = () => {
    if (!validateStep()) {
      toast({ title: 'Preencha os campos obrigatorios', variant: 'destructive' })
      return
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast({ title: 'Preencha todos os campos obrigatorios', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      formSections.forEach((s) => {
        const d: Record<string, any> = {}
        s.fields.forEach((f) => {
          if (values[f.name] != null) d[f.name] = values[f.name]
        })
        fd.append(s.storageKey, JSON.stringify(d))
      })
      fd.append('aceite_lgpd', 'true')
      fd.append('foto_rg', files.foto_rg)
      fd.append('foto_cpf', files.foto_cpf)
      fd.append('foto_perfil', files.foto_perfil)
      await submitConfirmacao(fd)
      setSubmitted(true)
      toast({ title: 'Ficha enviada com sucesso!' })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ficha de Confirmacao</h1>
        <p className="text-muted-foreground mt-1">
          Passo {step} de {totalSteps}
        </p>
      </div>
      <Progress value={(step / totalSteps) * 100} className="h-2" />
      {section.confidential && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-2 text-sm">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Secao Confidencial — acessivel apenas a Assistente Social e Coordenacao.</p>
        </div>
      )}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
          <div className="space-y-4">
            {section.fields.map((f) => (
              <FieldRenderer
                key={f.name}
                field={f}
                value={values[f.name]}
                onChange={(v) => handleChange(f.name, v)}
              />
            ))}
          </div>
          {step === totalSteps && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Documentos Obrigatorios</h3>
              {[
                { n: 'foto_rg', l: 'Foto do RG' },
                { n: 'foto_cpf', l: 'Foto do CPF' },
                { n: 'foto_perfil', l: 'Foto de Perfil' },
              ].map((d) => (
                <div key={d.n} className="space-y-2">
                  <Label>{d.l}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileChange(d.n, e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                    {files[d.n] && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <div className="p-6 pt-0 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
          </Button>
          {step < totalSteps ? (
            <Button onClick={handleNext}>
              Proximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Concluir'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
