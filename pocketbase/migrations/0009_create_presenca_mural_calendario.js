migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    const presenca = new Collection({
      name: 'presenca',
      type: 'base',
      listRule:
        '@request.auth.id = user_id || @request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      viewRule:
        '@request.auth.id = user_id || @request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      createRule:
        '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      updateRule:
        '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      deleteRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data_aula', type: 'text', required: true },
        { name: 'presente', type: 'bool', required: false },
        { name: 'justificativa', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_presenca_user ON presenca (user_id)',
        'CREATE INDEX idx_presenca_data ON presenca (data_aula)',
        'CREATE INDEX idx_presenca_turma_data ON presenca (user_id, data_aula)',
      ],
    })
    app.save(presenca)

    const mural = new Collection({
      name: 'mural',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      updateRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      deleteRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'data_publicacao', type: 'text', required: true },
        { name: 'turma', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_mural_turma ON mural (turma)'],
    })
    app.save(mural)

    const calendarioAula = new Collection({
      name: 'calendario_aula',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      updateRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      deleteRule: '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"',
      fields: [
        { name: 'turma', type: 'text', required: true },
        { name: 'data_aula', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_calendario_turma ON calendario_aula (turma)'],
    })
    app.save(calendarioAula)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('calendario_aula'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mural'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('presenca'))
    } catch (_) {}
  },
)
