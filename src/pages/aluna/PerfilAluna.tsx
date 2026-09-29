import { useState, useRef } from 'react'
import { useApp } from '@/store/app-context'
import { useAuth } from '@/hooks/use-auth'
import api, { authStore, fileUrl } from '@/lib/api/client'
import { Usuario } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PainelTurma, useMinhasTurmas } from '@/components/turmas/MinhasTurmas'
import MeuHistorico from '@/components/profissional/MeuHistorico'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api/errors'
import { Camera, GraduationCap, History, KeyRound, Loader2, Save, User } from 'lucide-react'

function AlterarSenhaCard() {
  const { toast } = useToast()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.')
      return
    }
    setSalvando(true)
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: senhaAtual,
        newPassword: novaSenha,
      })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      toast({ title: 'Senha alterada com sucesso!' })
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Alterar senha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senhaAtual">Senha atual</Label>
            <Input
              id="senhaAtual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <Input
              id="novaSenha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmacaoSenha">Confirmar nova senha</Label>
            <Input
              id="confirmacaoSenha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" disabled={salvando} className="w-full">
            <KeyRound className="w-4 h-4 mr-2" />
            {salvando ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function PerfilAluna() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PerfilComTurmas />
    </div>
  )
}

/**
 * O perfil ganha uma aba por turma em que a pessoa atua (professor, auxiliar, mediadora...). Quem
 * não tem vínculo com turma — alunas e o pessoal administrativo — vê só os dados da conta.
 */
function PerfilComTurmas() {
  const { user } = useApp()
  const { turmas, loading } = useMinhasTurmas()
  const isProfissional = Boolean(user?.tipo_profissional || turmas.length)

  if (loading || (!turmas.length && !isProfissional)) return <DadosDaConta />

  return (
    <Tabs defaultValue="conta" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="conta">
          <User className="mr-1.5 h-4 w-4" />
          Meu perfil
        </TabsTrigger>
        {isProfissional && (
          <TabsTrigger value="historico">
            <History className="mr-1.5 h-4 w-4" />
            Histórico
          </TabsTrigger>
        )}
        {turmas.map((v) => (
          <TabsTrigger key={v.turma.id} value={v.turma.id}>
            <GraduationCap className="mr-1.5 h-4 w-4" />
            {v.turma.nome}
            <span className="ml-1.5 text-xs opacity-70">· {v.nucleo_nome}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="conta">
        <DadosDaConta />
      </TabsContent>
      {isProfissional && (
        <TabsContent value="historico">
          <MeuHistorico />
        </TabsContent>
      )}
      {turmas.map((v) => (
        <TabsContent key={v.turma.id} value={v.turma.id}>
          <PainelTurma vinculo={v} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function DadosDaConta() {
  const { user } = useApp()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState(user?.name ?? '')
  const [nomeSocial, setNomeSocial] = useState(user?.nomeSocial ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const avatarUrl = avatarPreview
    ? avatarPreview
    : user.avatar
      ? fileUrl(user.avatar)
      : null

  const iniciais = (user.nomeSocial || user.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p: string) => p[0])
    .join('')
    .toUpperCase()

  // A foto é salva imediatamente ao ser escolhida — sem depender do botão "Salvar alterações".
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const tiposOk = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!tiposOk.includes(file.type)) {
      toast({
        title: 'Formato de imagem não suportado',
        description:
          'Use uma imagem PNG, JPEG, WebP ou GIF. Fotos de iPhone (HEIC) precisam ser convertidas para um desses formatos.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Imagem muito grande',
        description: 'O tamanho máximo permitido é 5 MB.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const atualizado = await api.patchForm<Usuario>(`/api/users/${user.id}`, formData)
      authStore.setUser(atualizado)
      toast({ title: 'Foto atualizada com sucesso!' })
    } catch (err) {
      setAvatarPreview(null)
      toast({
        title: 'Não foi possível salvar a foto',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', nome)
      formData.append('nomeSocial', nomeSocial)

      const atualizado = await api.patchForm<Usuario>(`/api/users/${user.id}`, formData)
      authStore.setUser(atualizado)
      toast({ title: 'Perfil atualizado com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Meu Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Foto de perfil" />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow hover:bg-primary/90 transition disabled:opacity-70"
                title="Alterar foto"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadingAvatar ? 'Salvando foto...' : 'Clique na câmera — a foto é salva na hora'}
            </p>
          </div>

          {/* Campos */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nomeSocial">
                Nome social <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="nomeSocial"
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                placeholder="Nome pelo qual prefere ser chamada"
              />
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado aqui.</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </CardContent>
      </Card>

      <AlterarSenhaCard />
    </div>
  )
}
