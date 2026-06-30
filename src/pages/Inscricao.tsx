import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { submitInscricao } from '@/services/inscricao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Shield, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
const formSchema = z.object({
  nome_completo: z.string().min(3, 'Nome completo é obrigatório'),
  data_nascimento: z.string().refine((val) => {
    return new Date().getFullYear() - new Date(val).getFullYear() >= 18
  }, 'Você deve ter pelo menos 18 anos'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().optional(),
  telefone: z.string().min(10, 'Telefone inválido'),
  cep: z.string().min(8, 'CEP inválido'),
  rua: z.string().min(1, 'Obrigatório'),
  numero: z.string().min(1, 'Obrigatório'),
  bairro: z.string().min(1, 'Obrigatório'),
  cidade: z.string().min(1, 'Obrigatório'),
  estado: z.string().min(2, 'Obrigatório'),
  turma: z.string().min(1, 'Selecione uma turma'),
  aceite_lgpd: z.boolean().refine((v) => v, 'É necessário autorizar'),
})

export default function Inscricao() {
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const totalSteps = 4

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { aceite_lgpd: false, rg: '' },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { rua, numero, ...rest } = values
    try {
      await submitInscricao({
        ...rest,
        endereco: `${rua}, ${numero}`,
      })
      setIsSubmitted(true)
      toast({ title: 'Inscrição recebida!' })
    } catch (err: any) {
      const response = err.response || {}
      if (response.fields) {
        Object.entries(response.fields).forEach(([field, msg]) => {
          form.setError(field as any, { message: msg as string })
        })
      }
      toast({
        title: 'Erro ao enviar',
        description: response.message || 'Verifique os campos.',
        variant: 'destructive',
      })
    }
  }

  const nextStep = async () => {
    const fields: Record<number, string[]> = {
      1: ['nome_completo', 'data_nascimento', 'cpf', 'telefone'],
      2: ['cep', 'rua', 'numero', 'bairro', 'cidade', 'estado'],
      3: ['turma'],
    }
    const isValid = await form.trigger(fields[step] as any)
    if (isValid) setStep((s) => Math.min(s + 1, totalSteps))
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-none shadow-xl animate-slide-up">
          <CardHeader>
            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Inscrição Recebida!</CardTitle>
            <CardDescription className="text-base mt-2">
              Sua inscrição foi registrada com sucesso. A administração avaliará os dados e entrará
              em contato pelo WhatsApp.
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
      <div className="w-full max-w-2xl mb-8 flex items-center justify-center gap-2">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-xl font-bold text-primary">Força Feminina</h1>
      </div>

      <Card className="w-full max-w-2xl border-none shadow-elevation animate-fade-in">
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
                            <Input placeholder="29000-000" {...field} className="h-11" />
                          </FormControl>
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
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Seleção de Turma</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Escolha o local e horário que melhor se adapta à sua rotina.
                  </p>
                  <FormField
                    control={form.control}
                    name="turma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turma Desejada</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 bg-muted/20">
                              <SelectValue placeholder="Selecione um núcleo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CENTRO_VITORIA">
                              Centro - Vitória (Sábados 14h-16h30)
                            </SelectItem>
                            <SelectItem value="AEST_SERRA">
                              Clube AEST - Serra (Sábados 9h-11h30)
                            </SelectItem>
                            <SelectItem value="ITAQUARI_CARIACICA">
                              Itaquari - Cariacica (Segundas 18h30-21h)
                            </SelectItem>
                            <SelectItem value="CONJUNTO_CARAPINA_SERRA">
                              Conj. Carapina I - Serra (Quartas 18h30-21h)
                            </SelectItem>
                            <SelectItem value="ATLANTICA_VILLE_VITORIA">
                              Atlântica Ville - Vitória (Sextas 18h30-21h)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5 animate-slide-up">
                  <h2 className="text-xl font-semibold mb-4">Termos e Condições</h2>
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
                <Button type="submit" className="h-11 px-8 bg-secondary hover:bg-secondary/90">
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
