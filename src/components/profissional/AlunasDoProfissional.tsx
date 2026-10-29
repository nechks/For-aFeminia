import { useEffect, useState } from 'react'
import {
  getAlunasDoProfissional,
  getPerfilAluna,
  type AlunaPerfil,
  type AlunaResumo,
} from '@/services/alunas-profissional'
import { fileUrl } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Campo, SecaoDados } from '@/components/Dados'
import { HeartPulse, IdCard, Loader2, Search, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react'

/** Foto da aluna; sem foto, um ícone de pessoa no lugar. */
function FotoAluna({ nome, avatar, tamanho }: { nome: string; avatar?: string | null; tamanho: string }) {
  return (
    <Avatar className={tamanho}>
      {avatar && <AvatarImage src={fileUrl(avatar)} alt={`Foto de ${nome}`} className="object-cover" />}
      <AvatarFallback className="bg-secondary text-secondary-foreground">
        <UserRound className="h-1/2 w-1/2" aria-hidden />
      </AvatarFallback>
    </Avatar>
  )
}

function idade(nascimento?: string | null): string | undefined {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return nascimento ?? undefined
  const data = new Date(`${nascimento}T12:00:00`)
  const hoje = new Date()
  let anos = hoje.getFullYear() - data.getFullYear()
  const mes = hoje.getMonth() - data.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) anos--
  return `${data.toLocaleDateString('pt-BR')} (${anos} anos)`
}

/**
 * Aba "Alunas" do perfil profissional. A lista mostra só nome, foto e turma; saúde e medida
 * protetiva aparecem apenas no perfil individual, e o backend registra cada abertura.
 */
export default function AlunasDoProfissional() {
  const [busca, setBusca] = useState('')
  const [alunas, setAlunas] = useState<AlunaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [selecionada, setSelecionada] = useState<AlunaResumo | null>(null)
  const [perfil, setPerfil] = useState<AlunaPerfil | null>(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(false)
  const [erroPerfil, setErroPerfil] = useState('')

  // A busca vai ao servidor, com uma pausa curta para não disparar uma requisição por tecla.
  useEffect(() => {
    let ativo = true
    const id = setTimeout(() => {
      getAlunasDoProfissional(busca)
        .then((lista) => ativo && (setAlunas(lista), setErro('')))
        .catch((e) => ativo && setErro(getErrorMessage(e)))
        .finally(() => ativo && setCarregando(false))
    }, 300)
    return () => {
      ativo = false
      clearTimeout(id)
    }
  }, [busca])

  const abrir = async (aluna: AlunaResumo) => {
    setSelecionada(aluna)
    setPerfil(null)
    setErroPerfil('')
    setCarregandoPerfil(true)
    try {
      setPerfil(await getPerfilAluna(aluna.user_id))
    } catch (e) {
      setErroPerfil(getErrorMessage(e))
    } finally {
      setCarregandoPerfil(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar aluna pelo nome..."
          aria-label="Pesquisar aluna pelo nome"
          className="pl-9"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Alunas das turmas em que você atua. Abra uma aluna para ver o perfil completo.
      </p>

      {carregando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : erro ? (
        <p className="py-8 text-center text-sm text-destructive">{erro}</p>
      ) : alunas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {busca.trim()
              ? 'Nenhuma aluna encontrada com esse nome.'
              : 'Nenhuma aluna nas suas turmas ainda.'}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alunas.map((a) => (
            <li key={`${a.user_id}-${a.turma_id}`}>
              <button
                type="button"
                onClick={() => abrir(a)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <FotoAluna nome={a.nome} avatar={a.avatar} tamanho="h-11 w-11" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.turma_nome} · {a.nucleo_nome}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <div className="flex items-center gap-3">
              <FotoAluna
                nome={selecionada?.nome ?? ''}
                avatar={perfil?.avatar ?? selecionada?.avatar}
                tamanho="h-14 w-14"
              />
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">{selecionada?.nome}</DialogTitle>
                {perfil && perfil.nome_completo !== perfil.nome && (
                  <p className="truncate text-sm text-muted-foreground">{perfil.nome_completo}</p>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {carregandoPerfil ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : erroPerfil ? (
              <p className="py-8 text-center text-sm text-destructive">{erroPerfil}</p>
            ) : (
              perfil && (
                <>
                  <SecaoDados titulo="Cadastro" icone={IdCard}>
                    <Campo rotulo="Nome completo" valor={perfil.nome_completo} largo />
                    <Campo rotulo="Data de nascimento" valor={idade(perfil.cadastro.data_nascimento)} />
                    <Campo rotulo="Telefone" valor={perfil.cadastro.telefone} />
                    <Campo rotulo="E-mail" valor={perfil.cadastro.email} />
                    <Campo rotulo="Contato de emergência" valor={perfil.cadastro.contato_emergencia} />
                    <Campo rotulo="Bairro" valor={perfil.cadastro.bairro} />
                    <Campo rotulo="Cidade" valor={perfil.cadastro.cidade} />
                    <Campo rotulo="Turma" valor={perfil.cadastro.turma_nome} />
                    <Campo rotulo="Núcleo" valor={perfil.cadastro.nucleo_nome} />
                  </SecaoDados>

                  <SecaoDados
                    titulo="Saúde"
                    icone={HeartPulse}
                    acao={
                      perfil.saude.possui_registro ? (
                        <Badge variant="secondary">Possui registro</Badge>
                      ) : (
                        <Badge variant="outline">Nada registrado</Badge>
                      )
                    }
                  >
                    {!perfil.saude.ficha_confirmacao_entregue && (
                      <p className="text-sm text-muted-foreground sm:col-span-2">
                        A aluna ainda não entregou a ficha de confirmação, onde ficam os dados de saúde.
                      </p>
                    )}
                    <Campo rotulo="Pessoa com deficiência" valor={perfil.saude.pcd} />
                    <Campo rotulo="Tipo de deficiência" valor={perfil.saude.tipos_deficiencia} />
                    <Campo rotulo="Comorbidades ou restrições físicas" valor={perfil.saude.comorbidades} largo />
                    <Campo rotulo="Medicação contínua" valor={perfil.saude.medicacao_continua} />
                    <Campo rotulo="Quais medicamentos" valor={perfil.saude.quais_medicacoes} />
                    <Campo rotulo="Alergias" valor={perfil.saude.alergias} />
                    <Campo rotulo="Cirurgia nos últimos 6 meses" valor={perfil.saude.cirurgias_recentes} />
                  </SecaoDados>

                  <SecaoDados titulo="Medida protetiva" icone={ShieldAlert} semGrade>
                    {perfil.protecao.possui_medida_protetiva ? (
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
                        Possui medida protetiva registrada.
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" aria-hidden />
                        Nenhuma medida protetiva registrada.
                      </p>
                    )}
                  </SecaoDados>

                  <p className="text-xs text-muted-foreground">
                    Dados sensíveis, protegidos pela LGPD. Este acesso foi registrado.
                  </p>
                </>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
