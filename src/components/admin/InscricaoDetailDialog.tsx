import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FichaInscricaoFF } from '@/lib/types'
import { formatarNucleo, getStatusInfo } from '@/lib/constants'
import { PONTUACAO_MAXIMA, formatarPontos, pontosDoCriterio } from '@/lib/pontuacao'
import VagaCriancaCard from '@/components/admin/VagaCriancaCard'
import { Campo, SecaoDados } from '@/components/Dados'
import {
  BadgeCheck,
  Baby,
  CircleMinus,
  Heart,
  HeartHandshake,
  Home,
  IdCard,
  MapPin,
  Quote,
  Target,
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
} from 'lucide-react'

interface Props {
  inscricao: FichaInscricaoFF | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Gestão e Administrativo decidem a vaga da criança; os demais perfis só visualizam. */
  podeDecidirVagaCrianca?: boolean
  podeDecidirInscricao?: boolean
  decidindo?: boolean
  nucleoLotado?: boolean
  onAprovar?: () => void
  onListaEspera?: () => void
  onMarcarAnalise?: () => void
  onCancelar?: () => void
}

/** "Sim" + descrição vira "Sim — texto"; "Não" fica só "Não". */
function comDetalhe(resposta?: string, detalhe?: string): string | undefined {
  if (!resposta) return undefined
  return detalhe && detalhe.trim() ? `${resposta} — ${detalhe}` : resposta
}

function idade(nascimento?: string): string {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return '—'
  const data = new Date(`${nascimento}T12:00:00`)
  if (Number.isNaN(data.getTime())) return '—'
  const hoje = new Date()
  let anos = hoje.getFullYear() - data.getFullYear()
  const mes = hoje.getMonth() - data.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) anos--
  return `${data.toLocaleDateString('pt-BR')} (${anos} anos)`
}

export function InscricaoDetailDialog({
  inscricao,
  open,
  onOpenChange,
  podeDecidirVagaCrianca = false,
  podeDecidirInscricao = false,
  decidindo = false,
  nucleoLotado = false,
  onAprovar,
  onListaEspera,
  onMarcarAnalise,
  onCancelar,
}: Props) {
  if (!inscricao) return null
  const status = getStatusInfo(inscricao.status)
  const created = inscricao.created ? new Date(inscricao.created).toLocaleString('pt-BR') : '—'
  const pediuKids = inscricao.espaco_kids_solicitado === 'Sim'
  const pontos = inscricao.pontuacao_prioridade ?? 0
  const atendidos = inscricao.criterios_prioridade ?? []
  const naoAtendidos = inscricao.criterios_nao_atendidos ?? []
  const decisaoAberta = ['AGUARDANDO', 'EM_ANALISE', 'LISTA_ESPERA'].includes(inscricao.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* O container não rola: quem rola é o corpo. Assim o X do canto fica sempre visível. */}
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-3 border-b px-6 py-4 pr-14">
          <DialogTitle className="text-lg leading-tight">{inscricao.nome_completo}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.color} variant="secondary">
              {status.label}
            </Badge>
            <Badge variant="outline" className="font-semibold">
              {pontos} / {PONTUACAO_MAXIMA} pontos
            </Badge>
            <span className="text-xs text-muted-foreground">Inscrição: {created}</span>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* A pontuação abre a análise: é ela que decide a posição na fila. */}
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Pontuação de prioridade</h3>
              <span className="ml-auto text-2xl font-bold tabular-nums">{pontos}</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15"
              role="img"
              aria-label={`${pontos} de ${PONTUACAO_MAXIMA} pontos`}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (pontos / PONTUACAO_MAXIMA) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Morar na cidade e na zona prioritária do núcleo vale 80 dos {PONTUACAO_MAXIMA} pontos.
              Os outros nove critérios dividem os 20 restantes; critério não atendido não pontua.
            </p>

            {atendidos.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Critérios atendidos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {atendidos.map((criterio) => (
                    <Badge key={criterio} variant="secondary" className="gap-1 font-normal">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {criterio}
                      <strong className="font-semibold">
                        +{formatarPontos(pontosDoCriterio(criterio))}
                      </strong>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {naoAtendidos.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Critérios não atendidos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {naoAtendidos.map((criterio) => (
                    <Badge
                      key={criterio}
                      variant="outline"
                      className="gap-1 font-normal text-muted-foreground"
                    >
                      <CircleMinus className="h-3.5 w-3.5" />
                      {criterio}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>

          <SecaoDados titulo="Identificação" icone={IdCard}>
            <Campo rotulo="Nome completo" valor={inscricao.nome_completo} />
            <Campo rotulo="CPF" valor={inscricao.cpf} />
            <Campo rotulo="RG" valor={inscricao.rg} />
            <Campo rotulo="Data de nascimento" valor={idade(inscricao.data_nascimento)} />
            <Campo rotulo="Telefone" valor={inscricao.telefone} />
            <Campo rotulo="E-mail" valor={inscricao.email} />
          </SecaoDados>

          <SecaoDados titulo="Endereço" icone={MapPin}>
            <Campo rotulo="CEP" valor={inscricao.cep} />
            <Campo rotulo="Endereço" valor={inscricao.endereco} />
            <Campo rotulo="Bairro" valor={inscricao.bairro} />
            <Campo rotulo="Cidade" valor={inscricao.cidade} />
            <Campo rotulo="Estado" valor={inscricao.estado} />
            <Campo rotulo="Zona" valor={inscricao.zona_residencia} />
          </SecaoDados>

          <SecaoDados titulo="Identidade e diversidade" icone={Heart}>
            <Campo rotulo="Gênero" valor={inscricao.genero} />
            <Campo
              rotulo="Orientação sexual"
              valor={comDetalhe(inscricao.orientacao_sexual, inscricao.orientacao_sexual_outro)}
            />
            <Campo rotulo="Cor ou raça/etnia" valor={inscricao.cor_raca} />
            <Campo
              rotulo="Pessoa com deficiência"
              valor={comDetalhe(
                inscricao.pcd,
                [inscricao.tipos_deficiencia, inscricao.deficiencia_outro]
                  .filter(Boolean)
                  .join(' · '),
              )}
            />
          </SecaoDados>

          <SecaoDados titulo="Perfil socioeconômico" icone={Home}>
            <Campo rotulo="Já foi aluna do projeto" valor={inscricao.ja_foi_aluna} />
            <Campo rotulo="Tem filhos" valor={inscricao.tem_filhos} />
            <Campo rotulo="Filho na Escola de Taekwondo" valor={inscricao.filho_aluno_taekwondo} />
            <Campo rotulo="Possui CadÚnico" valor={inscricao.possui_cadunico} />
            <Campo
              rotulo="Recebe benefício social"
              valor={comDetalhe(
                inscricao.recebe_beneficio_social,
                [inscricao.beneficios_sociais, inscricao.beneficio_outro]
                  .filter(Boolean)
                  .join(' · '),
              )}
              largo
            />
          </SecaoDados>

          <SecaoDados titulo="Histórico de violência" icone={HeartHandshake}>
            <Campo
              rotulo="Já sofreu violência"
              valor={comDetalhe(inscricao.historico_violencia, inscricao.tipos_violencia)}
            />
            <Campo rotulo="Possui medida protetiva" valor={inscricao.medida_protetiva} />
          </SecaoDados>

          <SecaoDados titulo="Participação" icone={Target}>
            <Campo rotulo="Núcleo" valor={formatarNucleo(inscricao.turma)} />
            <Campo rotulo="Horário desejado" valor={inscricao.horario_preferido} />
            <Campo
              rotulo="Como conheceu o projeto"
              valor={comDetalhe(inscricao.como_conheceu, inscricao.como_conheceu_outro)}
            />
            <Campo rotulo="Data da primeira aula" valor={inscricao.data_primeira_aula} />
          </SecaoDados>

          {inscricao.motivo_participar && (
            <SecaoDados titulo="Por que gostaria de participar" icone={Quote} semGrade>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {inscricao.motivo_participar}
              </p>
            </SecaoDados>
          )}

          {inscricao.espaco_kids_solicitado && (
            <SecaoDados titulo="Espaço Kids" icone={Baby}>
              <Campo rotulo="Pediu vaga" valor={inscricao.espaco_kids_solicitado} />
              {pediuKids && (
                <>
                  <Campo rotulo="Nome da criança" valor={inscricao.crianca_nome} />
                  <Campo
                    rotulo="Nascimento da criança"
                    valor={idade(inscricao.crianca_data_nascimento)}
                  />
                  <Campo
                    rotulo="Necessidades especiais"
                    valor={comDetalhe(
                      inscricao.crianca_necessidades_especiais,
                      inscricao.crianca_necessidades_descricao,
                    )}
                  />
                  <Campo
                    rotulo="Restrição alimentar"
                    valor={comDetalhe(
                      inscricao.crianca_restricao_alimentar,
                      inscricao.crianca_restricao_descricao,
                    )}
                  />
                  <Campo
                    rotulo="Problema de saúde"
                    valor={comDetalhe(
                      inscricao.crianca_problema_saude,
                      inscricao.crianca_problema_saude_descricao,
                    )}
                  />
                  <Campo
                    rotulo="Medicamento"
                    valor={comDetalhe(
                      inscricao.crianca_medicamento,
                      inscricao.crianca_medicamento_qual,
                    )}
                  />
                </>
              )}
            </SecaoDados>
          )}

          <VagaCriancaCard inscricaoId={inscricao.id} podeDecidir={podeDecidirVagaCrianca} />

          {(inscricao.data_primeira_aula_definida_por_nome || inscricao.motivo_cancelamento) && (
            <>
              <Separator />
              <div className="space-y-2 pb-1">
                {inscricao.data_primeira_aula_definida_por_nome && (
                  <p className="text-xs text-muted-foreground">
                    Data da 1ª aula definida por {inscricao.data_primeira_aula_definida_por_nome}
                    {inscricao.data_primeira_aula_definida_em
                      ? ` em ${new Date(inscricao.data_primeira_aula_definida_em).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                )}
                {inscricao.motivo_cancelamento && (
                  <Campo rotulo="Motivo do cancelamento" valor={inscricao.motivo_cancelamento} />
                )}
              </div>
            </>
          )}
        </div>

        {podeDecidirInscricao && decisaoAberta && (
          <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-card px-6 py-4 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {inscricao.status === 'AGUARDANDO' && onMarcarAnalise && (
                <Button variant="outline" onClick={onMarcarAnalise} disabled={decidindo}>
                  <Clock3 className="mr-2 h-4 w-4" /> Em análise
                </Button>
              )}
              {onCancelar && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onCancelar}
                  disabled={decidindo}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar inscrição
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {inscricao.status !== 'LISTA_ESPERA' && onListaEspera && (
                <Button variant="outline" onClick={onListaEspera} disabled={decidindo}>
                  <Clock3 className="mr-2 h-4 w-4" /> Lista de espera
                </Button>
              )}
              {onAprovar && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={onAprovar}
                  disabled={decidindo || nucleoLotado}
                  title={nucleoLotado ? 'O núcleo não tem vagas disponíveis' : undefined}
                >
                  {decidindo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {nucleoLotado ? 'Limite preenchido' : 'Aprovar vaga'}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
