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
