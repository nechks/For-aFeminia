# Relatório de Análise Técnica — Sistema ATKDGV · Módulo Força Feminina

**Data:** 23/10/2026
**Versão analisada:** cópia de trabalho do checkout principal (`D:\SistemaForcaFeminina\atkdgv-for-a-feminina-setup-1o2jxnkpx`), commit `1915e92` + 91 alterações ainda não commitadas. Os caminhos e números de linha abaixo se referem a essa cópia.
**Escopo:** backend (`backend/`, Spring Boot 3.3 + MySQL) e frontend (`src/`, React 19 + Vite + TypeScript).
**Método:** leitura dos controllers, serviços, entidades e configuração do backend; leitura das camadas de API, autenticação, roteamento e estado do frontend; execução de testes, typecheck e lint.

---

## 1. Resumo executivo

O sistema está funcional e com boa documentação no próprio código: os comentários explicam as regras de negócio e citam o escopo. Tem autenticação JWT, permissões por perfil, exclusão lógica auditada, proteção contra força bruta no login, auditoria de acesso a dados de saúde (`AcessoDadoSensivel`) e 30 testes de integração passando.

Os problemas mais sérios estão em três frentes:

1. **Permissões checadas só no frontend.** Algumas regras existem na tela, mas a API não as aplica.
2. **Endpoints que devolvem dados sensíveis sem checar quem pede.**
3. **Regras de negócio quebradas por detalhes de implementação**, como a ordem das operações e o rollback de transação.

O sistema guarda dados de violência doméstica, saúde, filhos e situação socioeconômica, então esses pontos têm peso de LGPD.

**As 5 prioridades:**

| # | Problema | Severidade |
|---|----------|-----------|
| 1 | Qualquer usuário logado, inclusive aluna, lista os atendimentos públicos de outras alunas e os documentos (RG, CPF, foto) de qualquer ficha | Crítico |
| 2 | O upload grava a extensão enviada pelo cliente, então um `.html` declarado como `image/png` é servido como HTML (XSS armazenado) | Crítico |
| 3 | Aluna ou professor muda o próprio núcleo via `PATCH /api/users/{id}`, contornando a transferência e a regra de atendimento por núcleo | Alto |
| 4 | O Administrativo pode inativar contas da Gestão Geral e reativar usuários excluídos | Alto |
| 5 | O Administrativo exporta dados de saúde, filhos e detalhes de violência pela planilha do núcleo, porque a lista de campos confidenciais está incompleta | Alto |

---

## 2. Visão geral da arquitetura

| Item | Situação |
|------|----------|
| Backend | Java 21, Spring Boot 3.3.5, Spring Security (JWT stateless, jjwt 0.12), Spring Data JPA, MySQL 8, Apache POI (Excel/Word) |
| Frontend | React 19, Vite 8, TypeScript 6, shadcn/ui + Tailwind, React Router 7, React Hook Form + Zod, Recharts |
| Tamanho | 28 controllers/handlers, 13 serviços; ~37 mil linhas somando Java e TS/TSX (sem `components/ui`) |
| Perfis | `ALUNA_FF`, `PROFESSOR`, `ASSISTENTE_SOCIAL`, `ADMINISTRATIVO`, `GESTAO_GERAL` |
| Persistência | `ddl-auto: update` + `SchemaPatch` (correções manuais idempotentes). Não há ferramenta de migração. |
| Arquivos | Disco local (`uploads/`), servidos por `GET /api/files/{nome}` com o token no header ou em `?token=` |
| Tempo real | Polling a cada 10 s (`useRealtime`) |

**Pontos fortes**
- Regras de negócio bem comentadas e fáceis de ligar ao escopo.
- `JwtAuthFilter` recarrega o usuário a cada requisição e respeita `ativo`, então inativar uma conta corta o acesso na hora.
- Controle duplo nos atendimentos confidenciais, que aparecem mascarados nas listagens da Gestão.
- `AlunaPerfilController` limita a consulta às turmas da pessoa e registra cada abertura de dado sensível.
- `FileStorageService.resolve` protege contra path traversal.
- Rate limit no login e na liberação de relatório confidencial.
- `open-in-view: false`, senhas com BCrypt, `passwordHash` e `senhaHash` com `@JsonIgnore`.
- `ApiExceptionHandler` já converte os erros de requisição do Spring em 400/404.
- Paginação de inscrições limitada a 100 por página.

---

## 3. Verificações executadas

| Verificação | Resultado |
|-------------|-----------|
| `mvn test` (backend atual, rodado numa cópia no scratchpad para não mexer em `backend/target`) | ✅ **30 testes em 11 classes, 0 falhas** |
| `tsc --noEmit -p tsconfig.app.json` | ❌ **23 erros de tipo** (detalhes em F-19) |
| `oxlint src` | ⚠️ 4 avisos: dependências de `useMemo` em `Inscricao.tsx` e imports sem uso |
| `vite build` | ❌ Falhou ao resolver `node_modules/zod/v4/core`: a pasta `zod/v4` não existe no `node_modules` do checkout principal, que está incompleto. Rodar `npm ci`. |
| Testes de frontend | Não existem (o script `npm test` só imprime uma mensagem) |

Também: `.claude/launch.json` aponta o `JAVA_HOME` para `C:\Program Files\Java\latest\jdk-21`, pasta que não existe nesta máquina (o JDK está em `C:\Program Files\Java\jdk-21.0.7`). Com isso, a configuração `backend-spring` do preview não sobe.

---

## 4. Achados

Legenda:
- **Crítico:** exposição de dados sensíveis ou falha de segurança explorável.
- **Alto:** regra de negócio ou permissão que pode ser contornada.
- **Médio:** bug funcional ou risco operacional.
- **Baixo:** qualidade e manutenção.

### 4.1 Crítico

#### F-01 — Atendimentos públicos visíveis para qualquer usuário logado, inclusive alunas
- **Onde:** `backend/.../web/AtendimentoController.java:54`
- **Problema:** `GET /api/atendimentos` só exige estar logado (`CurrentUser.get()`). Devolve todos os atendimentos `PUBLICO`, com o texto do relatório e o objeto `Usuario` da aluna atendida. A tela é restrita no frontend, mas a API não.
- **Impacto:** uma aluna com token lê os relatórios de atendimento de outras alunas. Uma candidata ainda não aprovada também, porque a conta já nasce ativa.
- **Sugestão:** usar `CurrentUser.require(PROFESSOR, ASSISTENTE_SOCIAL, ADMINISTRATIVO, GESTAO_GERAL)`. Para `PROFESSOR`, filtrar pelas turmas em que a pessoa tem vínculo.

#### F-02 — Documentos pessoais de qualquer ficha acessíveis a qualquer usuário logado
- **Onde:** `backend/.../web/ConfirmacaoController.java:218` e `backend/.../web/FileController.java`
- **Problema:** `GET /api/confirmacoes/{id}/documentos` não verifica a dona da ficha nem o perfil de quem pede, e devolve os nomes dos arquivos de RG, CPF e foto. Já `GET /api/files/{nome}` entrega qualquer arquivo a qualquer usuário logado, sem checar a quem ele pertence.
- **Impacto:** quem tiver o ID de uma confirmação baixa os documentos da aluna. Os IDs são UUIDs, mas aparecem em várias respostas, como relatórios e fichas consolidadas.
- **Sugestão:** aplicar em `/documentos` a mesma regra de `getOne` (a própria aluna ou perfis de gestão/AS). Em `/api/files`, gravar o dono de cada arquivo numa tabela de metadados e autorizar por dono ou perfil.

#### F-03 — Upload permite servir HTML/JS pelo domínio da API (XSS armazenado)
- **Onde:** `backend/.../service/FileStorageService.java:34-40` e `backend/.../web/FileController.java:35`
- **Problema:**
  - O tipo do arquivo é validado pelo `Content-Type` **que o cliente declara**, mas a extensão gravada vem do **nome original**.
  - Na hora de servir, `Files.probeContentType` deduz o tipo pela extensão.
  - Resultado: um `x.html` enviado com `Content-Type: image/png` é gravado como `.html` e servido como `text/html`.
  - O endpoint público `POST /api/cadastro-professor` aceita uploads sem login, e os registros de aula também recebem fotos.
- **Impacto:** o script roda no domínio da API quando alguém da gestão abre o "documento". O link já leva o JWT na query string (`?token=`).
- **Sugestão:**
  - Derivar a extensão do tipo validado (mapa `image/png → .png`).
  - Conferir os *magic bytes* do arquivo.
  - Responder com o `Content-Type` gravado no upload.
  - Usar `Content-Disposition: attachment` para PDF e `X-Content-Type-Options: nosniff`.

### 4.2 Alto

#### F-04 — Usuário muda o próprio núcleo pela API
- **Onde:** `backend/.../web/UsuarioController.java:167`, com a checagem `loadAndCheckPermission` na linha 265
- **Problema:** `PATCH /api/users/{id}` (JSON) deixa o próprio usuário mudar `turma`.
  - Para uma aluna, isso contorna a transferência de núcleo, que é exclusiva da Gestão.
  - Para um professor, o efeito é maior: `AtendimentoController.java:86` valida o núcleo por `atual.getTurma()`. Depois de mudar o próprio núcleo, ele registra e lista atendimentos de alunas de **qualquer** núcleo.
- **Sugestão:** aceitar `turma` só da `GESTAO_GERAL`, ou tirar o campo e deixar apenas `/nucleo`. No atendimento, validar pelo vínculo em `turma_equipe`, não pelo campo legado.

#### F-05 — Administrativo inativa a Gestão Geral e reativa contas excluídas
- **Onde:** `backend/.../web/UsuarioController.java:168-174`
- **Problema:** a API não confere o perfil da conta alterada nem o campo `excluido`.
  - O Administrativo pode inativar todas as contas da Gestão Geral e travar a administração do sistema.
  - Também pode reativar uma conta que a Gestão excluiu com justificativa: `excluido` continua `true`, mas `ativo=true` libera o login de novo.
- **Sugestão:**
  - Só a Gestão pode alterar contas `GESTAO_GERAL`.
  - Recusar `ativo=true` quando `excluido=true`.
  - Registrar auditoria de cada ativação e inativação.

#### F-06 — Dados de saúde, filhos e violência exportáveis pelo Administrativo
- **Onde:** `backend/.../web/RelatorioController.java:70` (lista `CAMPOS_CONFIDENCIAIS`) e linhas 219/231
- **Problema:** a proteção é uma **lista negra** de campos proibidos, e vários campos sensíveis ficaram de fora:
  - seção 6, filhos: `tem_filhos`, `tem_rede_apoio_filhos`, `precisa_levar_filhos`, `criancas` (nomes e idades);
  - seção 7, violência: `denuncio_outro`;
  - seção 4, saúde: `comorbidades`, `medicacao_continua`, `quais_medicacoes`, `alergias`, `cirurgias_recentes`. A LGPD trata dados de saúde como sensíveis;
  - renda: `renda_familiar_total`, `renda_per_capita`.

  Além disso, a API aceita qualquer `confirmacao.<chave>`.
- **Sugestão:** trocar por uma **lista branca** de campos permitidos por perfil, mantida num único lugar. Hoje a definição dos campos existe só no frontend, em `src/lib/confirmacao-fields.ts`. Confirmar no escopo se `GET /api/confirmacoes` deve devolver as seções 6 e 7 ao Administrativo, porque hoje devolve.

#### F-07 — O bloqueio por inscrição não aprovada existe só no frontend
- **Onde:** `backend/.../web/InscricaoController.java:480` (a conta nasce com `ativo=true`) e `src/components/Layout.tsx` (bloqueio na tela)
- **Problema:** uma candidata ainda `AGUARDANDO` acessa pela API:
  - o mural de qualquer núcleo;
  - o calendário;
  - os eventos, e consegue se inscrever neles, porque `EventoController.java:220` não confere aprovação nem turma;
  - a lista de núcleos, com endereço e telefone;
  - os atendimentos (ver F-01).

  O Javadoc da linha 233 ainda diz que a conta "nasce inativa", o que confunde quem lê.
- **Sugestão:** criar um helper `requireAlunaLiberada()` (inscrição `APROVADA` + ficha de confirmação preenchida) e aplicá-lo aos endpoints da aluna. Atualizar o Javadoc.

#### F-08 — O cancelamento automático por prazo da ficha nunca é gravado
- **Onde:** `backend/.../web/ConfirmacaoController.java:51` (prazo) e `:125-132`
- **Problema:** o método é `@Transactional`. Ele marca a inscrição como `CANCELADA` e logo depois lança uma `ApiException`, que é `RuntimeException`. Isso desfaz a transação (rollback), então o status nunca muda. O prazo `2026-12-31` também está fixo no código e vence em cerca de 2 meses.
- **Sugestão:** mover o prazo para configuração (`app.confirmacao.deadline`) ou para o projeto/ciclo. Fazer o cancelamento num job agendado (`@Scheduled`), numa transação separada (`REQUIRES_NEW`) ou com `noRollbackFor`.

#### F-09 — Aprovar e trocar o núcleo no mesmo PATCH grava o núcleo antigo na conta
- **Onde:** `backend/.../web/InscricaoController.java:788` e `:802`
- **Problema:** `sincronizarContaDaAluna` roda **antes** de `req.turma()` ser aplicado. A conta da aluna fica com o núcleo antigo, e a ficha com o novo.
- **Sugestão:** aplicar todos os campos primeiro e sincronizar a conta no final. Validar também as transições de status: hoje qualquer status pode ir para qualquer outro, inclusive `APROVADA → AGUARDANDO`.

### 4.3 Médio

| ID | Onde | Problema | Sugestão |
|----|------|----------|----------|
| F-10 | `backend/src/main/resources/application.yml` L10, L26, L31 | Valores padrão inseguros: banco `root/root`, segredo JWT gravado no repositório e CORS `*`. Se as variáveis de ambiente não forem definidas em produção, o sistema sobe assim mesmo. | Criar um perfil `prod` que **falha ao iniciar** sem `JWT_SECRET` e `CORS_ALLOWED_ORIGINS`. Usar um usuário de banco próprio, sem permissão de DDL. |
| F-11 | `security/JwtAuthFilter.java:61`, `src/lib/api/client.ts` | O JWT vale 7 dias e fica no `localStorage`. Também vai na query string, e por isso aparece em logs, no histórico e no `Referer`. Trocar ou redefinir a senha não invalida os tokens já emitidos. | Token curto + refresh. Para arquivos, URL assinada de curta duração. Campo `tokenVersion` no usuário, incrementado a cada troca de senha. |
| F-12 | `web/MuralController.java:36-38` | A própria aluna informa `turma` na query, então lê avisos de qualquer núcleo. | O servidor deve tirar o núcleo da inscrição aprovada, como `EventoController.listar` já faz. |
| F-13 | `web/NucleoController.java:17` | `GET /api/nucleos` não confere o perfil: qualquer usuário logado vê endereço, telefone, responsável, capacidade e zonas prioritárias. | Restringir à gestão. Alunas usam `/publicos`. |
| F-14 | `web/PresencaController.java:247` | `GET /api/presencas` entrega a frequência de todo o sistema a qualquer professor. | Filtrar pelas turmas do vínculo. |
| F-15 | `web/PresencaController.java:183` | A chamada não tem `@Transactional`, então uma falha no meio grava só parte. `data_aula` não tem validação de formato nem de dia letivo. O alerta só é recalculado quando há falta: se uma falta vira presença, o alerta aberto continua igual. | Usar `@Transactional`, validar `yyyy-MM-dd` e o dia letivo, recalcular o alerta em toda gravação. |
| F-16 | `service/AlertaService.java:47` | A contagem usa **todas** as faltas históricas. Depois que um alerta é resolvido, a próxima falta abre outro já com o total antigo. | Contar só as faltas posteriores ao último alerta resolvido, gravando `resolvidoEm` e usando como corte. |
| F-17 | `web/EventoController.java:296`, `web/AtendimentoController.java:86` | Essas permissões usam o vínculo "principal" legado (`Usuario.turma` e `tipoProfissional`), enquanto a chamada usa `turma_equipe`. Quem é Monitor numa turma e Professora em outra recebe permissões diferentes conforme o vínculo que ficou como principal. | Migrar todas as checagens para `turma_equipe` e aposentar os campos legados. |
| F-18 | `web/CalendarioController.java:41` | Aceita datas repetidas e em qualquer formato (`existsByTurmaAndDataAula` existe no repositório, mas não é usado). O total de aulas vem do calendário por núcleo e as presenças são por turma; como as duas contagens não se correspondem, o percentual de frequência pode passar de 100%. | Validar formato e unicidade. Unificar o calendário por `turmaId`. |
| F-19 | Frontend (`tsc`) | **23 erros de tipo**. O tipo `Atendimento` em `src/lib/types.ts:178` é do modelo antigo (`data_atendimento`, `descricao`) e não bate com a API (`data`, `horario`, `relatorio`, `tipo_acesso`, `created_by`). O tipo `TipoAcessoAtendimento` não existe. `src/services/ficha-inscricao.ts:43` ainda chama `pb.collection(...)` do PocketBase, o que dá `ReferenceError` quando roda. O `vite build` não checa tipos, então nada disso aparece no build. | Corrigir os tipos, remover o código morto do PocketBase e incluir `tsc --noEmit` no build/CI. |
| F-20 | `web/NotificacaoController.java:49-66`, `domain/Notificacao.java:69` | Avisos enviados a um perfil inteiro (`perfilDestino`) têm um único campo `lida`. Quando uma pessoa da Gestão marca como lido, o aviso fica lido para toda a Gestão. | Guardar a leitura por usuário, numa tabela `notificacao_leitura (notificacao_id, user_id, lida_em)`. |
| F-21 | `web/ApiExceptionHandler.java:77` | Ainda viram 500: upload acima de 5 MB (`MaxUploadSizeExceededException`) e violações de unicidade em acessos simultâneos (e-mail, CPF, presença ou inscrição em evento duplicados, `DataIntegrityViolationException`). | Handlers próprios que devolvam 413 e 409. |
| F-22 | `web/CadastroProfessorController.java`, `web/InscricaoController.java` | Os endpoints públicos não têm rate limit nem CAPTCHA, e o cadastro de professor aceita até 25 MB por requisição. Os arquivos são gravados antes da solicitação ser salva, então um erro deixa arquivos órfãos. O CPF da inscrição não tem índice único, e dois envios simultâneos geram duplicata. Os dados bancários ficam em JSON, em texto puro. | Rate limit por IP (ex.: Bucket4j), CAPTCHA, limpeza de órfãos, índice único condicional para o CPF e criptografia dos dados bancários. |
| F-23 | `web/TurmaController.java:135` e `:217`, `web/NucleoController.java:164` e `:189` | O `@RequestBody` recebe a **entidade JPA** diretamente. O Jackson preenche o campo privado `id` (porque há getter). Se o `id` vier preenchido, `save()` vira `merge` e sobrescreve um registro que já existe. | Usar records ou DTOs de entrada, como `ProjetoController` e os demais controllers já fazem. |

### 4.4 Baixo (qualidade e manutenção)

- **F-24 — Sem migrações versionadas.** O schema depende de `ddl-auto: update` e do `SchemaPatch`, que usa SQL específico do MySQL. Sugestão: adotar Flyway e usar `ddl-auto: validate`.
- **F-25 — Datas como `String` e `LocalDate.now()` no fuso da JVM.** As comparações dependem do formato ISO. Com o servidor em UTC, eventos e avisos "vencem" 3 h antes da meia-noite de Brasília. Sugestão: usar `LocalDate`/`LocalTime` nas entidades e `ZoneId.of("America/Sao_Paulo")`. `RegistroAula` já usa `LocalDate` e pode servir de modelo.
- **F-26 — Consultas N+1 e filtros em memória.** `RelatorioController.filtrarAtendimentos` e `buscarAlunaIds` fazem `findAll()`. Várias listagens buscam usuário ou ficha item a item: lista de eventos, `/presencas/detalhes`, `/nucleos/resumo`, `/indicadores/*` e `GET /api/atendimentos`. Funciona com o volume atual, mas não escala. Sugestão: paginar e passar os filtros para JPQL.
- **F-27 — Código duplicado.**
  - `isCpfValido` existe em mais de um controller.
  - O mapa de atendimento é montado em três lugares.
  - Status aparecem como strings soltas (`"PENDENTE"`, `"ABERTO"`, `"CONFIDENCIAL"`).

  Sugestão: extrair utilitários e usar enums.
- **F-28 — Regras de negócio dentro dos controllers.** Há controllers de 300 a 800 linhas acessando repositórios diretamente (`InscricaoController` tem mais de 800). O caminho já começou com `ContaProfissionalService` e `CicloService`. Sugestão: seguir com `InscricaoService`, `PresencaService` e outros.
- **F-29 — Validação manual.** O `spring-boot-starter-validation` já está no `pom.xml`, mas não é usado. Usar `@Valid` + Bean Validation nos DTOs eliminaria muito código repetido.
- **F-30 — Atendimento sem validação de domínio.**
  - O sistema não confere se a `aluna_id` existe, se é aluna e se é do núcleo.
  - `tipo_acesso` aceita qualquer texto.
  - A exclusão é física e sem auditoria, inclusive de atendimentos confidenciais apagados pelo Administrativo.
- **F-31 — O login revela, pelo tempo de resposta, se o e-mail existe.** O BCrypt só roda quando a conta existe. O rate limit é só por e-mail, num mapa em memória que nunca é limpo. Sugestão: rodar um hash fictício quando o e-mail não existe e limitar também por IP.
- **F-32 — Senhas e dados do seed.** A senha exige só 8 caracteres; vale incluir uma lista de senhas comuns. O seed usa a senha `Skip@Pass` e um e-mail pessoal real (`service/DataSeeder.java:59`); melhor tirar os dois de variáveis de ambiente.
- **F-33 — `UserDetailsServiceAutoConfiguration` ativo.** Gera a senha padrão do Spring a cada inicialização (aparece no log dos testes). Sugestão: excluir essa autoconfiguração.
- **F-34 — Frontend.**
  - README e `package.json` ainda são do template (`skip-react-template`, porta 5173, enquanto a real é 8080).
  - Há 4 avisos do oxlint.
  - Não há nenhum teste.
  - `/cadastro-professor` não está entre as rotas públicas do `Layout` (linha 20), então um visitante sem login vê o layout com a barra lateral vazia.
  - O `App.tsx` altera o objeto global `turmaLabels`; seria melhor guardar esses rótulos em estado ou contexto.
- **F-35 — Cobertura de testes do backend.** Há 30 testes. Faltam testes para chamada e permissões por vínculo, confidencialidade de atendimentos, exportação de relatórios, upload de arquivos e a matriz completa perfil × endpoint.

---

## 5. Melhorias recomendadas (arquitetura)

1. **Autorização centralizada.** Criar um `AccessPolicy` (ou usar `@PreAuthorize`) com regras nomeadas, como `podeVerAluna(alunaId)` e `temVinculo(turmaId, tipo)`, no lugar de checagens espalhadas e às vezes ausentes. Cobrir com testes de matriz perfil × endpoint.
2. **DTOs de entrada e saída.** Parar de serializar entidades (`Usuario`, `FichaInscricao`) diretamente. Hoje, qualquer campo novo numa entidade aparece na API automaticamente.
3. **Modelo de vínculo único.** Terminar a migração para `turma_equipe` e `FichaInscricao.turmaId` e remover os campos legados `Usuario.turma/turmaId/tipoProfissional` e `Presenca.turma`. Eles estão na origem de F-04, F-17 e F-18.
4. **Dados sensíveis (LGPD).** Classificar os campos da ficha por nível (público, interno, sensível, sigiloso) num único lugar do backend. Estender o registro de `AcessoDadoSensivel` às seções 6 e 7 e às exportações. Criptografar em repouso a seção 7 e os dados bancários.
5. **Operação.** Flyway, perfis `dev` e `prod`, Actuator com health check, logs estruturados e backup da pasta `uploads/` junto com o banco (ou armazenamento de objetos, tipo S3).
6. **Pipeline de qualidade.** CI com `mvn test`, `tsc --noEmit`, `oxlint` e build. No frontend, Vitest + Testing Library para os fluxos críticos: inscrição, ficha e chamada.

---

## 6. Plano de ação sugerido

| Fase | Itens | Esforço estimado |
|------|-------|------------------|
| **Imediato (antes de usar com dados reais)** | F-01 a F-06, F-10 | 2–3 dias |
| **Curto prazo (próximas 2 semanas)** | F-07, F-08 (o prazo vence em 31/12/2026), F-09, F-11 a F-15, F-19, F-20, F-23 | 5–7 dias |
| **Médio prazo** | F-16 a F-18, F-21, F-22, F-24 a F-26, F-30, F-31, testes (F-35) | 2–3 semanas |
| **Contínuo** | Refatorações F-27 a F-29, F-32 a F-34 e itens da seção 5 | — |
