import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitCadastroProfessor, CadastroProfessorError } from '@/services/cadastro-professor'
import {
  nacionalidadeOptions,
  estadoCivilOptions,
  vinculoContratualOptions,
  tamanhoCamisaOptions,
} from '@/lib/equipe-form'
import { buscarCep, formatCep } from '@/lib/viacep'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Shield, ArrowLeft, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { ProfissaoAutocomplete } from '@/components/ProfissaoAutocomplete'

// Campos de texto/seleção do formulário (documentos são tratados à parte).
const camposTexto = [
  'nome_completo',
  'telefone',
  'cpf',
  'data_nascimento',
  'rg',
  'nome_empresa',
  'cnpj',
  'nacionalidade',
  'estado_civil',
  'profissao',
  'cep_residencial',
  'logradouro_residencial',
  'numero_residencial',
  'complemento_residencial',
  'bairro_residencial',
  'cidade_residencial',
  'uf_residencial',
  'cep_comercial',
  'logradouro_comercial',
  'numero_comercial',
  'complemento_comercial',
  'bairro_comercial',
  'cidade_comercial',
  'uf_comercial',
  'tamanho_camisa',
  'nome_banco',
  'numero_banco',
  'conta',
  'agencia',
  'chave_pix',
  'vinculo_contratual',
  'vinculo_contratual_outro',
  'email',
  'senha',
] as const

type CampoTexto = (typeof camposTexto)[number]
type FormState = Record<CampoTexto, string>

const somenteZeros = (valor: string) => {
  const digitos = valor.replace(/\D/g, '')
  return digitos.length > 0 && /^0+$/.test(digitos)
}

const chavePixValida = (valor: string) => {
  const chave = valor.trim()
  const digitos = chave.replace(/\D/g, '')
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave) ||
    /^\+55\d{10,11}$/.test(chave.replace(/[\s()-]/g, '')) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chave) ||
    ((digitos.length === 11 || digitos.length === 14) && !somenteZeros(chave))
  )
}

const montarEndereco = (form: FormState, tipo: 'residencial' | 'comercial') => {
  const complemento = form[`complemento_${tipo}`].trim()
  return [
    `${form[`logradouro_${tipo}`].trim()}, nº ${form[`numero_${tipo}`].trim()}`,
    complemento,
    form[`bairro_${tipo}`].trim(),
    `${form[`cidade_${tipo}`].trim()} - ${form[`uf_${tipo}`].trim().toUpperCase()}`,
    `CEP ${form[`cep_${tipo}`].trim()}`,
  ]
    .filter(Boolean)
    .join(', ')
}

const estadoInicial: FormState = {
  nome_completo: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  rg: '',
  nome_empresa: '',
  cnpj: '',
  nacionalidade: '',
  estado_civil: '',
  profissao: '',
  cep_residencial: '',
  logradouro_residencial: '',
  numero_residencial: '',
  complemento_residencial: '',
  bairro_residencial: '',
  cidade_residencial: '',
  uf_residencial: '',
  cep_comercial: '',
  logradouro_comercial: '',
  numero_comercial: '',
  complemento_comercial: '',
  bairro_comercial: '',
  cidade_comercial: '',
  uf_comercial: '',
  tamanho_camisa: '',
  nome_banco: '',
  numero_banco: '',
  conta: '',
  agencia: '',
  chave_pix: '',
  vinculo_contratual: '',
  vinculo_contratual_outro: '',
  email: '',
  senha: '',
}

type DocKey =
  | 'rg_cpf_cnh'
  | 'comprovante_residencia'
  | 'curriculo'
  | 'cartao_cnpj'
  | 'registro_conselho'
  | 'contrato_social'

const documentosObrigatorios: { key: DocKey; label: string }[] = [
  { key: 'rg_cpf_cnh', label: 'RG e CPF ou CNH' },
  { key: 'comprovante_residencia', label: 'Comprovante de residência' },
  { key: 'curriculo', label: 'Currículo' },
  { key: 'cartao_cnpj', label: 'Cartão CNPJ' },
]

const documentosOpcionais: { key: DocKey; label: string }[] = [
  { key: 'registro_conselho', label: 'Comprovação de registro no conselho profissional' },
  { key: 'contrato_social', label: 'Contrato social da empresa' },
]

export default function CadastroProfessor() {
  const [form, setForm] = useState<FormState>(estadoInicial)
  const [arquivos, setArquivos] = useState<Partial<Record<DocKey, File>>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState<'residencial' | 'comercial' | null>(null)
  const [mesmoEndereco, setMesmoEndereco] = useState(false)

  const set = (campo: CampoTexto, valor: string) => {
    setForm((f) => {
      const proximo = { ...f, [campo]: valor }
      if (mesmoEndereco && campo.endsWith('_residencial')) {
        const campoComercial = campo.replace('_residencial', '_comercial') as CampoTexto
        proximo[campoComercial] = valor
      }
      return proximo
    })
    setErros((e) => {
      if (!e[campo]) return e
      const { [campo]: _removido, ...resto } = e
      return resto
    })
  }

  const setArquivo = (key: DocKey, file: File | undefined) => {
    setArquivos((a) => ({ ...a, [key]: file }))
    setErros((e) => {
      if (!e[key]) return e
      const { [key]: _removido, ...resto } = e
      return resto
    })
  }

  const consultarCep = async (tipo: 'residencial' | 'comercial', cepInformado?: string) => {
    const campoCep = `cep_${tipo}` as CampoTexto
    const cep = cepInformado ?? form[campoCep]
    if (cep.replace(/\D/g, '').length !== 8 || buscandoCep) return
    setBuscandoCep(tipo)
    const endereco = await buscarCep(cep)
    setBuscandoCep(null)
    if (!endereco) {
      setErros((e) => ({ ...e, [campoCep]: 'CEP não encontrado' }))
      return
    }
    setForm((f) => {
      const proximo = {
        ...f,
        [`logradouro_${tipo}`]: endereco.logradouro,
        [`bairro_${tipo}`]: endereco.bairro,
        [`cidade_${tipo}`]: endereco.cidade,
        [`uf_${tipo}`]: endereco.estado,
      }
      if (tipo === 'residencial' && mesmoEndereco) {
        proximo.logradouro_comercial = endereco.logradouro
        proximo.bairro_comercial = endereco.bairro
        proximo.cidade_comercial = endereco.cidade
        proximo.uf_comercial = endereco.estado
      }
      return proximo
    })
    setErros((e) => {
      const proximo = { ...e }
      delete proximo[campoCep]
      return proximo
    })
  }

  const alterarCep = (tipo: 'residencial' | 'comercial', valor: string) => {
    const cep = formatCep(valor)
    set(`cep_${tipo}` as CampoTexto, cep)
    if (cep.replace(/\D/g, '').length === 8) void consultarCep(tipo, cep)
  }

  const copiarEnderecoResidencial = (marcado: boolean) => {
    setMesmoEndereco(marcado)
    if (!marcado) return
    setForm((f) => ({
      ...f,
      cep_comercial: f.cep_residencial,
      logradouro_comercial: f.logradouro_residencial,
      numero_comercial: f.numero_residencial,
      complemento_comercial: f.complemento_residencial,
      bairro_comercial: f.bairro_residencial,
      cidade_comercial: f.cidade_residencial,
      uf_comercial: f.uf_residencial,
    }))
  }

  const validar = (): boolean => {
    const novos: Record<string, string> = {}
    const obrigatorios: CampoTexto[] = [
      'nome_completo',
      'telefone',
      'cpf',
      'data_nascimento',
      'rg',
      'nome_empresa',
      'cnpj',
      'nacionalidade',
      'estado_civil',
      'profissao',
      'cep_residencial',
      'logradouro_residencial',
      'numero_residencial',
      'bairro_residencial',
      'cidade_residencial',
      'uf_residencial',
      'cep_comercial',
      'logradouro_comercial',
      'numero_comercial',
      'bairro_comercial',
      'cidade_comercial',
      'uf_comercial',
      'tamanho_camisa',
      'nome_banco',
      'numero_banco',
      'conta',
      'agencia',
      'chave_pix',
      'vinculo_contratual',
      'email',
      'senha',
    ]
    obrigatorios.forEach((campo) => {
      if (!form[campo].trim()) novos[campo] = 'Campo obrigatório'
    })
    ;(['residencial', 'comercial'] as const).forEach((tipo) => {
      if (form[`cep_${tipo}`].replace(/\D/g, '').length !== 8)
        novos[`cep_${tipo}`] = 'Informe um CEP válido'
      if (form[`uf_${tipo}`] && !/^[A-Za-z]{2}$/.test(form[`uf_${tipo}`].trim()))
        novos[`uf_${tipo}`] = 'Informe a UF com 2 letras'
    })
    if (
      form.nome_banco &&
      (form.nome_banco.trim().length < 2 || /^\d+$/.test(form.nome_banco.trim()))
    )
      novos.nome_banco = 'Informe o nome válido da instituição bancária'
    if (
      form.numero_banco &&
      (!/^\d{3}$/.test(form.numero_banco.trim()) || somenteZeros(form.numero_banco))
    )
      novos.numero_banco = 'Informe o código bancário com 3 dígitos'
    if (
      form.agencia &&
      (!/^\d{1,6}(-?[0-9Xx])?$/.test(form.agencia.trim()) || somenteZeros(form.agencia))
    )
      novos.agencia = 'Informe uma agência válida'
    if (
      form.conta &&
      (!/^[0-9A-Za-z.-]{2,20}$/.test(form.conta.trim()) || somenteZeros(form.conta))
    )
      novos.conta = 'Informe uma conta válida, incluindo o dígito'
    if (form.chave_pix && !chavePixValida(form.chave_pix))
      novos.chave_pix = 'Use CPF/CNPJ, e-mail, telefone com +55 ou chave aleatória válida'
    if (form.profissao && !/^\d{4}-\d{2} - .+/.test(form.profissao))
      novos.profissao = 'Selecione uma profissão na lista oficial da CBO'
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      novos.email = 'E-mail inválido'
    if (form.senha && form.senha.length < 8)
      novos.senha = 'A senha deve ter pelo menos 8 caracteres'
    if (form.vinculo_contratual === 'Outro' && !form.vinculo_contratual_outro.trim())
      novos.vinculo_contratual_outro = 'Descreva o vínculo'
    documentosObrigatorios.forEach(({ key }) => {
      if (!arquivos[key]) novos[key] = 'Documento obrigatório'
    })
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) {
      toast({ title: 'Revise os campos destacados', variant: 'destructive' })
      return
    }
    setEnviando(true)
    const fd = new FormData()
    camposTexto.forEach((campo) => {
      fd.append(campo, form[campo])
    })
    fd.append('endereco_residencial', montarEndereco(form, 'residencial'))
    fd.append('endereco_comercial', montarEndereco(form, 'comercial'))
    fd.append(
      'dados_bancarios',
      [
        `Nome do banco: ${form.nome_banco.trim()}`,
        `Nº do banco: ${form.numero_banco.trim()}`,
        `Conta: ${form.conta.trim()}`,
        `Agência: ${form.agencia.trim()}`,
        `Chave pix: ${form.chave_pix.trim()}`,
      ].join('\n'),
    )
    Object.entries(arquivos).forEach(([key, file]) => {
      if (file) fd.append(key, file)
    })
    try {
      await submitCadastroProfessor(fd)
      setEnviado(true)
      toast({ title: 'Cadastro enviado!' })
    } catch (err) {
      if (err instanceof CadastroProfessorError && err.fields) {
        setErros(err.fields)
      }
      toast({
        title: 'Erro ao enviar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-none shadow-xl animate-slide-up">
          <CardHeader>
            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Cadastro enviado!</CardTitle>
            <CardDescription className="text-base mt-2">
              Seu cadastro foi registrado e está aguardando aprovação da Gestão. Assim que for
              aprovado e o seu núcleo definido, você poderá entrar no sistema com o e-mail e a senha
              cadastrados.
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

  const erroMsg = (campo: string) =>
    erros[campo] ? <p className="text-sm text-destructive">{erros[campo]}</p> : null

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-primary">Força Feminina</h1>
        </div>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
        <Card className="border-none shadow-elevation">
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro da Equipe</CardTitle>
            <CardDescription>
              Preencha a ficha para se cadastrar como membro da equipe. O acesso é liberado após a
              aprovação da Gestão, que também define o seu núcleo.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Dados pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                value={form.nome_completo}
                onChange={(e) => set('nome_completo', e.target.value)}
              />
              {erroMsg('nome_completo')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
                {erroMsg('telefone')}
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento *</Label>
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => set('data_nascimento', e.target.value)}
                />
                {erroMsg('data_nascimento')}
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
                {erroMsg('cpf')}
              </div>
              <div className="space-y-2">
                <Label>RG *</Label>
                <Input value={form.rg} onChange={(e) => set('rg', e.target.value)} />
                {erroMsg('rg')}
              </div>
              <div className="space-y-2">
                <Label>Nacionalidade *</Label>
                <Select value={form.nacionalidade} onValueChange={(v) => set('nacionalidade', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nacionalidadeOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erroMsg('nacionalidade')}
              </div>
              <div className="space-y-2">
                <Label>Estado civil *</Label>
                <Select value={form.estado_civil} onValueChange={(v) => set('estado_civil', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {estadoCivilOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erroMsg('estado_civil')}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profissão *</Label>
              <ProfissaoAutocomplete
                value={form.profissao}
                onChange={(valor) => set('profissao', valor)}
              />
              {erroMsg('profissao')}
            </div>
          </CardContent>
        </Card>

        {/* Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Empresa / MEI</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da empresa/MEI *</Label>
              <Input
                value={form.nome_empresa}
                onChange={(e) => set('nome_empresa', e.target.value)}
              />
              {erroMsg('nome_empresa')}
            </div>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
              {erroMsg('cnpj')}
            </div>
          </CardContent>
        </Card>

        {/* Endereços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-7">
            <BlocoEndereco
              titulo="Endereço residencial"
              tipo="residencial"
              form={form}
              set={set}
              alterarCep={alterarCep}
              consultarCep={consultarCep}
              buscando={buscandoCep === 'residencial'}
              erroMsg={erroMsg}
            />

            <div className="border-t pt-6 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold">Endereço comercial</h3>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={mesmoEndereco}
                    onChange={(e) => copiarEnderecoResidencial(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Mesmo endereço residencial
                </label>
              </div>
              <BlocoEndereco
                tipo="comercial"
                form={form}
                set={set}
                alterarCep={alterarCep}
                consultarCep={consultarCep}
                buscando={buscandoCep === 'comercial'}
                erroMsg={erroMsg}
                ocultarTitulo
              />
            </div>
          </CardContent>
        </Card>

        {/* Uniforme, pagamento e vínculo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uniforme, dados bancários e vínculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tamanho da camisa *</Label>
              <Select value={form.tamanho_camisa} onValueChange={(v) => set('tamanho_camisa', v)}>
                <SelectTrigger className="sm:w-[280px]">
                  <SelectValue placeholder="Selecione o tamanho..." />
                </SelectTrigger>
                <SelectContent>
                  {tamanhoCamisaOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erroMsg('tamanho_camisa')}
            </div>
            <div className="space-y-4">
              <Label className="text-base">Dados bancários</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome do banco *</Label>
                  <Input
                    value={form.nome_banco}
                    onChange={(e) => set('nome_banco', e.target.value)}
                  />
                  {erroMsg('nome_banco')}
                </div>
                <div className="space-y-2">
                  <Label>Nº do banco *</Label>
                  <Input
                    value={form.numero_banco}
                    onChange={(e) => set('numero_banco', e.target.value)}
                  />
                  {erroMsg('numero_banco')}
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Input value={form.conta} onChange={(e) => set('conta', e.target.value)} />
                  {erroMsg('conta')}
                </div>
                <div className="space-y-2">
                  <Label>Agência *</Label>
                  <Input value={form.agencia} onChange={(e) => set('agencia', e.target.value)} />
                  {erroMsg('agencia')}
                </div>
                <div className="space-y-2">
                  <Label>Chave pix *</Label>
                  <Input
                    value={form.chave_pix}
                    onChange={(e) => set('chave_pix', e.target.value)}
                  />
                  {erroMsg('chave_pix')}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vínculo contratual *</Label>
              <Select
                value={form.vinculo_contratual}
                onValueChange={(v) => set('vinculo_contratual', v)}
              >
                <SelectTrigger className="sm:w-[320px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {vinculoContratualOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erroMsg('vinculo_contratual')}
              {form.vinculo_contratual === 'Outro' && (
                <div className="pt-2">
                  <Input
                    placeholder="Descreva o vínculo"
                    value={form.vinculo_contratual_outro}
                    onChange={(e) => set('vinculo_contratual_outro', e.target.value)}
                  />
                  {erroMsg('vinculo_contratual_outro')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acesso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados de acesso</CardTitle>
            <CardDescription>
              Use estes dados para entrar no sistema após a aprovação.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              {erroMsg('email')}
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={form.senha}
                onChange={(e) => set('senha', e.target.value)}
              />
              {erroMsg('senha')}
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos</CardTitle>
            <CardDescription>Anexe os documentos em PDF ou imagem (JPG/PNG).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentosObrigatorios.map(({ key, label }) => (
              <DocumentoInput
                key={key}
                label={`${label} *`}
                file={arquivos[key]}
                onChange={(f) => setArquivo(key, f)}
                erro={erros[key]}
              />
            ))}
            {documentosOpcionais.map(({ key, label }) => (
              <DocumentoInput
                key={key}
                label={`${label} (se necessário)`}
                file={arquivos[key]}
                onChange={(f) => setArquivo(key, f)}
              />
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={enviando} className="gap-2">
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar cadastro
          </Button>
        </div>
      </form>
    </div>
  )
}

function BlocoEndereco({
  titulo,
  tipo,
  form,
  set,
  alterarCep,
  consultarCep,
  buscando,
  erroMsg,
  ocultarTitulo = false,
}: {
  titulo?: string
  tipo: 'residencial' | 'comercial'
  form: FormState
  set: (campo: CampoTexto, valor: string) => void
  alterarCep: (tipo: 'residencial' | 'comercial', valor: string) => void
  consultarCep: (tipo: 'residencial' | 'comercial') => Promise<void>
  buscando: boolean
  erroMsg: (campo: string) => React.ReactNode
  ocultarTitulo?: boolean
}) {
  const campo = (nome: string) => `${nome}_${tipo}` as CampoTexto

  return (
    <div className="space-y-4">
      {!ocultarTitulo && <h3 className="font-semibold">{titulo}</h3>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="space-y-2 sm:col-span-2">
          <Label>CEP *</Label>
          <div className="relative">
            <Input
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
              value={form[campo('cep')]}
              onChange={(e) => alterarCep(tipo, e.target.value)}
              onBlur={() => void consultarCep(tipo)}
              className={buscando ? 'pr-10' : undefined}
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {erroMsg(campo('cep'))}
        </div>
        <div className="space-y-2 sm:col-span-4">
          <Label>Logradouro *</Label>
          <Input
            placeholder="Rua, avenida..."
            value={form[campo('logradouro')]}
            onChange={(e) => set(campo('logradouro'), e.target.value)}
          />
          {erroMsg(campo('logradouro'))}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Número *</Label>
          <Input
            placeholder="Número ou S/N"
            value={form[campo('numero')]}
            onChange={(e) => set(campo('numero'), e.target.value)}
          />
          {erroMsg(campo('numero'))}
        </div>
        <div className="space-y-2 sm:col-span-4">
          <Label>Complemento</Label>
          <Input
            placeholder="Apartamento, bloco, referência..."
            value={form[campo('complemento')]}
            onChange={(e) => set(campo('complemento'), e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-3">
          <Label>Bairro *</Label>
          <Input
            value={form[campo('bairro')]}
            onChange={(e) => set(campo('bairro'), e.target.value)}
          />
          {erroMsg(campo('bairro'))}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Cidade *</Label>
          <Input
            value={form[campo('cidade')]}
            onChange={(e) => set(campo('cidade'), e.target.value)}
          />
          {erroMsg(campo('cidade'))}
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label>UF *</Label>
          <Input
            placeholder="ES"
            maxLength={2}
            value={form[campo('uf')]}
            onChange={(e) => set(campo('uf'), e.target.value.toUpperCase())}
          />
          {erroMsg(campo('uf'))}
        </div>
      </div>
    </div>
  )
}

function DocumentoInput({
  label,
  file,
  onChange,
  erro,
}: {
  label: string
  file: File | undefined
  onChange: (f: File | undefined) => void
  erro?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-muted-foreground" />
        {label}
      </Label>
      <Input type="file" accept=".pdf,image/*" onChange={(e) => onChange(e.target.files?.[0])} />
      {file && <p className="text-xs text-muted-foreground">Selecionado: {file.name}</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  )
}
