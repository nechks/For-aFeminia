import MinhasTurmas from '@/components/turmas/MinhasTurmas'

/**
 * Cada turma tem duas chamadas independentes — Defesa Pessoal e Roda de Conversa. As mesmas abas
 * aparecem em Meu Perfil; esta tela é o atalho direto pelo menu.
 */
export default function Chamada() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Chamada</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha a turma, o tipo de chamada e a data para registrar a presença das alunas.
        </p>
      </div>
      <MinhasTurmas />
    </div>
  )
}
