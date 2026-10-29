# Histórico de solicitações e alterações

Este arquivo registra os pedidos realizados, as alterações correspondentes e o motivo de cada decisão. Ele deve ser atualizado ao final de toda tarefa que modificar o sistema.

## Padrão dos próximos registros

Cada registro deve informar:

- Data e identificação da tarefa.
- Pedido: o que foi solicitado.
- Alterações: o que foi efetivamente modificado.
- Motivo: por que a alteração foi realizada e qual regra de negócio ela atende.
- Validação: como o resultado foi conferido.

## 31/08/2026 — Registro inicial consolidado

### Validação do formulário de inscrição

- Pedido: impedir que os campos da última etapa apareçam em vermelho antes de a candidata interagir com eles.
- Alterações: revisão do momento em que erros de e-mail, senha, confirmação e aceite dos termos são exibidos.
- Motivo: evitar a impressão de que a candidata cometeu um erro antes de preencher o formulário e tornar a experiência de cadastro mais clara.

### Evidências e feedback das aulas

- Pedido: disponibilizar aos profissionais uma área lateral para registrar evidências e feedback depois das aulas, sem criar um novo perfil de professor.
- Alterações: inclusão de registros de aula com data, fotos, relatório e observações nos perfis profissionais existentes; inclusão de consulta das evidências para Gestão Geral e Administrativo.
- Motivo: centralizar a comprovação e o acompanhamento das atividades usando os perfis que já existem no sistema.

### Histórico e avaliação dos profissionais

- Pedido: criar um histórico no perfil do profissional e uma visão geral para a gestão, incluindo projetos, assiduidade, avaliações, observações e advertências.
- Alterações: inclusão do histórico individual do profissional e da área de histórico para a gestão, com registros positivos, negativos e advertências.
- Motivo: manter um acompanhamento institucional auditável da atuação de cada profissional.

### Solicitações separadas por núcleo

- Pedido: dividir as solicitações por núcleo e permitir que o administrador selecione o núcleo que deseja analisar.
- Alterações: inclusão dos filtros de núcleo e bairro, exibição das solicitações correspondentes e resumo de capacidade, ocupação e vagas disponíveis.
- Motivo: facilitar a análise administrativa de acordo com o local e o horário escolhidos pela candidata.

### Controle do limite de vagas

- Pedido: informar quando o limite do núcleo estiver preenchido, sem aprovar automaticamente nem encaminhar automaticamente para lista de espera.
- Alterações: exibição do aviso “Limite preenchido” e bloqueio de novas aprovações quando não houver vaga; a decisão continua sendo realizada pelo administrador.
- Motivo: respeitar a capacidade cadastrada para cada núcleo e preservar a análise humana das inscrições.

### Bairros prioritários configurados no núcleo

- Pedido: cadastrar os bairros prioritários dentro de cada núcleo, em vez de manter uma configuração geral no município.
- Alterações: inclusão da lista de bairros prioritários no cadastro do núcleo e uso dessa lista na análise das candidatas daquele núcleo.
- Motivo: cada núcleo atende uma região diferente e precisa definir suas próprias prioridades territoriais.

### Pergunta sobre violência

- Pedido: substituir o campo livre sobre violência por opções de seleção e permitir a escolha dos tipos de violência quando a resposta for positiva.
- Alterações: opções “Sim”, “Não” e “Prefiro não responder”; quando “Sim” é selecionado, são disponibilizados os tipos física, psicológica, sexual, patrimonial e moral, além da informação sobre medida protetiva.
- Motivo: tornar uma pergunta sensível mais clara, padronizada e simples de responder.

### Classificação pelos critérios do Força Feminina

- Pedido: ordenar as candidatas pelos dez critérios de prioridade, mantendo o texto “Por que você gostaria de participar?” como desempate manual.
- Alterações: cálculo auditável dos critérios, ordenação da maior para a menor pontuação e exibição do relato para análise do administrador.
- Motivo: apoiar a seleção de forma objetiva sem substituir a decisão administrativa nem avaliar automaticamente o texto livre.

### Metade da pontuação para critérios não atendidos

- Pedido: atribuir metade do valor aos critérios que a candidata não atender.
- Alterações: cada critério atendido passou a valer 10 pontos e cada critério não atendido passou a valer 5 pontos. A pontuação total varia de 50 a 100. A análise detalhada mostra separadamente os critérios de +10 e de +5.
- Motivo: todas as respostas participam da classificação, mas os critérios prioritários continuam produzindo uma pontuação maior.
- Validação: frontend e backend compilados; 17 testes automatizados aprovados; API validada com pontuações entre 50 e 100 e lista em ordem decrescente.

### Criação deste histórico

- Pedido: criar o arquivo `historico.md` e atualizá-lo ao final de cada tarefa, registrando cada pedido, as mudanças e o motivo.
- Alterações: criação deste arquivo na raiz do projeto e definição do padrão de registro das próximas tarefas.
- Motivo: manter rastreabilidade funcional e técnica da evolução do sistema.

## 31/08/2026 — Zonas prioritárias por núcleo

- Pedido: substituir a configuração isolada de bairros prioritários por zonas prioritárias capazes de agrupar vários bairros de cada núcleo; permitir que usuários da Gestão Geral ou do Administrativo criem essas zonas.
- Alterações: criação da entidade e da API de zonas prioritárias, vinculadas ao núcleo; inclusão da aba “Zonas” no detalhe do núcleo; funções para criar, editar e excluir zonas e adicionar ou remover seus bairros; exibição do nome da zona na análise das solicitações.
- Regra de acesso: Gestão Geral e Administrativo podem criar, editar e excluir zonas. Outros profissionais não podem alterar essa configuração.
- Regra de integridade: cada zona precisa de nome e de pelo menos um bairro; nomes de zonas não podem se repetir no mesmo núcleo; um bairro não pode pertencer a duas zonas do mesmo núcleo.
- Regra de classificação: o critério territorial de 10 pontos é atendido quando a cidade corresponde ao núcleo e o bairro da candidata pertence a uma das zonas prioritárias; caso contrário, o critério recebe 5 pontos.
- Compatibilidade: bairros prioritários cadastrados no modelo anterior são migrados automaticamente para uma “Zona prioritária inicial”, evitando perda de dados.
- Motivo: facilitar a gestão de núcleos que priorizam conjuntos maiores de bairros e deixar a regra territorial organizada, compreensível e auditável.
- Validação: frontend e backend compilados; 18 testes automatizados aprovados; testes de permissão para Gestão, Administrativo e profissional comum aprovados; duplicidade de bairro bloqueada; criação, consulta e exclusão de uma zona temporária validadas na API em execução.

## 31/08/2026 — Zonas prioritárias globais e reutilizáveis

- Pedido: corrigir o modelo anterior para que a zona prioritária seja um cadastro independente do núcleo, possa ser reutilizada em núcleos diferentes e receba vários bairros de uma só vez. A criação deve conter nome, município, UF, ponto inicial, ponto final e a lista completa de bairros.
- Exemplo informado: criação da zona “Zona Centro a Jabour”, com os pontos de referência Centro e Jabour e os bairros Centro, Parque Moscoso, Do Moscoso, Vila Rubim, Mário Cypreste, Ilha de Santa Maria, Caratoíra, Santa Martha, Bonfim, Consolação, Jesus de Nazareth, Da Penha, Joana D'arc, Estrelinha, Maria Ortiz e Jabour.
- Alterações: inclusão do gerenciador global “Zonas prioritárias” na tela de Núcleos; cadastro e edição em lote por linhas, vírgulas ou ponto e vírgula; preenchimento rápido com o exemplo informado; vínculo e desvínculo de uma zona existente dentro do detalhe do núcleo; possibilidade de vincular a mesma zona a vários núcleos; exibição da quantidade de zonas nos cards dos núcleos.
- Regra geográfica: os pontos inicial e final são referências descritivas. Eles não calculam automaticamente um raio nem descobrem bairros ao redor, pois dois pontos não definem uma área geográfica segura. A lista explícita de bairros é a regra oficial da zona.
- Regra de inscrição: quando um núcleo possui uma ou mais zonas vinculadas, somente candidatas cujo município, UF e bairro correspondam a uma dessas zonas podem selecionar o núcleo e concluir a inscrição. Um núcleo sem zona vinculada permanece sem restrição territorial configurada. A conferência ocorre no formulário e novamente no backend.
- Correção de dados: os bairros e as zonas do modelo anterior não foram migrados porque eram dados irreais. O cadastro antigo foi descartado ao converter a estrutura para zonas globais.
- Motivo: permitir que a Gestão Geral ou o Administrativo mantenha conjuntos territoriais reutilizáveis, evite digitação repetida e aplique com segurança a mesma área de atendimento em núcleos diferentes.
- Validação: frontend compilado; 19 testes automatizados do backend aprovados; teste específico confirmou a exposição da zona no formulário público e o bloqueio de bairro fora da área; frontend na porta 8080 e backend na porta 8085, com resposta HTTP 200.

## 05/10/2026 — Gestão de inscrições, equipes e identidade visual

- Pedido: aprimorar a análise das inscrições e da lista de espera, permitir à Gestão Geral realizar as mesmas decisões do Administrativo, organizar o vínculo dos profissionais por função e atualizar a apresentação visual do sistema.
- Alterações nas inscrições: inclusão de filtro por faixas de pontuação, identificação de candidatas dentro ou fora da zona prioritária e exibição da lista de espera por núcleo. A fila é ordenada pela maior pontuação e, em caso de empate, pela inscrição mais antiga; o relato para desempate permanece disponível na análise individual.
- Alterações de permissão: Gestão Geral e Administrativo podem aprovar inscrições, encaminhar candidatas à lista de espera, chamar a próxima candidata quando houver vaga e decidir sobre a vaga para criança.
- Alterações nas equipes: o vínculo em lote passou a permitir a escolha de uma função para cada profissional. No mesmo núcleo, cada profissional mantém uma única função, embora possa atuar em várias turmas; em outro núcleo, pode exercer função diferente. A regra é aplicada tanto ao vínculo em lote quanto ao vínculo individual e mantém compatibilidade com o formato anterior da API.
- Alterações técnicas: respostas para endereço inexistente, parâmetros inválidos, método HTTP incorreto e corpo de requisição inválido passaram a preservar códigos HTTP adequados, evitando tratá-las como erro interno do servidor.
- Alterações visuais: aplicação de fundo claro nas páginas, menu lateral azul com destaque laranja para a opção ativa e ajustes de contraste e espaçamento em cards e telas administrativas.
- Motivo: tornar a priorização e a convocação transparentes, alinhar as permissões da Gestão Geral às do Administrativo, impedir funções conflitantes dentro de um núcleo e melhorar a consistência visual e das respostas da API.
- Validação: build do frontend concluído; lint concluído sem erros e com avisos; 21 testes automatizados do backend aprovados, incluindo os testes da atuação da Gestão Geral nas inscrições e da regra de uma função por profissional em cada núcleo.

## 05/10/2026 — Registro obrigatório das atualizações

- Pedido: manter o `historico.md` atualizado em todas as alterações futuras do sistema.
- Alterações: criação da skill de projeto `registrar-historico`, acionável em tarefas que implementem, corrijam, removam ou alterem comportamento, regras de negócio, interface, configuração ou documentação. A mesma skill foi disponibilizada em `.codex/skills/` para o Codex e em `.claude/skills/` para o Claude Code.
- Regra de documentação: toda tarefa que modificar o projeto deve acrescentar ao histórico a data, o pedido, as alterações concluídas, o motivo, as regras ou permissões afetadas e somente as validações realmente executadas. Tarefas apenas de leitura ou diagnóstico não geram registro.
- Motivo: tornar a atualização do histórico parte da definição de tarefa concluída e preservar a rastreabilidade das decisões do projeto.
- Validação: conteúdo das cópias do Codex e do Claude Code comparado e confirmado como idêntico; o validador automático não pôde ser executado porque a dependência `PyYAML` não está instalada no ambiente.

## 05/10/2026 — Sistema de avaliação e autoavaliação das alunas

- Pedido: criar uma avaliação semelhante à chamada para que a professora de Defesa Pessoal registre a nota da aluna, permitir que a própria aluna faça sua autoavaliação e exibir o acompanhamento no perfil da aluna, com cards bonitos e práticos alinhados à paleta do sistema.
- Alterações para a professora: inclusão da opção “Avaliações” no menu exclusivo da professora de Defesa Pessoal, com seleção de turma e data, cards das alunas, lançamento de nota de 0 a 10 com uma casa decimal, feedback individual, indicadores de preenchimento e salvamento em lote.
- Alterações para a aluna: inclusão no perfil de um painel com média das notas da professora, média das autoavaliações, evolução, quantidade de avaliações, comparação visual, histórico cronológico e feedbacks. Em cada avaliação, a aluna pode registrar ou atualizar sua nota de 0 a 10 e uma reflexão pessoal.
- Regras de acesso: somente uma professora vinculada e ativa na função `PROFESSORA_DEFESA_PESSOAL` da turma pode consultar ou lançar suas avaliações. A aluna acessa somente o próprio histórico e não pode consultar nem alterar a avaliação de outra aluna.
- Regras de integridade: existe uma avaliação por aluna, turma e data; somente alunas aprovadas e vinculadas à turma podem ser avaliadas; notas fora do intervalo de 0 a 10 são rejeitadas; uma turma com avaliações registradas não pode ser excluída.
- Pesquisa visual: a composição foi inspirada em referências de dashboards educacionais, usando resumo de desempenho, barras de progresso, comparação de notas e linha do tempo. Os cards mantêm a identidade visual do projeto em roxo, rosa e laranja e se adaptam a telas menores.
- Motivo: permitir acompanhamento pedagógico contínuo, reunir a percepção da professora e da própria aluna e apresentar a evolução de forma simples, segura e motivadora.
- Validação: build do frontend concluído; lint concluído sem erros e apenas com avisos já existentes; compilação do backend concluída; teste de integração específico da avaliação aprovado; suíte completa do backend aprovada com 22 testes, sem falhas ou erros; verificação de espaços e conflitos no diff concluída sem erros.

## 06/10/2026 — Correção do envio do comprovante de residência

- Pedido: corrigir o erro de servidor apresentado ao enviar a ficha de confirmação com os documentos obrigatórios.
- Causa: a coluna `documentos_anexos.tipo` aceitava somente 10 caracteres, mas o identificador `COMPROVANTE_RESIDENCIA` possui 22 caracteres. O MySQL rejeitava o documento e desfazia o envio da ficha com `DataIntegrityViolationException`.
- Alterações: ampliação do campo `tipo` para 40 caracteres no modelo; inclusão de ajuste idempotente de schema para bancos antigos; criação de teste de integração que grava o valor completo do comprovante de residência sem truncamento.
- Motivo: permitir que o comprovante obrigatório seja persistido e evitar que uma diferença entre o modelo atual e bancos já existentes provoque erro interno durante a confirmação da aluna.
- Validação: teste específico aprovado; suíte completa do backend aprovada com 23 testes, sem falhas ou erros; backend reiniciado com sucesso; alteração automática da coluna observada no log; banco MySQL ativo consultado diretamente e confirmado com `documentos_anexos.tipo` em `varchar(40)`.

## 06/10/2026 — Atualizações da gestão, confirmação e experiência da aluna

- Pedido: aplicar as instruções do documento `atualizacao.docx`, corrigir a primeira aula salva que não aparecia no calendário, destacar o acompanhamento das avaliações no perfil da aluna e corrigir a imagem quebrada no menu móvel.
- Alterações no perfil da aluna: o painel de avaliações e autoavaliações foi reposicionado no início de “Meu Perfil”, mantendo resumo, evolução, histórico e feedbacks; quando ainda não há avaliação, o card informa claramente que o lançamento da professora está pendente.
- Alterações no calendário e painel: a data da primeira aula registrada na inscrição passou a alimentar o calendário e o card “Próxima Aula”, juntamente com horário e local do núcleo ou da turma. A data é interpretada no fuso local, sem deslocamento de dia, e deixa de usar a apresentação fixa “Sábado, 20/06”.
- Alterações de identidade visual: o logo do menu recebeu atualização de cache e um ícone de segurança como fallback, evitando a exibição do símbolo de imagem quebrada caso o arquivo não seja carregado.
- Alterações nos núcleos: inclusão da aba “Chamadas” no detalhe do núcleo, com totais de alunas, presenças, faltas e justificativas, além da identificação da turma, data e professora responsável; os nomes técnicos dos núcleos passaram a ser humanizados e a geração de novos códigos preserva corretamente caracteres acentuados durante a normalização.
- Alterações nas inscrições: os botões “Aprovar vaga”, “Lista de espera”, “Em análise” e “Cancelar inscrição” foram movidos para o detalhe da candidata, e a coluna isolada “Ações” foi removida da listagem.
- Alterações nas equipes: a seleção de profissionais do núcleo passou a listar somente profissionais previamente vinculados ao projeto correspondente. O backend também valida esse vínculo ao adicionar integrantes ao núcleo ou à turma.
- Alterações na ficha de confirmação: e-mail, naturalidade e endereço são pré-preenchidos quando já existem; programas sociais passaram a aceitar múltipla seleção e opção personalizada; perguntas sobre rede de apoio, necessidade de levar filhos e dados das crianças aparecem somente quando o projeto oferece Espaço Kids.
- Regras de acesso e integridade: as decisões sobre inscrições permanecem restritas à Gestão Geral e ao Administrativo; a aluna visualiza somente suas avaliações; e um profissional não pode ser vinculado ao núcleo ou à turma antes de integrar o respectivo projeto.
- Correções técnicas complementares: o carregamento público dos núcleos deixou de descartar registros válidos; o backend recebeu configuração explícita da classe principal para execução pelo Maven; e a confirmação passou a tratar corretamente identificadores completos de documentos e respostas de integridade.
- Motivo: garantir que a interface reflita os dados realmente salvos, concentrar as decisões nos detalhes de cada cadastro, preservar as regras de vínculo entre projeto, núcleo e turma e tornar o acompanhamento da aluna claro e confiável.
- Validação: build de produção do frontend concluído; verificação do diff concluída sem erros; suíte completa do backend aprovada com 25 testes, sem falhas ou erros; testes específicos confirmaram a primeira aula em 29/10/2026 e o bloqueio de profissional não vinculado ao projeto; pacote executável gerado e backend atualizado reiniciado na porta 8085; API pública de núcleos e arquivo do logo confirmados com HTTP 200.

## 06/10/2026 — Avaliações no painel e chamadas detalhadas por núcleo

- Pedido: exibir os cards de avaliação no painel principal da aluna, tornar clicáveis os cards de acompanhamento do núcleo e retirar dos Indicadores os cards redundantes de chamadas e faltas por turma.
- Alterações para a aluna: o painel de avaliações e autoavaliações foi removido de “Meu Perfil” e colocado no painel inicial da aluna, logo após os avisos de confirmação da vaga.
- Alterações nos núcleos: os cards “Alunas no núcleo”, “Presenças” e “Faltas” da aba “Chamadas” passaram a ser clicáveis e acessíveis também pelo teclado. Cada card abre uma janela com os registros que formam o total, incluindo nomes, turma, data, professora responsável e justificativa quando houver falta.
- Alterações nos indicadores: foram removidos o resumo geral de chamadas, o gráfico das últimas aulas e os cards de faltas por turma, evitando duplicidade com o acompanhamento disponível dentro de cada núcleo.
- Motivo: concentrar o acompanhamento de frequência no núcleo correspondente e deixar a avaliação pedagógica visível diretamente no painel usado diariamente pela aluna.
- Validação: build de produção do frontend concluído; lint executado sem erros, mantendo somente avisos preexistentes; verificação de espaços e conflitos no diff concluída sem erros.

## 07/10/2026 — Fim do piscar da interface, decisão direta nas inscrições e nomes dos núcleos

- Pedido: descobrir por que a tela fica piscando como se estivesse atualizando, disponibilizar os botões de aprovação e de fila de espera na listagem de inscrições sem a coluna isolada de ações, e corrigir a exibição de núcleos como `AEST_SERRA`.
- Causa do piscar: a atualização automática ocorre por consulta periódica a cada dez segundos, substituta do envio de eventos do antigo PocketBase. Três comportamentos a tornavam visível: as telas de Inscrições e de Atendimentos ativavam o estado de carregamento a cada ciclo, trocando a lista inteira por um indicador de progresso; o painel de Indicadores registrava três atualizações automáticas para a mesma carga de dados, triplicando as requisições; e o contexto da aplicação substituía a lista de inscrições por um novo valor a cada ciclo, ainda que nada tivesse mudado, o que fazia toda a interface ser redesenhada.
- Alterações no piscar: a recarga automática passou a ocorrer em segundo plano, sem acionar o estado de carregamento, que permanece apenas na primeira abertura da tela; o painel de Indicadores passou a ter uma única atualização automática; e o contexto só substitui a lista de inscrições e a ficha de confirmação quando os dados realmente mudaram.
- Alterações nas inscrições: cada inscrição da listagem passou a exibir os botões "Aprovar" e "Fila de espera" junto ao status, sem recriar a coluna de ações removida anteriormente. Os botões aparecem somente para Administrativo e Gestão Geral e apenas enquanto a inscrição está aguardando, em análise ou na fila de espera; "Fila de espera" fica oculto quando a inscrição já está na fila. O clique não abre o detalhe da candidata, que continua acessível pela linha e mantém as mesmas decisões.
- Alterações nos nomes dos núcleos: foram restaurados os nomes padrão dos cinco núcleos históricos do projeto, usados quando o núcleo correspondente ainda não está cadastrado no backend. A carga inicial deixou de apagar esses nomes quando a consulta pública não retorna núcleos, e a listagem de inscrições passou a usar a formatação de nome de núcleo em vez do código bruto.
- Causa dos nomes técnicos: nenhum núcleo está cadastrado no banco, e a consulta pública retorna lista vazia. Sem nome correspondente, a interface exibia o código da inscrição antiga. O filtro por turma dessa tela também ficava sem opções pelo mesmo motivo.
- Regras e permissões afetadas: as decisões sobre inscrições permanecem restritas ao Administrativo e à Gestão Geral; os estados que admitem decisão continuam sendo aguardando, em análise e fila de espera; a frequência da atualização automática não foi alterada.
- Motivo: eliminar o redesenho constante da interface durante o uso, reduzir requisições desnecessárias ao servidor, encurtar o caminho para aprovar uma candidata ou enviá-la à fila e impedir que códigos técnicos apareçam no lugar do nome do núcleo.
- Validação: build de produção do frontend concluído; lint executado sem erros, mantendo somente avisos preexistentes; medições feitas no navegador com a aplicação em execução, comparando antes e depois. Na tela de Inscrições, nenhum indicador de progresso inserido e nenhuma linha da tabela destruída durante vinte e cinco segundos de atualização automática. No painel de Indicadores, as requisições à carga de dados caíram de seis para duas no mesmo intervalo e a substituição de elementos da página caiu de oitenta e quatro para dezesseis. Na listagem, os núcleos passaram a ser exibidos como "Clube AEST - Serra", "Centro - Vitória" e "Atlântica Ville - Vitória", e os botões de decisão apareceram apenas nas inscrições com status em aberto.

## 07/10/2026 — Abas por situação nas inscrições e verificação dos projetos ausentes

- Pedido: separar em abas as inscrições já aprovadas, em espera e canceladas, no mesmo padrão da tela de Projetos, e verificar por que os projetos desapareceram.
- Alterações nas inscrições: o seletor de status foi substituído por abas, seguindo o padrão visual da tela de Projetos, com as situações Aguardando, Em análise, Em espera, Aprovadas, Canceladas, Reprovadas e Todas. A tela abre na aba Aguardando, que concentra as candidatas pendentes de decisão. A busca por nome ou CPF e o filtro por núcleo continuam disponíveis e se aplicam dentro da aba escolhida.
- Correção adicional: o painel da aluna usava a tabela de rótulos de núcleo sem importá-la, o que interromperia a renderização da tela ao exibir um aviso vinculado a uma turma. A exibição passou a usar a formatação de nome de núcleo, já utilizada no restante do painel.
- Verificação dos projetos: nenhum projeto foi removido pelo sistema. As tabelas de projetos, núcleos e turmas do banco local estão sem registros, enquanto usuários, inscrições e presenças estão preenchidos pela carga inicial automática. A carga inicial não cria projetos, núcleos nem turmas, e nenhuma rotina do backend apaga esses registros. O banco local foi criado do zero nesta máquina, portanto os cadastros feitos anteriormente em outro computador não foram transferidos.
- Regras e permissões afetadas: nenhuma. As abas apenas filtram a consulta já existente e as decisões continuam restritas ao Administrativo e à Gestão Geral.
- Motivo: separar as candidatas pendentes do histórico já decidido, reduzindo a necessidade de filtrar manualmente, e esclarecer a ausência dos projetos sem alterar dados.
- Validação: lint executado sem erros, mantendo somente avisos preexistentes; verificação de tipos executada, sem erros nos arquivos alterados e com a falha do painel da aluna corrigida; navegação na aplicação em execução confirmando as sete abas, a abertura em Aguardando e a troca de conteúdo ao alternar entre elas, com a aba Aprovadas exibindo dez registros aprovados e as abas sem registros exibindo o aviso correspondente; contagem das tabelas do banco consultada diretamente no MySQL.

## 08/10/2026 — Autoavaliação unificada e aba de prioridade nas inscrições

- Pedido: renomear a nota da professora para autoavaliação, porque quem se dá a nota é a aluna e a professora apenas registra; e criar uma aba nas inscrições para concentrar as candidatas com 80 pontos ou mais, deixando de fora a lista de espera, que já tem aba própria.
- Alterações na avaliação: a avaliação de Defesa Pessoal passou a ter uma nota única, a autoavaliação da aluna. A nota separada que a professora lançava e o campo de nota que a aluna preenchia depois foram unificados em um só valor. A professora continua registrando o número informado pela aluna e o feedback; a aluna passou a acrescentar apenas a reflexão escrita.
- Alterações na tela da professora: o título passou a ser "Autoavaliação das alunas", o campo passou a ser "Autoavaliação da aluna", e os textos de apoio explicam que a nota é informada pela aluna. O item do menu foi renomeado para "Autoavaliações". A situação de cada aluna passou a indicar se a autoavaliação foi registrada e se a reflexão já foi escrita.
- Alterações no painel da aluna: saiu o formulário de nota, que duplicava a autoavaliação. Permanecem a nota registrada, o feedback da professora, o histórico, a média, a evolução e o campo de reflexão. O resumo deixou de comparar duas notas e passou a exibir a média própria, o total de autoavaliações registradas e quantas já têm reflexão.
- Alterações no banco: a coluna da nota da professora e a data da autoavaliação foram removidas da tabela de avaliações, e a nota da autoavaliação passou a ser obrigatória. A migração é idempotente e copia a nota antiga para a autoavaliação antes de remover a coluna, de modo que bancos com registros anteriores não perdem a nota.
- Alterações nas inscrições: foi acrescentada a aba "Prioridade 80+", que reúne, independentemente do status, as candidatas com pontuação igual ou superior a 80 que ainda aguardam decisão. A consulta de inscrições ganhou os filtros de pontuação mínima e de pendência de análise.
- Regras de negócio afetadas: a aba de prioridade considera apenas as situações Aguardando e Em análise. A lista de espera ficou de fora porque é revista quando abre vaga e já tem aba própria. O corte é por pontuação igual ou superior a 80 porque esse é exatamente o valor do critério de zona prioritária: quem alcança 80 mora na zona prioritária do núcleo, e quem fica abaixo não mora, já que os outros nove critérios somam no máximo 20 pontos.
- Permissões afetadas: nenhuma. O registro da autoavaliação continua restrito à Professora de Defesa Pessoal vinculada e ativa na turma; a aluna acessa somente o próprio histórico; e as decisões sobre inscrições seguem restritas ao Administrativo e à Gestão Geral.
- Motivo: nomear a avaliação conforme o que ela realmente é, eliminando a nota duplicada que surgia do modelo anterior, e dar à gestão uma visão única das candidatas que moram na zona prioritária e ainda esperam decisão.
- Validação: suíte completa do backend aprovada, com 25 testes, sem falhas nem erros; teste de integração da avaliação ajustado para a nota única e para a reflexão, e aprovado; verificação de tipos e lint executados, sem erros nem avisos novos nos arquivos alterados; backend reiniciado com a migração aplicada no banco local, confirmada pelo registro da remoção das colunas antigas e da nota obrigatória; a aba de prioridade foi conferida na aplicação em execução e passou a listar somente as candidatas pendentes com pontuação a partir de 80.

## 08/10/2026 — Nome do perfil exibido por extenso no menu

- Pedido: o menu lateral mostrava o código técnico do perfil embaixo do nome da usuária, como `ALUNA_FF`, e deveria exibir o nome por extenso.
- Alterações: os nomes por extenso dos perfis passaram a ficar em um único lugar compartilhado, junto dos demais rótulos do sistema, e o menu lateral passou a usá-los nas versões de computador e de celular. A tela de Usuários, que já tinha a sua própria cópia desses nomes, passou a consumir a mesma origem, de modo que os rótulos não possam divergir entre as telas.
- Regras e permissões afetadas: nenhuma. A alteração é de exibição; o valor gravado e usado nas permissões continua sendo o código do perfil.
- Motivo: o código técnico do perfil não deve aparecer para a usuária, e manter dois conjuntos de rótulos levaria a textos diferentes para o mesmo perfil.
- Validação: verificação de tipos e lint executados, sem erros nem avisos nos arquivos alterados.

## 08/10/2026 — Avisos do mural, acesso da aluna e texto da primeira aula

- Pedido: a aluna era levada à Ficha de Confirmação sempre que entrava, mesmo com a ficha já entregue; os avisos não apareciam no mural; e a mensagem exibida após o envio da ficha dizia que a data da primeira aula sairia no mural, quando ela na verdade aparece em "Próxima Aula".
- Causa do redirecionamento: a consulta da ficha de confirmação se repete a cada ciclo da atualização automática, e qualquer falha momentânea era tratada como ausência de ficha. O estado da ficha era apagado, o acesso da aluna se fechava e ela voltava ao formulário no meio da navegação. A tela da Ficha repetia o problema por consultar o mesmo dado por conta própria, podendo exibir o formulário em branco para quem já havia entregue a ficha.
- Alterações no acesso da aluna: a consulta da ficha passou a distinguir "não existe ficha", informado pelo servidor, de "não foi possível consultar". Em caso de falha, a última ficha conhecida é mantida e o acesso não é revogado. A tela da Ficha de Confirmação passou a usar a ficha já carregada pelo aplicativo, em vez de consultá-la novamente, e o envio passa pelo mesmo caminho compartilhado, de modo que o acesso ao painel é liberado e o item do menu é retirado imediatamente após o envio.
- Causa dos avisos ausentes: no painel da aluna, o aviso sem data de validade usava a própria data de publicação como validade, por analogia com os eventos, que de fato acontecem em uma data. Com isso, todo aviso sem "exibir até" desaparecia já no dia seguinte ao da publicação.
- Alterações no mural: a validade passou a ser apenas o campo opcional "exibir até". Sem ele, o aviso não vence e continua no painel da aluna. A visão da gestão não muda, pois já listava todos os avisos.
- Alterações no texto da primeira aula: as duas mensagens que afirmavam que a data da primeira aula seria divulgada no mural foram corrigidas. A data é comunicada por notificação e aparece em "Próxima Aula", no painel da aluna, e no Calendário.
- Regras de negócio afetadas: o aviso sem data de validade passou a ser permanente no painel da aluna; a restrição por núcleo continua valendo, e o aviso dirigido a um núcleo segue visível apenas para as alunas dele. O critério de liberação do painel da aluna não mudou: inscrição aprovada, ficha entregue e vínculo ativo.
- Permissões afetadas: nenhuma.
- Motivo: impedir que uma falha momentânea de rede feche o acesso de uma aluna regular, fazer os avisos cumprirem a função de permanecer visíveis e descrever corretamente onde a data da primeira aula aparece.
- Validação: verificação de tipos e lint executados, sem erros nem avisos novos nos arquivos alterados; consulta ao banco confirmando que, com a nova regra do mural, a aluna do núcleo Atlântica Ville passa a ver dois avisos, antes nenhum, e que o aviso restrito ao núcleo Centro-Vitória continua fora da lista dela; backend reiniciado com a alteração.

## 08/10/2026 — Seletores de núcleo, relatório do núcleo e datas do projeto

- Pedido: verificar se os núcleos listados existem no banco, já que a lista aparecia com nomes repetidos; retirar as perguntas de início e término do projeto; e descobrir por que a tabela de resultados não era gerada no relatório do núcleo.
- Verificação dos núcleos: existem apenas dois núcleos cadastrados, "Atlântica Ville - Vitória" e "Centro - Vitória". Os demais nomes que apareciam na lista são rótulos fixos no código, criados para que inscrições antigas não exibissem o código técnico. Como o código gerado para os núcleos cadastrados não coincide com a chave desses rótulos, os dois conjuntos conviviam e os nomes apareciam duplicados.
- Causa da tabela vazia: os seletores de núcleo ofereciam também os rótulos fixos. Ao escolher um deles, a consulta era feita para um núcleo que não existe e retornava nenhuma aluna, exibindo o aviso de que nenhuma aluna aprovada foi encontrada — o que parecia falha na geração da tabela.
- Alterações nos seletores: passou a existir uma lista separada com os núcleos que realmente existem no backend, preenchida na inicialização, e todos os seletores de núcleo passaram a usá-la: inscrições, usuários, mural, atendimentos, relatórios e painel administrativo. O gráfico de inscrições por núcleo também passou a considerar apenas os núcleos cadastrados. Os rótulos fixos continuam sendo usados somente para traduzir códigos antigos na exibição.
- Alterações no relatório do núcleo: foram retiradas as perguntas de início e término do projeto. Essas datas não eram calculadas: o valor digitado era apenas repetido em todas as linhas da planilha, de modo que as duas colunas correspondentes também foram retiradas da exportação, junto dos parâmetros equivalentes no backend.
- Regras de negócio afetadas: a escolha de núcleo passou a ser restrita aos núcleos cadastrados, o que impede gerar relatório, aviso ou vínculo para um núcleo inexistente. Nenhuma permissão foi alterada.
- Motivo: a lista de núcleos precisa refletir o que existe no banco, e perguntas cujo resultado não é usado não devem ser feitas.
- Validação: verificação de tipos executada, mantendo exatamente os mesmos vinte e três erros preexistentes do início da tarefa, sem nenhum novo; lint executado sem achados novos; consulta ao banco confirmando a existência de apenas dois núcleos; backend reiniciado com as alterações.
- Observação registrada: o código gerado para o núcleo troca letras acentuadas por sublinhado, o que produziu códigos como `CENTRO_VIT_RIA` e impediu que os núcleos cadastrados substituíssem os rótulos fixos de mesmo nome. O nome de um dos núcleos também está gravado com espaço duplo. Nenhum dos dois foi alterado nesta tarefa.

## 08/10/2026 — Mensagem de erro visível no relatório do núcleo

- Pedido: descobrir, pelos registros, por que a geração da tabela do relatório do núcleo estava falhando.
- Causa: a tela ainda mantinha selecionadas as colunas de início e término do projeto, retiradas na alteração anterior. O backend passou a recusá-las, respondendo que um dos dados selecionados é inválido, e a tela exibia apenas "Erro ao gerar a tabela", sem o motivo. A seleção não é gravada em lugar nenhum: ela apenas sobreviveu na aba aberta, e recarregar a página desfaz a situação.
- Por que não estava nos registros: o backend grava no log somente as falhas internas. Erros de validação são respondidos como mensagem ao cliente e não geram registro. A chamada foi reproduzida diretamente na API para capturar a resposta.
- Alterações: a tela de Relatórios passou a exibir a mensagem devolvida pelo servidor ao gerar a tabela e ao exportar a planilha, em vez do aviso genérico.
- Regras de negócio e permissões afetadas: nenhuma.
- Motivo: um aviso que não diz o motivo impede a correção pelo próprio usuário e obriga a investigar fora da aplicação.
- Validação: chamada de prévia reproduzida na API com dois campos válidos, respondendo com as cinco alunas aprovadas do núcleo; exportação reproduzida, devolvendo planilha válida no formato do Excel; chamada com uma das colunas retiradas reproduzida, confirmando a recusa com a mensagem de dado inválido; verificação de tipos e lint executados sem achados novos nos arquivos alterados.

## 08/10/2026 — Bens da família no relatório e fim das opções repetidas

- Pedido: entender por que o mesmo campo "Bens da família" aparecia em formatos diferentes entre duas fichas e eliminar as opções repetidas na escolha dos dados a exportar.
- Causa da diferença de formato: o campo passou a registrar a quantidade de cada bem, e as duas formas convivem no banco. A ficha de agosto gravou apenas a lista de nomes dos bens; a ficha de outubro gravou cada bem com a respectiva quantidade. O relatório convertia o valor em texto sem reconhecer a segunda forma, e por isso exibia a representação interna do objeto, como "{item=Bicicleta, quantidade=1}".
- Alterações na exibição: a montagem do relatório e a visualização da ficha passaram a reconhecer as duas formas. O bem com quantidade é exibido como "Bicicleta (1)" e a forma antiga, apenas com o nome, permanece inalterada. A correção vale para a prévia, para a planilha exportada e para a consulta da ficha.
- Causa das opções repetidas: a lista de dados exportáveis somava os campos do cadastro aos campos da ficha de confirmação, e onze deles existem nos dois lugares — nome, data de nascimento, CPF, RG, telefone, e-mail, CEP, endereço, bairro, cidade e estado.
- Alterações na escolha dos dados: os onze campos repetidos deixaram de ser oferecidos pela ficha de confirmação, permanecendo os do cadastro. A lista saiu de sessenta e cinco para cinquenta e quatro opções, sem pares de mesmo nome.
- Regras de negócio afetadas: a ficha de confirmação não grava de volta no cadastro da inscrição, de modo que um endereço corrigido na ficha permanece apenas nela. Com a alteração, o relatório passa a exportar a versão do cadastro desses onze campos, que existe para toda aluna aprovada mesmo quando a ficha ainda não foi entregue. Nenhuma permissão foi alterada.
- Motivo: um relatório não deve expor a representação interna dos dados nem oferecer duas opções com o mesmo nome para a mesma informação.
- Validação: consulta ao banco confirmando os dois formatos gravados para o campo de bens, um com lista de nomes e outro com nome e quantidade; verificação de tipos executada, mantendo os mesmos vinte e três erros preexistentes e nenhum novo; lint executado sem achados nos arquivos alterados; backend reiniciado com as alterações.

## 08/10/2026 — Nome do núcleo na coluna do relatório

- Pedido: a coluna Núcleo da tabela do relatório exibia o código técnico do núcleo, como `ATL_NTICA_VILLE_VIT_RIA`, e deveria exibir o nome.
- Causa: a inscrição guarda o código do núcleo, e a montagem do relatório copiava esse valor direto para a coluna, sem traduzir para o nome cadastrado.
- Alterações: a montagem do relatório passou a buscar o nome do núcleo correspondente ao código. O nome é resolvido uma única vez por consulta, já que todas as linhas pertencem ao mesmo núcleo. Quando o código não corresponde a nenhum núcleo cadastrado, ele continua sendo exibido, para a linha não ficar sem identificação. A correção vale para a prévia e para a planilha exportada.
- Regras de negócio e permissões afetadas: nenhuma. O valor gravado na inscrição continua sendo o código.
- Motivo: códigos técnicos não devem aparecer em relatório entregue à gestão.
- Validação: backend reiniciado com a alteração e coluna conferida na resposta da API.

## 08/10/2026 — Formato único para os bens da família

- Pedido: padronizar a coluna de bens da família ao gerar a tabela, que saía em dois formatos conforme a época da ficha.
- Alterações: a coluna passou a exibir somente os nomes das opções, em todas as fichas. As fichas que registram a quantidade deixam de exibi-la na tabela e na planilha, e as anteriores, que nunca perguntaram quantidade, permanecem como estão. O mesmo formato vale para a consulta da ficha.
- Motivo da escolha: exibir a quantidade em todas as linhas faria as fichas antigas aparentarem uma informação que a aluna não prestou, já que o campo não existia quando foram preenchidas. Com o nome apenas, a coluna tem um formato único sem atribuir dado a quem não o informou.
- Regras de negócio e permissões afetadas: nenhuma. A quantidade continua gravada e pode voltar a ser exibida se for necessário.
- Validação: verificação de tipos e lint executados sem achados novos nos arquivos alterados; backend reiniciado com a alteração.
- Observação sobre o ambiente: a inicialização do backend falhou por falta de memória do sistema, e não por erro de código. O servidor de desenvolvimento do frontend estava ocupando 4,4 GB após horas em execução. Reiniciá-lo liberou memória suficiente (de 2,6 GB para 7,7 GB livres). Os processos Java de longa duração da máquina pertencem às extensões do editor e foram preservados.

## 08/10/2026 — Retirada do aviso de período diferente do pedido

- Pedido: retirar o aviso "Período diferente do pedido na inscrição" exibido na lista de alunas do núcleo, porque a aluna não escolhe período à parte: a inscrição já mostra o dia e o turno em que as aulas acontecem e ela entra no turno que escolheu.
- Alterações: foram retirados o aviso de divergência e a indicação do período pedido ao lado da turma da aluna. A mesma indicação foi retirada da dica exibida na seleção de alunas para alocação em lote, que comparava a turma com o período pedido.
- Regras de negócio afetadas: deixou de existir, na interface, a noção de divergência entre a turma da aluna e um período pedido na inscrição. O campo continua gravado na inscrição e nenhuma alocação foi alterada.
- Motivo: a comparação pressupunha uma escolha de período independente da turma, que não existe no fluxo real. O aviso apontava uma inconsistência inexistente e pedia conferência sem necessidade.
- Validação: verificação de tipos executada, mantendo os mesmos vinte e três erros preexistentes e nenhum novo; lint executado sem achados no arquivo alterado.

## 08/10/2026 — Uma turma por núcleo e fim da alocação de alunas

- Pedido: não existe a etapa de alocar aluna em turma, e cada núcleo tem uma única turma.
- Situação encontrada: o núcleo Centro - Vitória tinha duas turmas, Turma B e Turma C, ambas sem nenhuma aluna, chamada, avaliação, registro de aula ou profissional vinculado. A Turma C foi removida. Cada núcleo passou a ter exatamente uma turma.
- Alterações no backend: criar uma segunda turma no mesmo núcleo passou a ser recusado, com a orientação de editar a turma existente. A aluna entra na turma do núcleo no momento da aprovação da inscrição. Quando a turma é criada depois, as alunas já aprovadas daquele núcleo que estavam sem turma passam a pertencer a ela. Os três endpoints de alocação — alocar, alocar em lote e desalocar — foram removidos.
- Correção na transferência de núcleo: ela deixava a aluna sem turma, à espera de uma realocação manual que não existe mais. Passou a vincular a aluna diretamente à turma do núcleo de destino; se esse núcleo ainda não tiver turma, o vínculo acontece quando a turma for criada.
- Alterações na tela do núcleo: foram retirados o seletor de turma de cada aluna, o botão de alocar alunas e a seleção em lote. Os textos passaram a descrever o funcionamento atual, e o aviso de alunas sem turma orienta a abrir a turma do núcleo.
- Regras de negócio afetadas: um núcleo passa a comportar uma única turma; a aluna aprovada pertence automaticamente a ela; não há mais como colocar ou retirar uma aluna da turma manualmente. A única situação em que a aluna fica sem turma é o núcleo ainda não ter turma aberta, e isso se resolve sozinho na criação da turma.
- Permissões afetadas: nenhuma. A criação e a edição de turma seguem restritas à Gestão Geral.
- Motivo: a alocação pressupunha várias turmas por núcleo e uma escolha que o processo real não tem.
- Validação: consulta ao banco confirmando que as duas turmas do Centro - Vitória estavam sem qualquer vínculo antes da remoção, e que cada núcleo ficou com uma turma; compilação do backend concluída; suíte completa do backend aprovada, com 25 testes, sem falhas nem erros; verificação de tipos mantendo os mesmos vinte e três erros preexistentes e nenhum novo; lint sem achados novos; backend reiniciado com as alterações.

## 22/10/2026 — Cadastros de equipe visíveis na tela de Solicitações

- Pedido: o cadastro de professor feito pelo formulário público não aparecia em Solicitações.
- Situação encontrada: o cadastro tinha sido gravado como solicitação pendente. A solicitação de cadastro de equipe não tem núcleo, e a tela só lista itens depois que um núcleo é escolhido no filtro. Esses cadastros ficavam na última opção, "Sem núcleo definido", sem nenhum aviso de que havia pendências.
- Alterações: a opção do filtro passou a se chamar "Cadastros de equipe". Ao abrir a tela sem núcleo escolhido, ela é selecionada automaticamente quando existe alguma solicitação sem núcleo.
- Regras de negócio e permissões afetadas: nenhuma. Quem vê e quem aprova cada tipo de solicitação continua igual.
- Motivo: evitar que cadastros de equipe pendentes passem despercebidos pela Gestão Geral e pelo Administrativo.
- Validação: consulta ao banco confirmando a solicitação pendente sem núcleo; verificação de tipos sem erros no arquivo alterado. A tela não foi testada no navegador.

## 22/10/2026 — Foto do projeto na tela de login

- Pedido: usar na tela de login a foto das alunas do Força Feminina em aula.
- Alterações: a imagem genérica, carregada de um banco de imagens externo, foi substituída pela foto do projeto, salva em `public/login-forca.jpg`. O original tinha 5472×3648 px e 10,8 MB; a versão usada foi reduzida para 1920×1280 px e 338 KB. A foto passou a aparecer nítida, com uma camada em degradê roxo e rosa por cima para manter a leitura do título e do botão de inscrição.
- Motivo: mostrar o projeto real na entrada do sistema e deixar de depender de uma imagem externa.
- Regras de negócio e permissões afetadas: nenhuma.
- Validação: conferência de que as cores da marca aceitam transparência no Tailwind. A tela não foi conferida no navegador.

## 22/10/2026 — Opções de orientação sexual e descrições de gênero na inscrição

- Pedido: revisar as opções de orientação sexual do cadastro da aluna e usar os novos textos de explicação das identidades de gênero.
- Alterações na orientação sexual: as opções passaram a ser Heterossexual, Lésbica, Bissexual, Pansexual, Assexual e "Outra orientação sexual". "Homossexual" saiu da lista. Cada opção mostra a sua descrição dentro da lista, como já acontecia no campo de gênero. Ao escolher "Outra orientação sexual", aparece o campo "Como você se identifica?", de preenchimento obrigatório, e o texto é gravado na nova coluna `orientacao_sexual_outro`. A análise da inscrição mostra a autodescrição junto da opção escolhida.
- Alterações no gênero: as descrições de Mulher Cisgênero, Mulher Transgênero e Não Binária foram trocadas pelos textos enviados. Os nomes das opções continuaram os mesmos, porque são o valor gravado e validado nas inscrições já existentes.
- Regras de negócio afetadas: o backend passou a aceitar somente a nova lista e a exigir a autodescrição quando a opção for "Outra orientação sexual". O critério de prioridade "Orientação sexual LGBTQIA+" segue valendo para qualquer resposta diferente de Heterossexual, o que inclui as novas opções. A única inscrição existente com "Homossexual" foi mantida como estava, por ser um dado autodeclarado.
- Motivo: as opções antigas não incluíam a autodescrição e usavam um termo genérico no lugar de "Lésbica", que é o adequado para o público do projeto.
- Validação: verificação de tipos do frontend sem erros; testes InscricaoFluxoIntegrationTest e ZonaPrioritariaIntegrationTest aprovados, com 8 testes e nenhuma falha; backend reiniciado e criação da coluna `orientacao_sexual_outro` conferida no banco. O formulário não foi testado no navegador.

## 22/10/2026 — Servidor do frontend deixa de vigiar a pasta do backend

- Situação encontrada: o servidor de desenvolvimento do frontend (Vite) caiu com o erro `EBUSY` enquanto o Maven rodava os testes do backend. O Vite vigiava todos os arquivos do projeto, inclusive `backend/target`, e encerrou ao encontrar um arquivo travado pelo Maven.
- Alterações: `vite.config.ts` passou a ignorar a pasta `backend/` na vigilância de arquivos do servidor de desenvolvimento.
- Motivo: o backend não faz parte do código do frontend, e rodar os testes ou compilar o backend não deve derrubar o servidor do frontend.
- Regras de negócio e permissões afetadas: nenhuma.
- Validação: frontend reiniciado; a porta 8080 respondeu com o código 200.

## 22/10/2026 — Autorização de uso de imagem passa a ser opcional

- Pedido: a autorização de uso de imagem não pode ser obrigatória.
- Alterações: na seção "Declarações finais" da ficha de confirmação, a autorização de uso de imagem deixou de ser obrigatória e de exibir o asterisco vermelho, e o texto passou a terminar com "(opcional)". A aluna conclui a ficha marcando ou não a autorização, e a escolha continua gravada.
- Regras de negócio afetadas: a autorização de uso de imagem deixa de ser condição para enviar a ficha. Compromisso de frequência, veracidade das informações e aceite da LGPD continuam obrigatórios. O backend nunca exigiu esse campo, então não foi alterado.
- Motivo: a cessão do direito de imagem precisa ser uma escolha livre da aluna e não pode condicionar a participação no projeto.
- Validação: verificação de tipos sem erros. A ficha não foi testada no navegador.

## 23/10/2026 — Aba Alunas no perfil profissional, remoção do Feedback e fim da tela piscando

- Pedido: criar no perfil profissional a aba "Alunas" com pesquisa, foto e perfil individual (cadastro, saúde e medida protetiva); remover a funcionalidade de Feedback da interface; corrigir a tela que piscava e parecia atualizar sem parar.
- Alterações na aba Alunas: novo endpoint `GET /api/profissional/alunas` (lista com pesquisa por nome, sem acento e sem diferenciar maiúsculas) e `GET /api/profissional/alunas/{userId}` (perfil individual), em `AlunaPerfilController`. A lista traz só nome, foto, turma e núcleo. O perfil individual traz cadastro (nascimento, telefone, e-mail, bairro, cidade, turma, núcleo e contato de emergência), saúde (PcD, comorbidades, medicação contínua, alergias, cirurgias recentes, vindos da inscrição e da seção Saúde da ficha de confirmação) e apenas a existência de medida protetiva, sem o histórico de violência. Sem foto cadastrada, aparece um ícone de pessoa. A aba aparece no perfil de quem é profissional, ao lado de "Histórico".
- Regras de acesso e privacidade: decisão da Gestão de que todo profissional pode ver o perfil completo, inclusive saúde e medida protetiva, mas só das alunas aprovadas das turmas em que tem vínculo ativo; Gestão Geral e Administrativo veem todas. A regra é validada no backend; aluna de outra turma responde "não encontrada", sem revelar que existe; aluna não acessa os endpoints. Cada abertura de perfil individual grava um registro na nova tabela `acesso_dado_sensivel` (quem viu, de qual aluna, categorias e quando), só de inserção.
- Alterações no Feedback: saíram o item "Feedback" do menu e a rota `/profissional/feedback`, e o card do Histórico passou a dizer "Evidências de aula enviadas". Os registros de feedback já gravados e o tipo `FEEDBACK` no backend foram mantidos, sem exclusão de dados. O campo "Feedback para a aluna" das Autoavaliações é outra funcionalidade e não foi alterado.
- Causa da tela piscando: as telas atualizam por polling a cada 10 s, e cada ciclo gravava no estado objetos novos mesmo com dados idênticos. O React redesenhava a tela e os gráficos refaziam a animação de entrada. Medido no painel de indicadores: 33 elementos apagados e recriados em 30 s, sem nenhum dado ter mudado.
- Correções: o cliente da API (`src/lib/api/client.ts`) devolve o mesmo objeto quando um GET repetido traz conteúdo idêntico, o que corrige todas as telas com polling de uma vez. Chamada e Alunos do professor deixaram de trocar a lista pelo "carregando" a cada ciclo. A Chamada também deixou de apagar marcações ainda não salvas na atualização automática. Os dados dos gráficos do painel e das pizzas por turma passaram a ser calculados uma vez por resposta. Solicitações, Calendário e Painel da Aluna tinham vários pollings chamando a mesma recarga (2, 2 e 3 vezes por ciclo) e passaram a ter um só. O contexto global deixou de baixar a lista completa de inscrições e a ficha de confirmação a cada 10 s para perfis que não são aluna. O Meu Perfil mostra um "carregando" até decidir o layout, em vez de exibir o formulário e trocá-lo pelas abas.
- Motivo: atender ao pedido de consulta das alunas pelos profissionais com controle e auditoria de dados sensíveis, retirar uma funcionalidade não usada e eliminar a causa do piscar, em vez de escondê-lo.
- Validação: no navegador, painel de indicadores parado por 30 s passou de 33 para 0 elementos recriados e de 9 para 3 requisições; Inscrições e Solicitações sem elementos recriados; painel recarregado do zero sem erros no console; rota `/profissional/feedback` cai na página 404 e o menu não tem mais o item. Novo teste `AlunaPerfilIntegrationTest` (escopo por turma, lista sem dado sensível, pesquisa, bloqueio de outra turma e de aluna, registro de auditoria) aprovado; suíte do backend com 26 testes e nenhuma falha; verificação de tipos sem erros novos. Na base real, a lista respondeu com 5 alunas e sem campos sensíveis, consultada como Gestão. Não foi aberto perfil individual de aluna real para não criar registro de auditoria falso. A aba Alunas não foi vista no navegador, porque não havia conta de profissional disponível para login nesta máquina.

## 23/10/2026 — "Alunas" passa do Meu Perfil para o menu lateral

- Pedido: tirar a consulta de alunas das abas do Meu Perfil e colocá-la no menu lateral.
- Alterações: nova página `/profissional/alunas` (`AlunasPage`), que reaproveita o mesmo componente da aba, e novo item "Alunas" no menu lateral, logo abaixo de "Evidências". A aba "Alunas" saiu do Meu Perfil, que voltou a ter Meu perfil, Histórico e uma aba por turma.
- Regras de negócio e permissões afetadas: nenhuma mudança de acesso. O item do menu segue a regra de "Evidências" e só aparece para quem tem vínculo com alguma turma. O backend continua limitando a lista às alunas das turmas da pessoa e registrando cada abertura de perfil individual.
- Motivo: deixar a consulta das alunas a um clique no menu, em vez de escondida dentro do perfil.
- Validação: verificação de tipos sem erros novos; no navegador, a página `/profissional/alunas` abriu com a lista e a aba sumiu do Meu Perfil. O item do menu não foi visto, porque a conta usada no teste (Gestão, sem turma) não tem vínculo e por isso não o exibe.

## 23/10/2026 — Gráficos socioeconômicos para a Assistente Social e correção do gráfico de renda

- Pedido: dar à Assistente Social acesso aos gráficos do perfil socioeconômico; investigar por que o gráfico de renda aparecia sem dados.
- Causa do gráfico vazio: o backend procurava a faixa de renda na seção 6 da ficha de confirmação (perfil socioeconômico), mas o formulário a grava na seção 3 ("Dados profissionais"). Na base havia 2 fichas, as duas com a renda na seção 3 e nenhuma na seção 6. O tipo de moradia está mesmo na seção 6, por isso só ele aparecia.
- Alterações: o cálculo passou a ler a renda da seção 3, com a seção 6 como reserva para fichas antigas. Novo endpoint `GET /api/indicadores/socioeconomico`, com só as contagens de renda e moradia. Os dois gráficos viraram o componente compartilhado `GraficosSocioeconomicos`, usado no painel de Indicadores e na nova página `/assistente/socioeconomico`. Essa página entrou no menu como "Socioeconômico", só para a Assistente Social.
- Regras de negócio e permissões afetadas: a Assistente Social passa a ver as distribuições agregadas de renda e moradia, que não trazem nomes de alunas. O painel completo de indicadores (`/api/indicadores/dashboard`), com contagens de inscrições e listas de nomes, continua restrito à Gestão Geral e ao Administrativo. Outros profissionais não acessam os gráficos.
- Motivo: a Assistente Social precisa do perfil socioeconômico no acompanhamento das alunas, sem receber os demais indicadores.
- Validação: novo teste `SocioeconomicoIntegrationTest` (renda lida da seção 3; Assistente Social acessa os gráficos e recebe 403 no painel completo; professor recebe 403); suíte do backend com 27 testes e nenhuma falha; verificação de tipos sem erros novos; no navegador, a página mostrou o gráfico de renda com as 2 faixas e o de moradia. A página foi vista com a conta da Gestão, não com uma conta de Assistente Social.

## 23/10/2026 — Cadastro de profissional com tipo (professor, assistente social e administrativo)

- Pedido: ter uma aba de cadastro de profissional, porque a equipe tem vários tipos de profissional, como administrativo e assistente social.
- Situação encontrada: o "Cadastro da Equipe" (autocadastro público) não perguntava o tipo, e a aprovação sempre criava a conta como Professor. Assistente social ou administrativo que se cadastrasse por ali entrava com o perfil errado. O "Novo usuário" da tela Usuários cria qualquer perfil, mas só com nome, e-mail e senha.
- Alterações: o formulário passou a ter o campo obrigatório "Tipo de profissional" (Professor(a), Assistente Social ou Administrativo), e a aprovação em Solicitações cria a conta com o tipo escolhido. Novo item "Cadastro de profissional" no menu da Gestão Geral (`/gestao/cadastro-profissional`): usa o mesmo formulário e as mesmas validações, e a conta já nasce criada e aprovada. A solicitação fica registrada como aprovada por quem cadastrou, guardando dados e documentos no mesmo lugar dos cadastros aprovados. A criação da conta foi para o serviço `ContaProfissionalService`, usado pelos dois caminhos. O link do login passou a dizer "Cadastre-se como profissional". Em Solicitações, o card e o detalhe do cadastro de equipe mostram o tipo escolhido.
- Regras de negócio e permissões afetadas: Gestão Geral não pode ser escolhida no cadastro. O cadastro direto (`POST /api/cadastro-profissional`) é exclusivo da Gestão Geral. Cadastros antigos, feitos antes da escolha do tipo, continuam sendo aprovados como Professor.
- Motivo: cada profissional precisa entrar no sistema com o perfil da sua função.
- Validação: novo teste `CadastroProfissionalIntegrationTest` (autocadastro de assistente social aprovado vira conta de Assistente Social; tipo ausente e Gestão Geral são recusados; cadastro pela Gestão cria a conta já ativa e com login funcionando; professor recebe 403 no cadastro direto); suíte do backend com 30 testes e nenhuma falha; verificação de tipos sem erros novos. No navegador, o item aparece no menu da Gestão, a página interna e o formulário público mostram o campo de tipo, e o campo tem as 3 opções. Nenhum cadastro foi enviado pela interface, para não criar contas reais.

## 23/10/2026 — Descrições de gênero e orientação sexual cortadas na lista da inscrição

- Pedido: o texto das opções de gênero aparecia cortado na lista da inscrição.
- Causa: a lista tinha largura máxima de 28rem, mas a área interna acompanhava a largura do campo, que é maior. O texto quebrava pela largura do campo e o pedaço que passava dos 28rem ficava escondido. Sem esse limite, a lista crescia até caber a frase mais longa (645 px) e, no celular, saía da tela de 375 px.
- Alterações: as listas de gênero e de orientação sexual passaram a ter exatamente a largura do campo. As descrições quebram linha dentro dela.
- Regras de negócio e permissões afetadas: nenhuma.
- Validação: medido no navegador com a lista aberta. No computador, lista e campo têm a mesma largura e nenhuma descrição fica cortada. No celular (375 px), a lista ocupa só a largura do campo, não sai da tela e os textos quebram em várias linhas. Verificação de tipos sem erros novos. O formulário foi preenchido com dados fictícios e não foi enviado.

## 29/10/2026 — Correções de segurança e de regras de negócio do relatório de análise

- Pedido: aplicar as correções do relatório técnico de 23/10/2026 (`docs/relatorio-analise-2026-10-23.md`).
- Alterações:
  - Upload: a extensão gravada passou a vir do tipo validado, não do nome enviado, e os primeiros bytes do arquivo precisam bater com o tipo declarado (JPEG, PNG, GIF, WEBP ou PDF). Arquivos são servidos com o tipo da lista e `nosniff`; extensões fora da lista saem só como download.
  - Arquivos: `GET /api/files/{nome}` passou a conferir a quem o arquivo pertence (novo `FileAccessService`). Foto de perfil: qualquer pessoa logada. Documentos da ficha: a própria aluna, Assistente Social, Administrativo e Gestão. Fotos de evidência: gestão, quem registrou e quem atua na turma. Documentos do cadastro da equipe: Administrativo e Gestão. Sem permissão responde 404. `GET /api/confirmacoes/{id}/documentos` ganhou a mesma regra de acesso da ficha.
  - Atendimentos: a lista deixou de ser acessível a alunas; o professor vê só os públicos dos núcleos em que atua (pelos vínculos de turma) e os que ele criou. O cadastro passou a validar o tipo de acesso e se a aluna é aprovada no núcleo informado.
  - Usuários: ninguém altera o próprio núcleo pelo `PATCH /api/users/{id}` (só a Gestão Geral); o Administrativo não edita, ativa ou inativa contas da Gestão Geral; contas excluídas não podem ser reativadas.
  - Exportação do núcleo: os campos da ficha que o Administrativo pode exportar viraram lista branca (`CAMPOS_FICHA_ADMINISTRATIVO`, no backend e no frontend). Saúde, renda, perfil socioeconômico, filhos, violência e textos livres ficam só com a Gestão Geral.
  - Candidata não liberada (sem aprovação ou sem ficha de confirmação): mural, eventos e calendário voltam vazios e a inscrição em eventos é recusada (novo `AlunaAcessoService`). O núcleo da aluna no mural e no calendário passou a vir da inscrição aprovada, não do parâmetro da tela. A aluna só se inscreve em eventos gerais ou do próprio núcleo.
  - `GET /api/nucleos` (lista completa, com endereço e telefone) restrito a Gestão, Administrativo e Assistente Social.
  - Ficha de confirmação: o prazo foi para a configuração (`app.confirmacao.prazo`, variável `CONFIRMACAO_PRAZO`, padrão 31/12/2026 23:59 de Brasília) e o cancelamento por prazo expirado passou a ser gravado de fato (antes era desfeito pelo rollback da transação).
  - Inscrição: ao aprovar e trocar o núcleo no mesmo pedido, o núcleo novo é aplicado antes da aprovação, então vaga, turma e conta da aluna usam o núcleo certo.
  - Chamada: gravação numa transação só, `data_aula` validada (AAAA-MM-DD) e alerta recalculado em toda gravação. `GET /api/presencas` mostra ao professor só as turmas dele.
  - Alertas de faltas: faltas já tratadas num alerta resolvido não voltam a contar; o alerta aberto também diminui quando uma falta é corrigida ou justificada.
  - Eventos: a restrição de chamada do Monitor de Criança passou a usar os vínculos de turma.
  - Calendário: datas validadas e sem repetição por núcleo.
  - Erros: upload acima do limite responde 413 e violação de unicidade responde 409, em vez de 500.
  - Turma e núcleo: o `id` deixou de ser aceito no JSON de criação (evitava sobrescrever um registro existente).
  - Frontend: tipo `Atendimento` atualizado para o formato da API; removidos o `NovoAtendimentoDialog` (sem uso, no modelo antigo) e a página `professor/Alunos` (sem rota, ainda chamava o PocketBase).
- Motivo: fechar a exposição de dados sensíveis (LGPD) e as regras que estavam só no frontend ou quebradas.
- Validação: novo teste `SegurancaDadosIntegrationTest` (8 cenários: aluna sem acesso a atendimentos; documentos e arquivos só para a dona e a equipe; HTML declarado como PNG recusado; extensão gravada pelo tipo; professor não muda o próprio núcleo; Administrativo não inativa a Gestão nem reativa excluída; Administrativo não exporta saúde, filhos e violência; candidata não aprovada sem mural, eventos e lista de núcleos); suíte do backend com 38 testes e nenhuma falha; verificação de tipos do frontend sem erros (eram 23). As telas não foram abertas no navegador. O cancelamento por prazo expirado não tem teste automático, porque o prazo configurado ainda não venceu.
- Pendente do relatório: leitura individual de notificações por perfil (F-20), perfil `prod` que recuse os padrões inseguros (F-10), token curto e revogação (F-11), rate limit e CAPTCHA nos cadastros públicos (F-22) e os itens de manutenção da seção 4.4.
