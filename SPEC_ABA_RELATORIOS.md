# Especificação — Aba "Relatórios"

**Projeto:** Sistema ATKDGV — Módulo Força Feminina
**Data:** 10/07/2026
**Status:** Proposta para implementação (não implementado ainda)

Esta especificação foi escrita a partir do código-fonte real do repositório (frontend
`src/`, backend `backend/src/main/java/br/org/atkdgv/forcafeminina`), para que a
implementação futura reaproveite entidades, rotas e padrões já existentes em vez de
recriá-los.

---

## 1. Objetivo

Criar uma nova aba **"Relatórios"**, visível apenas para o perfil **Gestão Geral**
(`GESTAO_GERAL`), que centraliza a geração de relatórios do sistema:

1. **Relatório de Atendimentos** — relatórios do que já é registrado em
   `/atendimentos` (tela existente `src/pages/professor/Atendimentos.tsx` e entidade
   `Atendimento`), com regras diferentes para atendimento **público** e
   **confidencial**.
2. **Relatório de Aluna** — ficha consolidada de uma aluna específica (dados
   cadastrais, frequência/faltas, atendimentos, eventos), localizada por
   **Núcleo → Nome/CPF**.

Além disso, esta spec inclui uma mudança correlata solicitada: as perguntas de
inscrição em **Eventos** deixam de ser texto livre e passam a ter alternativas fixas,
respondidas por seleção.

---

## 2. Acesso e permissões

- A aba **Relatórios** e todas as suas sub-funções são exclusivas do perfil
  `GESTAO_GERAL`. Nenhum outro perfil (`PROFESSOR`, `ASSISTENTE_SOCIAL`,
  `ADMINISTRATIVO`, `ALUNA_FF`) vê o item de menu ou acessa as rotas.
- Isso segue o mesmo padrão já usado em `src/App.tsx` (`ProtectedRoute
  allowedRoles={['GESTAO_GERAL']}`, como na rota `/gestao/dashboard`) e em
  `src/components/Navigation.tsx` (item "Indicadores", hoje restrito a
  `GESTAO_GERAL`).
- **Importante:** só o fato de estar na aba Relatórios (logada como Gestão Geral) já
  basta para gerar relatórios **públicos**. Para relatórios de atendimento
  **confidenciais**, é exigida uma segunda verificação — não é a senha da própria
  Gestão, e sim o e-mail e senha da pessoa que **criou** aquele atendimento
  específico (`created_by`). Ver seção 4.1.3.

---

## 3. Localização na navegação

Novo item no menu (`src/components/Navigation.tsx`, array `navItems`):

```ts
{
  title: 'Relatórios',
  href: '/relatorios',
  icon: FileBarChart, // lucide-react
  roles: ['GESTAO_GERAL'],
}
```

Nova rota protegida em `src/App.tsx`:

```tsx
<Route
  path="/relatorios"
  element={
    <ProtectedRoute allowedRoles={['GESTAO_GERAL']}>
      <Relatorios />
    </ProtectedRoute>
  }
/>
```

A página usa sub-abas internas (componente `Tabs` do shadcn, já usado no projeto) com
duas seções: **Atendimentos** e **Relatório de Aluna**.

---

## 4. Estrutura da aba

### 4.1 Sub-aba "Atendimentos"

Gera relatórios a partir da entidade `Atendimento` (`Atendimento.java`,
`AtendimentoController.java`, tipos em `src/lib/types.ts`), que já possui o campo
`tipo_acesso: 'PUBLICO' | 'CONFIDENCIAL'`.

**Filtros disponíveis:**
- Núcleo (campo `turma`, valores de `TurmaFF` / rótulos em `turmaLabels`)
- Aluna (nome ou CPF — reaproveita a busca da seção 4.2)
- Período (data início/fim, campo `data`)
- Tipo de acesso (Público / Confidencial / Todos)

**Listagem:** tabela com data, horário, núcleo, aluna, autor (`created_by`), tipo de
acesso. Atendimentos confidenciais aparecem na lista (para a Gestão saber que
existem), mas o conteúdo do campo `relatorio` fica oculto/mascarado até a
verificação da seção 4.1.3.

#### 4.1.1 Relatório público — sem autenticação extra

Para atendimentos com `tipo_acesso = PUBLICO`, o botão **"Gerar relatório"** produz o
documento/exportação imediatamente, sem nenhuma etapa extra de login — a Gestão já
está autenticada por estar na aba. Endpoint reaproveita `GET /api/atendimentos`
(que já filtra por `findVisiveisPara`) com os filtros acima, retornando os campos
completos (`relatorio`, `data`, `horario`, `turma`, aluna e autor expandidos).

#### 4.1.2 Relatório confidencial — reautenticação do autor original

Para atendimentos com `tipo_acesso = CONFIDENCIAL`, o botão **"Gerar relatório
confidencial"** abre um modal pedindo **e-mail e senha da pessoa que registrou** o
atendimento (o usuário referenciado em `created_by`), e não as credenciais da
Gestão logada. Isso funciona como controle duplo: a Gestão só visualiza o conteúdo
confidencial se o profissional responsável (professor, assistente social etc.)
autorizar digitando as próprias credenciais no momento da geração.

Regras:
- O e-mail informado deve corresponder exatamente ao `Usuario` de `created_by`
  daquele atendimento — se for de outra pessoa (mesmo que válida no sistema), a
  verificação falha.
- A senha é validada contra o hash já usado no login normal (mesmo mecanismo de
  autenticação existente), sem reaproveitar o token JWT da sessão da Gestão.
- Verificação com sucesso libera a visualização/exportação **apenas daquele
  atendimento** (não vira uma sessão geral) — cada atendimento confidencial exige
  reautenticação própria.
- Tentativas inválidas não devem revelar se o e-mail existe ou não ("credenciais
  inválidas" genérico), e devem ter alguma limitação de tentativas (rate limit)
  para evitar força bruta.

#### 4.1.3 Endpoint proposto

```
POST /api/atendimentos/{id}/relatorio/confidencial
Body: { "email": "...", "senha": "..." }
```
- 200 + corpo do relatório, se `email`/`senha` corresponderem ao `created_by`.
- 403 `credenciais_invalidas`, em qualquer outro caso (autor errado ou senha errada).
- Restrito a `GESTAO_GERAL` (verificado via `CurrentUser.require`, igual ao padrão
  já usado em `AtendimentoController`).

O relatório público continua usando `GET /api/atendimentos` (sem mudanças de
contrato).

#### 4.1.4 Exportação

Assim como o evento já exporta Excel (`exportarEventoExcel` em
`src/services/eventos.ts`, endpoint `/api/eventos/{id}/export`), o relatório de
atendimentos deve oferecer exportação em Excel/PDF. Sugestão de reaproveitar a
mesma lib usada no backend para gerar a planilha de eventos.

---

### 4.2 Sub-aba "Relatório de Aluna"

Fluxo de seleção em duas etapas, como descrito pelo usuário:

1. **Escolher o Núcleo** — dropdown com os valores de `TurmaFF`
   (`turmaLabels`: Centro - Vitória, Clube AEST - Serra, Itaquari - Cariacica,
   Conj. Carapina - Serra, Atlântica Ville - Vitória).
2. **Buscar por Nome ou CPF** dentro daquele núcleo — campo de busca que filtra as
   fichas de inscrição aprovadas daquele núcleo (`FichaInscricaoFF.turma`), por
   `nome_completo` ou `cpf`.

Endpoint proposto (reaproveitando padrão de `getAlunasPorTurma` em
`src/services/atendimentos.ts`):

```
GET /api/relatorios/alunas?turma=CENTRO_VITORIA&busca=maria
```

Ao selecionar a aluna, abre a **ficha consolidada**, reunindo tudo que hoje está
espalhado em várias entidades:

| Seção | Origem dos dados |
|---|---|
| Dados de cadastro/inscrição | `FichaInscricaoFF`: nome completo, CPF, RG, nascimento, telefone, e-mail, endereço, bairro, cidade, estado, CEP, núcleo, status, data da 1ª aula |
| Ficha de confirmação | `FichaConfirmacaoFF`: seções 1–8 (dados pessoais, socioeconômico, violência, declarações) |
| Documentos anexos | `DocumentosAnexos` (RG, CPF, foto de perfil) |
| Frequência / faltas | `Presenca` — lista de aulas com presença/falta e justificativa (mesma fonte usada no card "Faltas Registradas" do `GestaoDashboard.tsx`) |
| Atendimentos | `Atendimento` vinculados à aluna — **respeitando a regra de confidencialidade da seção 4.1**: públicos aparecem direto, confidenciais aparecem mascarados até a reautenticação do autor |
| Eventos | Inscrições em `EventoInscricao` e respostas às perguntas |

Esta tela é somente leitura (relatório), sem edição de dados — edições continuam
pelas telas já existentes (`AdminUsuarios`, `PerfilAluna`, etc.).

---

## 5. Mudança correlata: perguntas de evento por seleção

Hoje, ao criar um evento (`Evento` / `EventoPergunta`), cada pergunta é só um texto
(`pergunta: string`), e a aluna responde em texto livre — ver
`src/pages/aluna/DashboardAluna.tsx`, onde a resposta é um `<Textarea>` livre.

**Mudança:** quem cria o evento passa a definir, para cada pergunta, uma lista de
alternativas fixas. A aluna, ao se inscrever, apenas seleciona uma opção (rádio ou
`<Select>`), sem digitar nada.

### 5.1 Modelo de dados

`EventoPergunta` (backend) ganha um novo campo:

```java
@Column(nullable = false, columnDefinition = "TEXT")
private String opcoes; // JSON: ["Sim", "Não", "Talvez"]
```

No frontend (`src/services/eventos.ts`):

```ts
export interface EventoPergunta {
  id: string
  evento_id: string
  ordem: number
  pergunta: string
  opcoes: string[] // novo
}
```

### 5.2 Telas afetadas

- **Criação de evento** (hoje pelo Mural — `MuralManagement.tsx` / `criarEvento` em
  `src/services/eventos.ts`): ao adicionar cada pergunta, o formulário passa a exigir
  também a lista de alternativas (mínimo 2 opções).
- **Inscrição da aluna** (`DashboardAluna.tsx`): troca o `<Textarea>` por um
  `<RadioGroup>` ou `<Select>` com as `opcoes` daquela pergunta. A validação
  "responda todas as perguntas" passa a verificar se uma opção foi selecionada, não
  se o texto não está vazio.
- **Listagem de inscritas** (`Eventos.tsx`, função `parseRespostas`): sem mudança de
  formato — continua exibindo `pergunta: resposta`, só que `resposta` agora é
  sempre uma das `opcoes` predefinidas.

---

## 6. Resumo do que já existe vs. o que precisa ser criado

| Item | Situação |
|---|---|
| Entidade `Atendimento` com `tipo_acesso` PUBLICO/CONFIDENCIAL | ✅ já existe |
| Listagem de atendimentos visíveis por usuário (`findVisiveisPara`) | ✅ já existe |
| Aba/rota "Relatórios" | ⛔ criar |
| Endpoint de reautenticação para relatório confidencial | ⛔ criar |
| Busca de aluna por núcleo + nome/CPF | ⛔ criar (reaproveita padrão de `getAlunasPorTurma`) |
| Ficha consolidada da aluna (cadastro + faltas + atendimentos + eventos) | ⛔ criar (agrega entidades já existentes) |
| Exportação de relatórios (Excel/PDF) | ⛔ criar (reaproveitar padrão do export de eventos) |
| Campo `opcoes` em `EventoPergunta` | ⛔ criar (migração de banco) |
| Formulário de criação de evento com alternativas | ⛔ alterar |
| Tela de inscrição da aluna com seleção em vez de texto livre | ⛔ alterar |

---

## 7. Regras de segurança

- Toda rota de Relatórios exige perfil `GESTAO_GERAL` no backend (não só esconder no
  menu do frontend).
- O endpoint de verificação confidencial não deve logar a senha em texto claro, deve
  ter *rate limiting* e deve responder de forma genérica em caso de falha.
- Atendimentos confidenciais nunca devem ser retornados em texto pleno por um
  endpoint que não exija a verificação da seção 4.1.3 — nem mesmo para
  `GESTAO_GERAL` via listagem simples.

---

## 8. Critérios de aceite (cenários de teste)

1. Usuário com perfil `PROFESSOR`, `ASSISTENTE_SOCIAL`, `ADMINISTRATIVO` ou
   `ALUNA_FF` não vê o item "Relatórios" no menu e recebe redirect/403 ao acessar
   `/relatorios` direto pela URL.
2. Gestão Geral gera relatório de um atendimento público sem qualquer prompt de
   senha.
3. Gestão Geral tenta gerar relatório de atendimento confidencial: sistema exige
   e-mail/senha; com credenciais do autor correto, libera o conteúdo; com
   credenciais de outra pessoa (mesmo válidas no sistema) ou senha errada, nega.
4. Busca de aluna: selecionar núcleo "Centro - Vitória" retorna somente alunas
   aprovadas naquele núcleo; buscar por CPF retorna exatamente a aluna
   correspondente.
5. Ficha consolidada da aluna mostra dados de cadastro, faltas e eventos; um
   atendimento confidencial dela aparece mascarado até a reautenticação do autor.
6. Criar evento com pergunta contendo 3 alternativas; ao se inscrever, a aluna só
   consegue selecionar uma dentre as 3 — não existe campo de texto livre.

---

## 9. Fora de escopo / decisões pendentes

- Formato final de exportação (PDF, Excel, ou ambos) — sugerido reaproveitar Excel
  já usado em Eventos, mas não confirmado.
- Se a verificação confidencial deve expirar após X minutos ou vale só para aquela
  requisição (recomendação: token de curta duração, uso único).
- Se perguntas de eventos já criados (sem `opcoes`) precisam de migração de dados
  retroativa ou apenas passam a exigir `opcoes` para eventos novos.
