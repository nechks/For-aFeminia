import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import {
  calcularRendaPerCapita,
  faixaDaRenda,
  formSections,
  formatarReal,
} from '@/lib/confirmacao-fields'
import { buscarCep, formatCep } from '@/lib/viacep'
import { formatarNucleo } from '@/lib/constants'
import { getNucleosPublicos } from '@/services/nucleos'
import { FieldRenderer } from '@/components/confirmacao/FieldRenderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Hourglass,
  Clock,
  XCircle,
  BellRing,
} from 'lucide-react'

const CAMPOS_EXCLUSIVOS_ESPACO_KIDS = new Set([
  'tem_rede_apoio_filhos',
  'precisa_levar_filhos',
  'criancas',
])

export default function FichaConfirmacao() {
  // A ficha vem do contexto, que já a carrega e a atualiza após o envio. Buscar de novo aqui
  // criava uma segunda fonte para o mesmo dado: numa falha momentânea esta tela mostrava o
  // formulário em branco para quem já tinha entregue a ficha.
  const { user, inscricoes, minhaConfirmacao, alunaGateReady, submitFichaConfirmacao } = useApp()
  const navigate = useNavigate()
  const minhaInscricao = inscricoes.find((i) => i.user_id === user?.id)
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [enviadaAgora, setEnviadaAgora] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [avisoFinalizacao, setAvisoFinalizacao] = useState(false)
  const [espacoKidsDisponivel, setEspacoKidsDisponivel] = useState(false)

  const fichaEntregue = !!minhaConfirmacao
  const loading = !alunaGateReady

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
    // O cadastro guarda rua e número juntos. Na confirmação eles são campos separados.
    const enderecoCompleto = String(minhaInscricao.endereco ?? '').trim()
    const separadorNumero = enderecoCompleto.lastIndexOf(',')
    if (separadorNumero > 0) {
      prefilled.endereco = enderecoCompleto.slice(0, separadorNumero).trim()
      prefilled.numero = enderecoCompleto.slice(separadorNumero + 1).trim()
    }
    prefilled.email = minhaInscricao.email || user?.email || ''
    prefilled.naturalidade = [minhaInscricao.cidade, minhaInscricao.estado]
      .filter(Boolean)
      .join('/')
    prefilled.turma = formatarNucleo(minhaInscricao.turma)
    setValues((prev) => ({ ...prefilled, ...prev }))
  }, [minhaInscricao, user?.email])

  useEffect(() => {
    if (!minhaInscricao?.turma) return
    getNucleosPublicos()
      .then((nucleos) => {
        const oferece = nucleos.find((n) => n.codigo === minhaInscricao.turma)?.espaco_kids === true
        setEspacoKidsDisponivel(oferece)
        if (!oferece) {
          setValues((atuais) => {
            const proximos = { ...atuais }
            CAMPOS_EXCLUSIVOS_ESPACO_KIDS.forEach((campo) => delete proximos[campo])
            return proximos
          })
        }
      })
      .catch(() => setEspacoKidsDisponivel(false))
  }, [minhaInscricao?.turma])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  // Renovação de ciclo: a ficha anterior continua no histórico, mas o vínculo está inativo até a
  // aluna responder a desta edição — então o formulário abre de novo em vez da tela de "já enviada".
  const renovacaoPendente = minhaInscricao?.acesso_ativo === false
  const submitted = enviadaAgora || (fichaEntregue && !renovacaoPendente)

  // Enquanto a inscrição não é aprovada, a aluna vê o andamento — não o formulário de matrícula.
  if (!minhaInscricao || minhaInscricao.status !== 'APROVADA') {
    const estados: Record<
      string,
      { icon: typeof Hourglass; cor: string; titulo: string; texto: string }
    > = {
      AGUARDANDO: {
        icon: Hourglass,
        cor: 'text-amber-500',
        titulo: 'Inscrição em análise',
        texto:
          'Recebemos sua inscrição! Ela está aguardando aprovação da coordenação. Assim que for aprovada, você poderá preencher aqui a sua ficha de matrícula.',
      },
      EM_ANALISE: {
        icon: Clock,
        cor: 'text-sky-500',
        titulo: 'Inscrição em análise',
        texto:
          'Sua inscrição está sendo analisada pela coordenação. Você será avisada assim que houver uma resposta.',
      },
      LISTA_ESPERA: {
        icon: Clock,
        cor: 'text-violet-500',
        titulo: 'Você está na lista de espera',
        texto:
          'No momento as vagas estão preenchidas e você está na lista de espera. Caso surja uma vaga, a coordenação entrará em contato.',
      },
      REPROVADA: {
        icon: XCircle,
        cor: 'text-rose-500',
        titulo: 'Inscrição não aprovada',
        texto:
          'Sua inscrição não foi aprovada nesta edição. Em caso de dúvidas, procure a coordenação do projeto.',
      },
      CANCELADA: {
        icon: XCircle,
        cor: 'text-gray-500',
        titulo: 'Inscrição cancelada',
        texto: 'Sua inscrição foi cancelada. Procure a coordenação para mais informações.',
      },
    }
    const estado = minhaInscricao
      ? (estados[minhaInscricao.status] ?? estados.AGUARDANDO)
      : {
          icon: Hourglass,
          cor: 'text-amber-500',
          titulo: 'Nenhuma inscrição encontrada',
          texto:
            'Faça sua inscrição no Projeto Força Feminina para acompanhar o andamento por aqui.',
        }
    const Icone = estado.icon
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <Icone className={`w-14 h-14 mx-auto ${estado.cor}`} />
            <h1 className="text-2xl font-bold">{estado.titulo}</h1>
            <p className="text-muted-foreground">{estado.texto}</p>
            <Button variant="outline" onClick={() => navigate('/aluna/perfil')}>
              Ir para Meu Perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  if (submitted)
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Ficha Enviada!</h1>
        <p className="text-muted-foreground mt-2">
          Sua ficha foi registrada e não pode ser modificada.
        </p>
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <BellRing className="h-5 w-5" /> Atenção à primeira aula
          </p>
          <p className="mt-1 text-sm">
            Fique atenta, nos próximos dois dias você receberá todas as instruções da sua aula
            inaugural. Quando a data for definida, você recebe uma notificação e ela passa a
            aparecer em "Próxima Aula", no seu painel, e no Calendário.
          </p>
        </div>
        <Button className="mt-6" onClick={() => navigate('/aluna/dashboard')}>
          Voltar ao Painel
        </Button>
      </div>
    )

  const section = formSections[step - 1]
  const totalSteps = formSections.length
  const campoVisivel = (field: (typeof section.fields)[number]) =>
    (!CAMPOS_EXCLUSIVOS_ESPACO_KIDS.has(field.name) || espacoKidsDisponivel) &&
    (!field.showWhen || values[field.showWhen.field] === field.showWhen.equals) &&
    (!field.hideWhen || values[field.hideWhen.field] !== field.hideWhen.equals)

  const handleChange = (n: string, v: any) => {
    if (n === 'cep' && typeof v === 'string') {
      const masked = formatCep(v)
      setValues((p) => ({ ...p, cep: masked }))
      if (masked.replace(/\D/g, '').length === 8) {
        buscarCep(masked).then((e) => {
          if (!e) return
          setValues((p) => ({
            ...p,
            endereco: e.logradouro || p.endereco,
            bairro: e.bairro || p.bairro,
            cidade: e.cidade || p.cidade,
            estado: e.estado || p.estado,
          }))
        })
      }
      return
    }
    setValues((p) => {
      const proximo = { ...p, [n]: v }
      if (n === 'renda_familiar_total' || n === 'pessoas_residencia') {
        const perCapita = calcularRendaPerCapita(
          proximo.renda_familiar_total,
          proximo.pessoas_residencia,
        )
        if (perCapita == null) {
          delete proximo.renda_per_capita
          delete proximo.renda_familiar
        } else {
          proximo.renda_per_capita = formatarReal(perCapita)
          proximo.renda_familiar = faixaDaRenda(perCapita)
        }
      }
      if (n === 'tem_filhos' && v !== 'Sim') {
        delete proximo.tem_rede_apoio_filhos
        delete proximo.precisa_levar_filhos
        delete proximo.criancas
      }
      if (n === 'situacao_trabalho' && v === 'Desempregada') {
        delete proximo.profissao
      }
      if (n === 'tem_rede_apoio_filhos' && v !== 'Não') {
        delete proximo.precisa_levar_filhos
        delete proximo.criancas
      }
      if (n === 'precisa_levar_filhos') {
        if (v === 'Sim' && !Array.isArray(proximo.criancas)) {
          proximo.criancas = [{ nome: '', idade: '' }]
        } else if (v !== 'Sim') {
          delete proximo.criancas
        }
      }
      return proximo
    })
  }
  const handleFileChange = (n: string, f: File | null) =>
    setFiles((p) => {
      const n2 = { ...p }
      if (f) n2[n] = f
      else delete n2[n]
      return n2
    })

  const validateStep = () => {
    for (const f of section.fields) {
      if (!campoVisivel(f)) continue
      if (f.required && f.type === 'checkbox' && !values[f.name]) return false
      else if (f.required && f.type === 'profession' && !String(values[f.name] ?? '').trim())
        return false
      else if (f.required && f.type === 'number') {
        const numero = Number(String(values[f.name] ?? '').replace(',', '.'))
        if (!Number.isFinite(numero)) return false
        if (f.min != null && numero < f.min) return false
      } else if (f.required && f.type === 'children') {
        const criancas = values[f.name]
        if (
          !Array.isArray(criancas) ||
          criancas.length === 0 ||
          criancas.some(
            (crianca) =>
              !String(crianca?.nome ?? '').trim() ||
              String(crianca?.idade ?? '').trim() === '' ||
              Number(crianca.idade) < 0 ||
              Number(crianca.idade) > 17,
          )
        )
          return false
      } else if (f.required && f.type !== 'checkbox' && !values[f.name]) return false
    }
    if (
      step === totalSteps &&
      (!files.foto_rg ||
        !files.foto_cpf ||
        !files.foto_perfil ||
        !files.foto_comprovante_residencia)
    )
      return false
    return true
  }

  const handleNext = () => {
    if (!validateStep()) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      formSections.forEach((s) => {
        const d: Record<string, any> = {}
        s.fields.forEach((f) => {
          const visivel =
            (!f.showWhen || values[f.showWhen.field] === f.showWhen.equals) &&
            (!f.hideWhen || values[f.hideWhen.field] !== f.hideWhen.equals)
          if (visivel && values[f.name] != null) d[f.name] = values[f.name]
        })
        fd.append(s.storageKey, JSON.stringify(d))
      })
      fd.append('aceite_lgpd', 'true')
      fd.append('foto_rg', files.foto_rg)
      fd.append('foto_cpf', files.foto_cpf)
      fd.append('foto_perfil', files.foto_perfil)
      fd.append('foto_comprovante_residencia', files.foto_comprovante_residencia)
      // Passa pelo contexto para que a ficha recém-enviada entre no estado compartilhado na
      // hora: é ela que abre o acesso ao painel e tira o item "Ficha de Confirmação" do menu.
      const { error } = await submitFichaConfirmacao(fd)
      if (error) throw error
      setEnviadaAgora(true)
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

  const confirmarFinalizacao = () => {
    if (!validateStep()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    setAvisoFinalizacao(true)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ficha de Confirmação</h1>
        <p className="text-muted-foreground mt-1">
          Passo {step} de {totalSteps}
        </p>
      </div>
      <Progress value={(step / totalSteps) * 100} className="h-2" />
      {section.confidential && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-2 text-sm">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Seção confidencial — acessível apenas à Assistente Social e à Coordenação.</p>
        </div>
      )}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
          <div className="space-y-4">
            {section.fields.filter(campoVisivel).map((f) => (
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
              <h3 className="font-semibold">Documentos obrigatórios</h3>
              {[
                { n: 'foto_rg', l: 'Foto do RG' },
                { n: 'foto_cpf', l: 'Foto do CPF' },
                { n: 'foto_perfil', l: 'Foto de Perfil' },
                { n: 'foto_comprovante_residencia', l: 'Comprovante de Residência' },
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
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={confirmarFinalizacao} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Concluir'}
            </Button>
          )}
        </div>
      </Card>
      <AlertDialog open={avisoFinalizacao} onOpenChange={setAvisoFinalizacao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-amber-600" /> Aviso importante
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block font-medium text-foreground">
                A participação na primeira aula é obrigatória.
              </span>
              <span className="block">
                Quando a data for definida, você recebe uma notificação e ela aparece em "Próxima
                Aula", no seu painel, e no Calendário. Fique atenta.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              Estou ciente e quero finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
