migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    const atendimentos = new Collection({
      name: 'atendimentos',
      type: 'base',
      // Público: qualquer autenticado vê. Confidencial: só quem criou vê.
      listRule:
        '@request.auth.id != "" && (tipo_acesso = "PUBLICO" || created_by = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (tipo_acesso = "PUBLICO" || created_by = @request.auth.id)',
      createRule:
        '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "GESTAO_GERAL"',
      updateRule: 'created_by = @request.auth.id',
      deleteRule:
        'created_by = @request.auth.id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"',
      fields: [
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data', type: 'text', required: true },
        { name: 'horario', type: 'text', required: true },
        { name: 'tipo_acesso', type: 'text', required: true },
        { name: 'relatorio', type: 'text', required: true },
        { name: 'turma', type: 'text', required: true },
        {
          name: 'aluna_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_atendimentos_created_by ON atendimentos (created_by)',
        'CREATE INDEX idx_atendimentos_data ON atendimentos (data)',
        'CREATE INDEX idx_atendimentos_tipo ON atendimentos (tipo_acesso)',
      ],
    })
    app.save(atendimentos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('atendimentos'))
    } catch (_) {}
  },
)
