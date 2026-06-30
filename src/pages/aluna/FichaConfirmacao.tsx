import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/store/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { ShieldAlert } from 'lucide-react'

export default function FichaConfirmacao() {
  const { user, submitFichaConfirmacao, inscricoes } = useApp()
  const navigate = useNavigate()
  const minhaInscricao = inscricoes.find((i) => i.user_id === user?.id)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!minhaInscricao || minhaInscricao.status !== 'APROVADA') {
    return (
      <div className="p-8 text-center">
        Acesso negado. Apenas alunas aprovadas podem preencher esta ficha.
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      submitFichaConfirmacao(user!.id, { preenchidaEm: new Date().toISOString() })
      toast({ title: 'Ficha enviada com sucesso!', description: 'Bem-vinda ao Força Feminina!' })
      navigate('/aluna/dashboard')
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ficha de Confirmação</h1>
        <p className="text-muted-foreground mt-1">
          Preencha com atenção. Estes dados são essenciais para o acompanhamento da equipe
          multidisciplinar.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex gap-3 text-sm">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          <strong>Privacidade e Sigilo:</strong> As informações das seções de Saúde, Socioeconômico
          e Vulnerabilidade são de nível <em>Confidencial</em> e acessadas exclusivamente pela
          Assistente Social e Coordenação do projeto.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline font-semibold">
                  1. Confirmação de Turma e Dados Base
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Turma Selecionada</Label>
                      <Input
                        value={(minhaInscricao.turma ?? '').replace(/_/g, ' ')}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Nome Completo</Label>
                      <Input value={minhaInscricao.nome_completo} disabled className="bg-muted" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline font-semibold">
                  2. Tamanhos de Uniforme
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-2 pb-4">
                  <div className="space-y-3">
                    <Label>Tamanho da Camisa</Label>
                    <RadioGroup defaultValue="M" className="flex gap-4">
                      {['PP', 'P', 'M', 'G', 'GG', 'XG'].map((size) => (
                        <div className="flex items-center space-x-2" key={size}>
                          <RadioGroupItem value={size} id={`c-${size}`} />
                          <Label htmlFor={`c-${size}`}>{size}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline font-semibold">
                  3. Questionário de Saúde
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="space-y-2">
                    <Label>Possui alguma comorbidade ou restrição física?</Label>
                    <Textarea placeholder="Ex: Asma, problemas articulares, hipertensão..." />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="medicacao" />
                    <Label htmlFor="medicacao">Faço uso contínuo de medicação</Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline font-semibold text-primary">
                  4. Perfil Socioeconômico (Confidencial)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Situação de Trabalho Atual</Label>
                      <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                        <option>Desempregada</option>
                        <option>Trabalho Informal</option>
                        <option>CLT</option>
                        <option>Autônoma</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Renda Familiar Per Capita</Label>
                      <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option>Até 1/2 salário mínimo</option>
                        <option>De 1/2 a 1 salário mínimo</option>
                        <option>Mais de 1 salário mínimo</option>
                      </select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-8"
                className="border rounded-lg px-4 bg-card border-primary/20 bg-primary/5"
              >
                <AccordionTrigger className="hover:no-underline font-semibold">
                  5. Termos Finais
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="term1" required className="mt-1" />
                    <Label htmlFor="term1" className="leading-snug">
                      Estou ciente da carga horária e me comprometo a ter no mínimo 75% de
                      frequência para manter a vaga e receber o certificado.
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="term2" required className="mt-1" />
                    <Label htmlFor="term2" className="leading-snug">
                      Confirmo a veracidade de todas as informações prestadas neste formulário sob
                      as penas da lei.
                    </Label>
                  </div>
                  <CardDescription>Li e concordo com os termos descritos acima.</CardDescription>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          <div className="p-6 pt-0 flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="px-8 bg-secondary hover:bg-secondary/90"
            >
              {isSubmitting ? 'Enviando...' : 'Finalizar Confirmação'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
