migrate(
  (app) => {
    const collection = new Collection({
      name: 'ficha_inscricao_ff',
      type: 'base',
      listRule:
        '@request.auth.id = user_id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO" || @request.auth.perfil = "ASSISTENTE_SOCIAL"',
      viewRule:
        '@request.auth.id = user_id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO" || @request.auth.perfil = "ASSISTENTE_SOCIAL"',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id = user_id || @request.auth.perfil = "ADMIN"',
      deleteRule: '@request.auth.perfil = "ADMIN"',
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome_completo', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'rg', type: 'text' },
        { name: 'data_nascimento', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'estado', type: 'text' },
        { name: 'cep', type: 'text' },
        { name: 'turma', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['AGUARDANDO', 'APROVADA', 'REPROVADA', 'EM_ANALISE'],
          maxSelect: 1,
        },
        { name: 'aceite_lgpd', type: 'bool', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ficha_user_id ON ficha_inscricao_ff (user_id)',
        'CREATE INDEX idx_ficha_cpf ON ficha_inscricao_ff (cpf)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ficha_inscricao_ff')
    app.delete(collection)
  },
)
