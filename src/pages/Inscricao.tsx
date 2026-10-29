import { useEffect, useMemo, useState } from 'react'
import Logo from '@/components/Logo'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { submitInscricao } from '@/services/inscricao'
import { buscarCep, formatCep } from '@/lib/viacep'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, ArrowLeft, CheckCircle2, MapPinOff } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { formatarDias } from '@/lib/turmas'
import { getNucleosPublicos, type NucleoPublico } from '@/services/nucleos'
import {
  getMunicipiosPublicos,
  municipioAtendido,
  type MunicipioPublico,
} from '@/services/municipios'
import { getErrorMessage, extractFieldErrors } from '@/lib/api/errors'

// Opções das perguntas 19 a 24, 34 a 36 e 38 da ficha oficial. Os textos são os do formulário —
// mudá-los quebra a validação do backend, que confere contra a mesma lista.
const GENEROS = [
  'Mulher Cisgênero',
  'Mulher Transgênero',
  'Não Binária (feminizadas/lidas como femininas)',
]
/** Resumo de cada identidade. Fica dentro da opção, no lugar do bloco de texto acima do campo. */
const GENERO_RESUMO: Record<string, string> = {
  'Mulher Cisgênero':
    'Identifica-se como mulher e com o gênero correspondente ao sexo que lhe foi atribuído no nascimento.',
  'Mulher Transgênero':
    'Identifica-se como mulher, embora o sexo que lhe foi atribuído no nascimento tenha sido diferente do feminino.',
  'Não Binária (feminizadas/lidas como femininas)':
    'Não se identifica exclusivamente como homem ou mulher e possui identificação relacionada ao feminino.',
}
const ORIENTACAO_OUTRA = 'Outra orientação sexual'
const ORIENTACOES = [
  'Heterossexual',
  'Lésbica',
  'Bissexual',
  'Pansexual',
  'Assexual',
  ORIENTACAO_OUTRA,
]
const ORIENTACAO_RESUMO: Record<string, string> = {
  Heterossexual:
    'Sente atração afetiva e/ou sexual predominantemente por pessoas de gênero diferente do seu.',
  Lésbica:
    'Mulher ou pessoa com identificação no campo do feminino que sente atração afetiva e/ou sexual por mulheres.',
  Bissexual: 'Sente atração afetiva e/ou sexual por mais de um gênero.',
  Pansexual: 'Sente atração afetiva e/ou sexual por pessoas independentemente do gênero.',
  Assexual:
    'Sente pouca ou nenhuma atração sexual; isso não impede vínculos afetivos ou românticos.',
  [ORIENTACAO_OUTRA]:
    'Não se reconhece nas opções anteriores e pode informar livremente como se identifica.',
}
const CORES_RACAS = ['Amarela', 'Preta', 'Indígena', 'Branca', 'Parda']
const DEFICIENCIAS = [
  'Motora/Física',
  'Auditiva',
  'Visual',
  'Intelectual/Mental',
  'Psicossocial',
  'Outro',
]
const FILHOS = [
  'Não',
  'Sim (sou mãe solo)',
  'Sim (divido a criação/cuidados com o genitor)',
]
const BENEFICIOS = [
  'Bolsa Família',
  'Benefício de Prestação Continuada (BPC)',
  'Minha Casa Minha Vida',
  'Outro',
]
const VIOLENCIA = ['Não', 'Sim', 'Prefiro não responder']
const TIPOS_VIOLENCIA = ['Física', 'Psicológica', 'Sexual', 'Patrimonial', 'Moral']
const ZONAS = ['Zona Urbana', 'Zona Rural']

/** Faixa atendida pelo Espaço Kids; precisa acompanhar IDADE_MINIMA/MAXIMA_CRIANCA no backend. */
const IDADE_MIN_KIDS = 5
const IDADE_MAX_KIDS = 12

function idadeValida(nascimento: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return false
  const data = new Date(`${nascimento}T12:00:00`)
  if (Number.isNaN(data.getTime())) return false
  const hoje = new Date()
  let idade = hoje.getFullYear() - data.getFullYear()
  const mes = hoje.getMonth() - data.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) idade--
  return idade >= IDADE_MIN_KIDS && idade <= IDADE_MAX_KIDS
}
function normalizarLocal(valor?: string | null): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
}

const COMO_CONHECEU = [
  'Associação de Moradores',
  'Amigos/familiares',
  'Instagram',
  'Google',
  'WhatsApp',
  'TV/reportagem',
  'CRAS',
  'Centros de Atendimento às Mulheres',
  'Outro',
]

// Em qual passo do formulário cada campo aparece — para levar a usuária de volta ao erro.
const fieldStep: Record<string, number> = {
  nome_completo: 1,
  data_nascimento: 1,
  cpf: 1,
  telefone: 1,
  cep: 2,
  rua: 2,
  numero: 2,
  bairro: 2,
  cidade: 2,
  estado: 2,
  zona_residencia: 2,
  genero: 3,
  orientacao_sexual: 3,
  orientacao_sexual_outro: 3,
  cor_raca: 3,
  pcd: 3,
  tipos_deficiencia: 3,
  deficiencia_outro: 3,
  tem_filhos: 4,
  ja_foi_aluna: 4,
  filho_aluno_taekwondo: 4,
  possui_cadunico: 4,
  motivo_participar: 5,
  como_conheceu: 5,
  como_conheceu_outro: 5,
  recebe_beneficio_social: 4,
  beneficios_sociais: 4,
  beneficio_outro: 4,
  historico_violencia: 4,
  tipos_violencia: 4,
  medida_protetiva: 4,
  email: 6,
  password: 6,
  aceite_lgpd: 6,
  // A escolha de núcleo/período é a última pergunta: quem não é atendida no município nem chega
  // até aqui, então não faz sentido perguntar antes.
  turma: 7,
  horario_preferido: 7,
  espaco_kids_solicitado: 8,
  crianca_nome: 8,
  crianca_data_nascimento: 8,
  crianca_necessidades_especiais: 8,
  crianca_necessidades_descricao: 8,
  crianca_restricao_alimentar: 8,
  crianca_restricao_descricao: 8,
  crianca_problema_saude: 8,
  crianca_problema_saude_descricao: 8,
  crianca_medicamento: 8,
  crianca_medicamento_qual: 8,
}
// Valida CPF pelos dígitos verificadores (mesma regra do backend), evitando avançar com CPF falso.
function isCpfValido(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let sum1 = 0
  for (let i = 0; i < 9; i++) sum1 += Number(cpf[i]) * (10 - i)
  let d1 = 11 - (sum1 % 11)
  if (d1 >= 10) d1 = 0
  let sum2 = 0
  for (let i = 0; i < 10; i++) sum2 += Number(cpf[i]) * (11 - i)
  let d2 = 11 - (sum2 % 11)
  if (d2 >= 10) d2 = 0
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10])
}

const formSchema = z
  .object({
    nome_completo: z.string().min(3, 'Nome completo é obrigatório'),
    data_nascimento: z.string().refine((val) => {
      return new Date().getFullYear() - new Date(val).getFullYear() >= 18
    }, 'Você deve ter pelo menos 18 anos'),
    cpf: z.string().refine(isCpfValido, 'CPF inválido'),
    rg: z.string().optional(),
    telefone: z.string().min(10, 'Telefone inválido'),
    cep: z.string().min(8, 'CEP inválido'),
    rua: z.string().min(1, 'Obrigatório'),
    numero: z.string().min(1, 'Obrigatório'),
    bairro: z.string().min(1, 'Obrigatório'),
    cidade: z.string().min(1, 'Obrigatório'),
    estado: z.string().min(2, 'Obrigatório'),
    zona_residencia: z.string().min(1, 'Informe se mora em zona urbana ou rural'),
    genero: z.string().min(1, 'Selecione como você se identifica'),
    orientacao_sexual: z.string().min(1, 'Selecione sua orientação sexual'),
    orientacao_sexual_outro: z.string(),
    cor_raca: z.string().min(1, 'Selecione sua cor ou raça/etnia'),
    pcd: z.string().min(1, 'Informe se é pessoa com deficiência'),
    tipos_deficiencia: z.array(z.string()),
    deficiencia_outro: z.string(),
    tem_filhos: z.string().min(1, 'Informe se tem filhos'),
    ja_foi_aluna: z.string().min(1, 'Informe se já foi aluna do projeto'),
    filho_aluno_taekwondo: z.string(),
    possui_cadunico: z.string().min(1, 'Informe se possui CadÚnico'),
    motivo_participar: z.string().min(1, 'Conte por que gostaria de participar'),
    como_conheceu: z.string().min(1, 'Informe como conheceu o projeto'),
    como_conheceu_outro: z.string(),
    recebe_beneficio_social: z.string().min(1, 'Informe se recebe algum benefício social'),
    beneficios_sociais: z.array(z.string()),
    beneficio_outro: z.string(),
    historico_violencia: z.string().min(1, 'Selecione uma das opções'),
    tipos_violencia: z.array(z.string()),
    medida_protetiva: z.string(),
    turma: z.string().min(1, 'Selecione um núcleo'),
    horario_preferido: z.string().min(1, 'Selecione o horário'),
    espaco_kids_solicitado: z.string(),
    crianca_nome: z.string(),
    crianca_data_nascimento: z.string(),
    crianca_necessidades_especiais: z.string(),
    crianca_necessidades_descricao: z.string(),
    crianca_restricao_alimentar: z.string(),
    crianca_restricao_descricao: z.string(),
    crianca_problema_saude: z.string(),
    crianca_problema_saude_descricao: z.string(),
    crianca_medicamento: z.string(),
    crianca_medicamento_qual: z.string(),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmar_senha: z.string(),
    aceite_lgpd: z.boolean().refine((v) => v, 'É necessário autorizar'),
  })
  .refine((data) => data.password === data.confirmar_senha, {
    message: 'As senhas não conferem',
    path: ['confirmar_senha'],
  })
  .refine(
    (data) =>
      data.orientacao_sexual !== ORIENTACAO_OUTRA ||
      data.orientacao_sexual_outro.trim().length > 0,
    { message: 'Descreva como você se identifica', path: ['orientacao_sexual_outro'] },
  )
  .refine((data) => data.pcd !== 'Sim' || data.tipos_deficiencia.length > 0, {
    message: 'Selecione o(s) tipo(s) de deficiência',
    path: ['tipos_deficiencia'],
  })
  .refine(
    (data) =>
      !data.tipos_deficiencia.includes('Outro') || data.deficiencia_outro.trim().length > 0,
    { message: 'Descreva qual é a deficiência', path: ['deficiencia_outro'] },
  )
  .refine(
    (data) => data.recebe_beneficio_social !== 'Sim' || data.beneficios_sociais.length > 0,
    { message: 'Selecione o(s) benefício(s) recebido(s)', path: ['beneficios_sociais'] },
  )
  // A pergunta da Escola de Taekwondo só existe para quem tem filhos.
  .refine((data) => data.tem_filhos === 'Não' || data.filho_aluno_taekwondo.length > 0, {
    message: 'Informe se o filho é aluno da Escola de Taekwondo',
    path: ['filho_aluno_taekwondo'],
  })
  .refine(
    (data) => data.como_conheceu !== 'Outro' || data.como_conheceu_outro.trim().length > 0,
    { message: 'Descreva como conheceu o projeto', path: ['como_conheceu_outro'] },
  )
  .refine(
    (data) => !data.beneficios_sociais.includes('Outro') || data.beneficio_outro.trim().length > 0,
    { message: 'Descreva qual é o benefício', path: ['beneficio_outro'] },
  )
  .refine(
    (data) => data.historico_violencia !== 'Sim' || data.tipos_violencia.length > 0,
    { message: 'Selecione ao menos um tipo de violência', path: ['tipos_violencia'] },
  )
  .refine(
    (data) => data.historico_violencia !== 'Sim' || data.medida_protetiva.length > 0,
    { message: 'Informe se possui medida protetiva', path: ['medida_protetiva'] },
  )
  // Espaço Kids: os dados da criança só são cobrados de quem pediu a vaga.
  .refine((d) => d.espaco_kids_solicitado !== 'Sim' || d.crianca_nome.trim().length > 0, {
    message: 'Informe o nome da criança',
    path: ['crianca_nome'],
  })
  .refine((d) => d.espaco_kids_solicitado !== 'Sim' || idadeValida(d.crianca_data_nascimento), {
    message: `O Espaço Kids atende crianças de ${IDADE_MIN_KIDS} a ${IDADE_MAX_KIDS} anos`,
    path: ['crianca_data_nascimento'],
  })
  .refine(
    (d) => d.espaco_kids_solicitado !== 'Sim' || d.crianca_necessidades_especiais.length > 0,
    { message: 'Informe se a criança tem necessidades especiais', path: ['crianca_necessidades_especiais'] },
  )
  .refine(
    (d) => d.crianca_necessidades_especiais !== 'Sim' || d.crianca_necessidades_descricao.trim().length > 0,
    { message: 'Descreva as necessidades especiais', path: ['crianca_necessidades_descricao'] },
  )
  .refine((d) => d.espaco_kids_solicitado !== 'Sim' || d.crianca_restricao_alimentar.length > 0, {
    message: 'Informe se a criança tem restrição alimentar',
    path: ['crianca_restricao_alimentar'],
  })
  .refine(
    (d) => d.crianca_restricao_alimentar !== 'Sim' || d.crianca_restricao_descricao.trim().length > 0,
    { message: 'Descreva a restrição alimentar', path: ['crianca_restricao_descricao'] },
  )
  .refine((d) => d.espaco_kids_solicitado !== 'Sim' || d.crianca_problema_saude.length > 0, {
    message: 'Informe se a criança tem algum problema de saúde',
    path: ['crianca_problema_saude'],
  })
  .refine(
    (d) => d.crianca_problema_saude !== 'Sim' || d.crianca_problema_saude_descricao.trim().length > 0,
    { message: 'Descreva o problema de saúde', path: ['crianca_problema_saude_descricao'] },
  )
  .refine((d) => d.espaco_kids_solicitado !== 'Sim' || d.crianca_medicamento.length > 0, {
    message: 'Informe se a criança toma algum medicamento',
    path: ['crianca_medicamento'],
  })
  .refine(
    (d) => d.crianca_medicamento !== 'Sim' || d.crianca_medicamento_qual.trim().length > 0,
    { message: 'Informe qual medicamento', path: ['crianca_medicamento_qual'] },
  )

type FormValues = z.infer<typeof formSchema>

const fullFormResolver = zodResolver(formSchema)
const stepAwareResolver: Resolver<FormValues> = async (values, context, options) => {
  const result = await fullFormResolver(values, context, options)

  // O Zod sempre avalia o objeto inteiro. Durante a validação de uma etapa,
  // conserva apenas os erros dos campos solicitados pelo React Hook Form.
  if (options.names?.length && Object.keys(result.errors).length > 0) {
    const requestedFields = new Set<string>(options.names)
    result.errors = Object.fromEntries(
      Object.entries(result.errors).filter(([fieldName]) => requestedFields.has(fieldName)),
    )
  }

  return result
}

export default function Inscricao() {
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [nucleos, setNucleos] = useState<NucleoPublico[]>([])
  const [municipios, setMunicipios] = useState<MunicipioPublico[]>([])
  // Município fora da área atendida: o formulário encerra aqui, sem as perguntas seguintes.
  const [municipioForaDeArea, setMunicipioForaDeArea] = useState<string | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const form = useForm<FormValues>({
    resolver: stepAwareResolver,
    defaultValues: {
      nome_completo: '',
      data_nascimento: '',
      cpf: '',
      rg: '',
      telefone: '',
      cep: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      zona_residencia: '',
      genero: '',
      orientacao_sexual: '',
      orientacao_sexual_outro: '',
      cor_raca: '',
      pcd: '',
      tipos_deficiencia: [],
      deficiencia_outro: '',
      tem_filhos: '',
      ja_foi_aluna: '',
      filho_aluno_taekwondo: '',
      possui_cadunico: '',
      motivo_participar: '',
      como_conheceu: '',
      como_conheceu_outro: '',
      recebe_beneficio_social: '',
      beneficios_sociais: [],
      beneficio_outro: '',
      historico_violencia: '',
      tipos_violencia: [],
      medida_protetiva: '',
      turma: '',
      horario_preferido: '',
      espaco_kids_solicitado: '',
      crianca_nome: '',
      crianca_data_nascimento: '',
      crianca_necessidades_especiais: '',
      crianca_necessidades_descricao: '',
      crianca_restricao_alimentar: '',
      crianca_restricao_descricao: '',
      crianca_problema_saude: '',
      crianca_problema_saude_descricao: '',
      crianca_medicamento: '',
      crianca_medicamento_qual: '',
      email: '',
      password: '',
      confirmar_senha: '',
      aceite_lgpd: false,
    },
  })

  useEffect(() => {
    getNucleosPublicos()
      .then(setNucleos)
      .catch(() =>
        toast({
          title: 'Não foi possível carregar os núcleos',
          description: 'Recarregue a página para escolher onde deseja estudar.',
          variant: 'destructive',
        }),
      )
    // Lista vazia (ou que não carregou) significa "sem restrição configurada": ninguém é barrado
    // por uma falha de rede, e o backend confere de novo no envio.
    getMunicipiosPublicos()
      .then(setMunicipios)
      .catch(() => setMunicipios([]))
  }, [])

  const nucleoEscolhido = form.watch('turma')
  const bairroInformado = form.watch('bairro')
  const cidadeInformada = form.watch('cidade')
  const estadoInformado = form.watch('estado')
  const nucleoAtendeEndereco = (nucleo: NucleoPublico) => {
    const zonas = nucleo.zonas_prioritarias ?? []
    if (zonas.length === 0) return true
    return zonas.some(
      (zona) =>
        normalizarLocal(zona.cidade) === normalizarLocal(cidadeInformada) &&
        normalizarLocal(zona.estado) === normalizarLocal(estadoInformado) &&
        zona.bairros.some(
          (bairro) => normalizarLocal(bairro) === normalizarLocal(bairroInformado),
        ),
    )
  }
  const nucleosDisponiveis = useMemo(
    () => nucleos.filter(nucleoAtendeEndereco),
    [nucleos, bairroInformado, cidadeInformada, estadoInformado],
  )
  const nucleoSelecionado = nucleos.find((n) => n.codigo === nucleoEscolhido)
  // Só oferece os horários que têm turma aberta no núcleo escolhido; sem núcleo, nada a escolher.
  const horariosDisponiveis = useMemo(
    () => nucleos.find((n) => n.codigo === nucleoEscolhido)?.horarios ?? [],
    [nucleos, nucleoEscolhido],
  )
  // O passo do Espaço Kids só existe quando o projeto do núcleo escolhido oferece o espaço.
  const temEspacoKids =
    nucleos.find((n) => n.codigo === nucleoEscolhido)?.espaco_kids ?? false
  const totalSteps = temEspacoKids ? 8 : 7

  const handleCepChange = async (raw: string, onChange: (v: string) => void) => {
    const masked = formatCep(raw)
    onChange(masked)
    if (masked.replace(/\D/g, '').length !== 8) return
    setBuscandoCep(true)
    const endereco = await buscarCep(masked)
    setBuscandoCep(false)
    if (!endereco) return
    if (endereco.logradouro) form.setValue('rua', endereco.logradouro, { shouldValidate: true })
    if (endereco.bairro) form.setValue('bairro', endereco.bairro, { shouldValidate: true })
    if (endereco.cidade) form.setValue('cidade', endereco.cidade, { shouldValidate: true })
    if (endereco.estado) form.setValue('estado', endereco.estado, { shouldValidate: true })
  }

  const onSubmit = async (values: FormValues) => {
    const { rua, numero, confirmar_senha, ...rest } = values
    try {
      await submitInscricao({
        ...rest,
        endereco: `${rua}, ${numero}`,
        // O turno continua indo junto, derivado do horário: é por ele que a gestão casa a aluna
        // com a turma na hora de alocar.
        periodo_preferido:
          horariosDisponiveis.find((h) => h.label === values.horario_preferido)?.turno ?? '',
        // Sem Espaço Kids no projeto, o passo nem existe: não manda pedido nenhum.
        espaco_kids_solicitado: temEspacoKids ? values.espaco_kids_solicitado : '',
      })
      setIsSubmitted(true)
      toast({ title: 'Inscrição recebida!' })
    } catch (err) {
      // Mostra o motivo real vindo do backend (CPF inválido, e-mail já cadastrado, etc.)
      // e leva a usuária de volta ao passo do campo com problema.
      const fields = extractFieldErrors(err)
      let primeiroPasso: number | null = null
      Object.entries(fields).forEach(([field, msg]) => {
        form.setError(field as any, { message: msg })
        const s = fieldStep[field]
        if (s && (primeiroPasso === null || s < primeiroPasso)) primeiroPasso = s
      })
      if (primeiroPasso !== null) setStep(primeiroPasso)
      toast({
        title: 'Erro ao enviar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const nextStep = async () => {
    const fields: Record<number, string[]> = {
      1: ['nome_completo', 'data_nascimento', 'cpf', 'telefone'],
      2: ['cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'zona_residencia'],
      3: [
        'genero',
        'orientacao_sexual',
        'orientacao_sexual_outro',
        'cor_raca',
        'pcd',
        'tipos_deficiencia',
        'deficiencia_outro',
      ],
      4: [
        'tem_filhos',
        'ja_foi_aluna',
        'filho_aluno_taekwondo',
        'possui_cadunico',
        'recebe_beneficio_social',
        'beneficios_sociais',
        'beneficio_outro',
        'historico_violencia',
        'tipos_violencia',
        'medida_protetiva',
      ],
      5: ['motivo_participar', 'como_conheceu', 'como_conheceu_outro'],
      6: ['email', 'password', 'confirmar_senha', 'aceite_lgpd'],
      7: ['turma', 'horario_preferido'],
      8: [
        'espaco_kids_solicitado',
        'crianca_nome',
        'crianca_data_nascimento',
        'crianca_necessidades_especiais',
        'crianca_necessidades_descricao',
        'crianca_restricao_alimentar',
        'crianca_restricao_descricao',
        'crianca_problema_saude',
        'crianca_problema_saude_descricao',
        'crianca_medicamento',
        'crianca_medicamento_qual',
      ],
    }
    const isValid = await form.trigger(fields[step] as any)
    // Corte por município: quem mora fora da área atendida não segue para as próximas perguntas.
    if (isValid && step === 2) {
      const cidade = form.getValues('cidade')
      const estado = form.getValues('estado')
      if (!municipioAtendido(municipios, cidade, estado)) {
        setMunicipioForaDeArea(cidade)
        return
      }
    }
    if (isValid && step === 7 && nucleoSelecionado && !nucleoAtendeEndereco(nucleoSelecionado)) {
      form.setError('turma', {
        message: 'Este núcleo não atende o bairro informado. Escolha outro núcleo.',
      })
      return
    }
    if (isValid) {
      const futureFields = Object.entries(fields)
        .filter(([fieldStep]) => Number(fieldStep) > step)
        .flatMap(([, fieldNames]) => fieldNames)
      form.clearErrors(futureFields as any)
      setStep((s) => Math.min(s + 1, totalSteps))
    }
  }

  if (municipioForaDeArea) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card variant="plano" className="w-full max-w-md text-center border-none shadow-xl animate-slide-up">
          <CardHeader>
            <div className="mx-auto bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <MapPinOff className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Ainda não atendemos {municipioForaDeArea}</CardTitle>
            <CardDescription className="text-base mt-2">
              No momento não temos projeto ativo na sua cidade, então a inscrição termina por aqui.
              Guardamos o seu interesse e, assim que abrirmos uma turma na sua região, a
              coordenação entra em contato.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full h-12" asChild>
              <Link to="/">Voltar para o Início</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMunicipioForaDeArea(null)}
            >
              Corrigir o município
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card variant="plano" className="w-full max-w-md text-center border-none shadow-xl animate-slide-up">
          <CardHeader>
            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Inscrição Recebida!</CardTitle>
            <CardDescription className="text-base mt-2">
              Sua inscrição foi registrada com sucesso. A administração avaliará os dados e entrará
              em contato pelo WhatsApp. Assim que for aprovada, você poderá entrar no sistema com o
              e-mail e a senha que cadastrou.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full h-12" asChild>
              <Link to="/">Voltar para o Início</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Logo className="h-11 w-11" />
          <h1 className="text-xl font-bold text-primary">Força Feminina</h1>
        </div>
        <div className="w-16" />
      </div>

      <Card variant="plano" className="w-full max-w-2xl border-none shadow-elevation animate-fade-in">
        <div className="p-6 border-b bg-card rounded-t-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Passo {step} de {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round((step / totalSteps) * 100)}% concluído
            </span>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="p-6 md:p-8 min-h-[350px]">
              {step === 1 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Dados Pessoais</h2>
                  <FormField
                    control={form.control}
                    name="nome_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Maria da Silva" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="data_nascimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000-0" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (WhatsApp)</FormLabel>
                          <FormControl>
                            <Input placeholder="(27) 99999-9999" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Endereço</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="29000-000"
                              {...field}
                              onChange={(e) => handleCepChange(e.target.value, field.onChange)}
                              className="h-11"
                            />
                          </FormControl>
                          {buscandoCep && (
                            <p className="text-xs text-muted-foreground">Buscando endereço...</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rua"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Principal" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Centro" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Vitória" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="ES" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="zona_residencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Onde você mora é</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ZONAS.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Identidade e Diversidade</h2>
                  <p className="text-sm text-muted-foreground">
                    Essas informações são autodeclaradas e usadas apenas para acompanhamento
                    institucional do projeto.
                  </p>
                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qual gênero se identifica?</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            {/* O gatilho esconde a descrição: ela serve para escolher, não para exibir. */}
                            <SelectTrigger className="h-11 [&_[data-desc]]:hidden">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          {/* Mesma largura do campo: as descrições quebram linha dentro dela, sem cortar nem sair da tela. */}
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {GENEROS.map((o) => (
                              <SelectItem key={o} value={o} textValue={o}>
                                <span className="font-medium">{o}</span>
                                <span
                                  data-desc
                                  className="mt-0.5 block whitespace-normal text-xs text-muted-foreground"
                                >
                                  {GENERO_RESUMO[o]}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orientacao_sexual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qual sua orientação sexual?</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            if (v !== ORIENTACAO_OUTRA) form.setValue('orientacao_sexual_outro', '')
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 [&_[data-desc]]:hidden">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          {/* Mesma largura do campo: as descrições quebram linha dentro dela, sem cortar nem sair da tela. */}
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {ORIENTACOES.map((o) => (
                              <SelectItem key={o} value={o} textValue={o}>
                                <span className="font-medium">{o}</span>
                                <span
                                  data-desc
                                  className="mt-0.5 block whitespace-normal text-xs text-muted-foreground"
                                >
                                  {ORIENTACAO_RESUMO[o]}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('orientacao_sexual') === ORIENTACAO_OUTRA && (
                    <FormField
                      control={form.control}
                      name="orientacao_sexual_outro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como você se identifica?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Descreva sua orientação sexual"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="cor_raca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qual sua cor ou raça/etnia?</FormLabel>
                        <FormDescription>
                          Categorias do IBGE, autoatribuídas: cada pessoa se define conforme se
                          identifica.
                        </FormDescription>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CORES_RACAS.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pcd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>É uma pessoa com deficiência (PCD)?</FormLabel>
                        <FormDescription>
                          Conforme a Lei nº 13.146/2015, de nascimento ou adquirida durante a vida.
                        </FormDescription>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            // Trocar para "Não" descarta a lista, para não enviar resposta órfã.
                            if (v !== 'Sim') {
                              form.setValue('tipos_deficiencia', [])
                              form.setValue('deficiencia_outro', '')
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('pcd') === 'Sim' && (
                    <FormField
                      control={form.control}
                      name="tipos_deficiencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque as opções que se aplicam</FormLabel>
                          <div className="space-y-2">
                            {DEFICIENCIAS.map((o) => (
                              <label
                                key={o}
                                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"
                              >
                                <Checkbox
                                  checked={field.value.includes(o)}
                                  onCheckedChange={(marcado) => {
                                    field.onChange(
                                      marcado === true
                                        ? [...field.value, o]
                                        : field.value.filter((a: string) => a !== o),
                                    )
                                    if (o === 'Outro' && marcado !== true) {
                                      form.setValue('deficiencia_outro', '')
                                    }
                                  }}
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch('tipos_deficiencia').includes('Outro') && (
                    <FormField
                      control={form.control}
                      name="deficiencia_outro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qual?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Descreva a deficiência"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Informações Socioeconômicas</h2>
                  <p className="text-sm text-muted-foreground">
                    São informações sigilosas, usadas apenas para acompanhamento e suporte.
                  </p>
                  <FormField
                    control={form.control}
                    name="ja_foi_aluna"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Já foi aluna do Projeto Força Feminina?</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tem_filhos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tem filho(s)?</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            if (v === 'Não') form.setValue('filho_aluno_taekwondo', '')
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FILHOS.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('tem_filhos') !== '' &&
                    form.watch('tem_filhos') !== 'Não' && (
                      <FormField
                        control={form.control}
                        name="filho_aluno_taekwondo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Ele(a) é aluno(a) da Escola de Taekwondo?
                            </FormLabel>
                            <FormDescription>
                              A Escola de Taekwondo é o projeto da associação.
                            </FormDescription>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  <FormField
                    control={form.control}
                    name="possui_cadunico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Possui CadÚnico?</FormLabel>
                        <FormDescription>
                          Cadastro Único do governo federal, usado para acessar programas sociais.
                        </FormDescription>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recebe_beneficio_social"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recebe algum benefício social?</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            if (v !== 'Sim') {
                              form.setValue('beneficios_sociais', [])
                              form.setValue('beneficio_outro', '')
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('recebe_beneficio_social') === 'Sim' && (
                    <FormField
                      control={form.control}
                      name="beneficios_sociais"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qual o benefício social recebido?</FormLabel>
                          {/* Escolha única; o valor segue como lista de um item para o backend. */}
                          <RadioGroup
                            value={field.value[0] ?? ''}
                            onValueChange={(v) => {
                              field.onChange([v])
                              if (v !== 'Outro') form.setValue('beneficio_outro', '')
                            }}
                            className="space-y-2"
                          >
                            {BENEFICIOS.map((o) => (
                              <label
                                key={o}
                                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"
                              >
                                <RadioGroupItem value={o} />
                                <span>{o}</span>
                              </label>
                            ))}
                          </RadioGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch('beneficios_sociais').includes('Outro') && (
                    <FormField
                      control={form.control}
                      name="beneficio_outro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qual?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Descreva o benefício"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="historico_violencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Já sofreu algum tipo de violência?</FormLabel>
                        <FormDescription>
                          Esta resposta é sigilosa e usada apenas para acompanhamento e suporte
                          institucional.
                        </FormDescription>
                        <Select
                          value={field.value}
                          onValueChange={(valor) => {
                            field.onChange(valor)
                            if (valor !== 'Sim') {
                              form.setValue('tipos_violencia', [])
                              form.setValue('medida_protetiva', '')
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VIOLENCIA.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('historico_violencia') === 'Sim' && (
                    <div className="space-y-5">
                      <FormField
                        control={form.control}
                        name="tipos_violencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qual(is) tipo(s) de violência?</FormLabel>
                            <FormDescription>Você pode selecionar mais de uma opção.</FormDescription>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {TIPOS_VIOLENCIA.map((tipo) => (
                                <label
                                  key={tipo}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={field.value.includes(tipo)}
                                    onCheckedChange={(marcado) =>
                                      field.onChange(
                                        marcado === true
                                          ? [...field.value, tipo]
                                          : field.value.filter((item) => item !== tipo),
                                      )
                                    }
                                  />
                                  <span>Violência {tipo.toLowerCase()}</span>
                                </label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medida_protetiva"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Possui medida protetiva?</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Sobre sua Participação</h2>
                  <FormField
                    control={form.control}
                    name="motivo_participar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Por que você gostaria de participar do Força Feminina?</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="Conte com suas palavras"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="como_conheceu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Como conheceu o projeto Força Feminina?</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            if (v !== 'Outro') form.setValue('como_conheceu_outro', '')
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMO_CONHECEU.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('como_conheceu') === 'Outro' && (
                    <FormField
                      control={form.control}
                      name="como_conheceu_outro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qual?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Conte como chegou até nós"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Crie seu Acesso</h2>
                  <p className="text-sm text-muted-foreground">
                    Defina o e-mail e a senha que você usará para entrar no sistema. O acesso será
                    liberado assim que sua inscrição for aprovada.
                  </p>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Mínimo 8 caracteres"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmar_senha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h2 className="text-xl font-semibold mb-4 pt-2">Termos e Condições</h2>
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground mb-6">
                    <p className="mb-2">
                      <strong>LGPD - Lei Geral de Proteção de Dados</strong>
                    </p>
                    <p>
                      Ao enviar este formulário, você concorda que a Associação de Taekwondo da
                      Grande Vitória (ATKDGV) colete e processe seus dados pessoais exclusivamente
                      para fins de inscrição, seleção e acompanhamento no Projeto Força Feminina IV.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="aceite_lgpd"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Aceito os termos da LGPD</FormLabel>
                          <CardDescription>
                            Li e concordo com os termos descritos acima.
                          </CardDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {step === 7 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Núcleo e Período</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Última etapa: escolha o local e o período que melhor se adaptam à sua rotina.
                  </p>
                  <FormField
                    control={form.control}
                    name="turma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Núcleo Desejado</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            // O horário depende do núcleo: trocar de núcleo invalida a escolha.
                            form.setValue('horario_preferido', '')
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-14 bg-muted/20">
                              <SelectValue placeholder="Selecione um núcleo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {nucleosDisponiveis.map((n) => (
                              <SelectItem key={n.codigo} value={n.codigo}>
                                {n.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {nucleosDisponiveis.length === 0 && (
                          <FormDescription className="text-amber-700">
                            Nenhum núcleo atende o município e o bairro informados. Volte ao endereço
                            para conferir os dados.
                          </FormDescription>
                        )}
                        {nucleoSelecionado &&
                          (nucleoSelecionado.zonas_prioritarias?.length ?? 0) > 0 && (
                            <FormDescription>
                              Área atendida:{' '}
                              {nucleoSelecionado.zonas_prioritarias
                                ?.map((zona) => zona.nome)
                                .join(', ')}
                              .
                            </FormDescription>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horario_preferido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário Desejado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!nucleoEscolhido || horariosDisponiveis.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger className="h-14 bg-muted/20">
                              <SelectValue
                                placeholder={
                                  nucleoEscolhido
                                    ? 'Selecione o horário'
                                    : 'Escolha o núcleo primeiro'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {horariosDisponiveis.map((h) => (
                              <SelectItem key={h.label} value={h.label}>
                                {h.label}
                                {h.dias ? ` · ${formatarDias(h.dias)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {nucleoEscolhido && horariosDisponiveis.length === 0
                            ? 'Este núcleo ainda não tem turmas abertas. Escolha outro núcleo ou tente novamente mais tarde.'
                            : 'A turma é definida pela equipe na aprovação da sua inscrição, respeitando o horário que você escolher.'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 8 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Espaço Kids</h2>
                  <p className="text-sm text-muted-foreground">
                    Este projeto oferece Espaço Kids, para que você possa participar das aulas com
                    seu filho ou filha acolhido no local.
                  </p>
                  <FormField
                    control={form.control}
                    name="espaco_kids_solicitado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Você precisa de vaga no Espaço Kids durante as aulas?
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            // Voltar para "Não" descarta os dados da criança já digitados.
                            if (v !== 'Sim') {
                              for (const campo of [
                                'crianca_nome',
                                'crianca_data_nascimento',
                                'crianca_necessidades_especiais',
                                'crianca_necessidades_descricao',
                                'crianca_restricao_alimentar',
                                'crianca_restricao_descricao',
                                'crianca_problema_saude',
                                'crianca_problema_saude_descricao',
                                'crianca_medicamento',
                                'crianca_medicamento_qual',
                              ] as const) {
                                form.setValue(campo, '')
                              }
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('espaco_kids_solicitado') === 'Sim' && (
                    <>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-medium">⚠️ As vagas do Espaço Kids são limitadas.</p>
                        <p className="mt-2">
                          Pedimos que solicite apenas se você realmente não tiver com quem deixar a
                          criança durante as aulas. Cada vaga ocupada sem necessidade é uma vaga a
                          menos para outra mulher que depende dela para conseguir participar.
                        </p>
                        <p className="mt-2">
                          O pedido passa por análise da coordenação e a resposta é enviada junto com
                          o resultado da sua inscrição.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="crianca_nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da criança</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome completo"
                                {...field}
                                className="h-11"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="crianca_data_nascimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de nascimento</FormLabel>
                            <FormDescription>
                              O Espaço Kids atende crianças de {IDADE_MIN_KIDS} a {IDADE_MAX_KIDS}{' '}
                              anos.
                            </FormDescription>
                            <FormControl>
                              <Input type="date" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="crianca_necessidades_especiais"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>A criança tem necessidades especiais?</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(v) => {
                                field.onChange(v)
                                if (v !== 'Sim') form.setValue('crianca_necessidades_descricao', '')
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('crianca_necessidades_especiais') === 'Sim' && (
                        <FormField
                          control={form.control}
                          name="crianca_necessidades_descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quais?</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Conte o que a equipe precisa saber para acolher bem"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="crianca_restricao_alimentar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>A criança tem restrição alimentar?</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(v) => {
                                field.onChange(v)
                                if (v !== 'Sim') form.setValue('crianca_restricao_descricao', '')
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('crianca_restricao_alimentar') === 'Sim' && (
                        <FormField
                          control={form.control}
                          name="crianca_restricao_descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qual?</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Ex.: intolerância à lactose, alergia a amendoim"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="crianca_problema_saude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>A criança tem algum problema de saúde?</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(v) => {
                                field.onChange(v)
                                if (v !== 'Sim')
                                  form.setValue('crianca_problema_saude_descricao', '')
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('crianca_problema_saude') === 'Sim' && (
                        <FormField
                          control={form.control}
                          name="crianca_problema_saude_descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qual?</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Descreva o quadro de saúde da criança"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="crianca_medicamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>A criança toma algum medicamento?</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(v) => {
                                field.onChange(v)
                                if (v !== 'Sim') form.setValue('crianca_medicamento_qual', '')
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('crianca_medicamento') === 'Sim' && (
                        <FormField
                          control={form.control}
                          name="crianca_medicamento_qual"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qual?</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Nome do medicamento, dose e horário"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

            </CardContent>

            <CardFooter className="p-6 border-t bg-muted/10 flex justify-between rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
                className="h-11 px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
              </Button>
              {step < totalSteps ? (
                <Button type="button" onClick={nextStep} className="h-11 px-6">
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="h-11 px-8 bg-rosa hover:bg-rosa/90">
                  Concluir Inscrição
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
