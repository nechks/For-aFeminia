import { useMemo } from 'react'
import { PieChart, Pie, Cell, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PIE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7']

export interface DistribuicaoSocioeconomica {
  rendaFamiliar: Record<string, number>
  tipoMoradia: Record<string, number>
}

function Pizza({
  titulo,
  descricao,
  dados,
}: {
  titulo: string
  descricao: string
  dados: { name: string; value: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma ficha de confirmação com esta informação ainda.
          </p>
        ) : (
          <ChartContainer config={{ value: { label: 'Alunas' } }} className="h-[300px] w-full">
            <PieChart>
              <Pie
                data={dados}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label
              >
                {dados.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Gráficos do perfil socioeconômico (renda e moradia). Usados no painel da Gestão e na página da
 * Assistente Social. Os dados vêm memorizados para o Recharts não refazer a animação a cada render.
 */
export default function GraficosSocioeconomicos({ dados }: { dados: DistribuicaoSocioeconomica }) {
  const renda = useMemo(
    () => Object.entries(dados.rendaFamiliar).map(([name, value]) => ({ name, value })),
    [dados.rendaFamiliar],
  )
  const moradia = useMemo(
    () => Object.entries(dados.tipoMoradia).map(([name, value]) => ({ name, value })),
    [dados.tipoMoradia],
  )
  return (
    <>
      <Pizza
        titulo="Perfil Socioeconômico — Renda"
        descricao="Distribuição de renda familiar per capita"
        dados={renda}
      />
      <Pizza
        titulo="Perfil Socioeconômico — Moradia"
        descricao="Tipo de moradia das alunas"
        dados={moradia}
      />
    </>
  )
}
