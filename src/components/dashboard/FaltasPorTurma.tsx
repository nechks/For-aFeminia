import { PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatarAulas, formatarDias, turnoLabel } from '@/lib/turmas'
import type { IndicadorTurma } from '@/services/indicadores'
import { CircleCheck, CircleAlert, CircleX, PieChart as PieIcon } from 'lucide-react'

/**
 * Paleta de estado (não de série): presença é "good", falta justificada é "warning" e falta sem
 * justificativa é "critical". Warning fica abaixo de 3:1 no fundo claro de propósito — por isso
 * cada fatia vem com ícone e rótulo visível ao lado, nunca só a cor.
 */
const FATIAS = [
  { chave: 'presencas', rotulo: 'Presenças', cor: '#0ca30c', icone: CircleCheck },
  { chave: 'faltas_justificadas', rotulo: 'Faltas justificadas', cor: '#fab219', icone: CircleAlert },
  {
    chave: 'faltas_sem_justificativa',
    rotulo: 'Faltas sem justificativa',
    cor: '#d03b3b',
    icone: CircleX,
  },
] as const

function PizzaTurma({ turma, onClick }: { turma: IndicadorTurma; onClick: () => void }) {
  const dados = FATIAS.map((f) => ({
    name: f.rotulo,
    value: turma[f.chave],
    fill: f.cor,
  })).filter((d) => d.value > 0)

  const total = turma.presencas + turma.faltas_justificadas + turma.faltas_sem_justificativa
  const faltas = turma.faltas_justificadas + turma.faltas_sem_justificativa
  const percentualFaltas = total > 0 ? Math.round((faltas / total) * 100) : 0

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{turma.turma_nome}</span>
          <Badge variant="secondary" className="shrink-0">
            {turnoLabel(turma.turno)}
          </Badge>
        </CardTitle>
        <p className="truncate text-xs text-muted-foreground">
          🏠 {turma.nucleo_nome} · {formatarDias(turma.dias_semana)} · {turma.alunas} aluna(s)
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma chamada registrada nesta turma ainda.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <ChartContainer
                config={{ value: { label: 'Aulas' } }}
                className="h-[140px] w-[140px]"
              >
                <PieChart>
                  <Pie
                    data={dados}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {dados.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none">{percentualFaltas}%</span>
                <span className="text-[10px] text-muted-foreground">faltas</span>
              </div>
            </div>
            {/* Rótulo visível por fatia: a cor nunca carrega o significado sozinha. */}
            <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
              {FATIAS.map((f) => {
                const Icone = f.icone
                return (
                  <li key={f.chave} className="flex items-center gap-2">
                    <Icone className="h-3.5 w-3.5 shrink-0" style={{ color: f.cor }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {f.rotulo}
                    </span>
                    <strong className="shrink-0 tabular-nums">
                      {formatarAulas(turma[f.chave])}
                    </strong>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function FaltasPorTurma({
  turmas,
  onSelecionar,
}: {
  turmas: IndicadorTurma[]
  onSelecionar: (turma: IndicadorTurma) => void
}) {
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <PieIcon className="h-5 w-5 text-primary" /> Faltas por turma
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Cada chamada vale meia aula. Clique numa turma para ver as alunas.
      </p>
      {turmas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma turma ativa. Abra turmas nos núcleos para acompanhar as faltas aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {turmas.map((t) => (
            <PizzaTurma key={t.turma_id} turma={t} onClick={() => onSelecionar(t)} />
          ))}
        </div>
      )}
    </div>
  )
}
