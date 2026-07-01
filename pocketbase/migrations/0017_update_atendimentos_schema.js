migrate(
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      return
    }

    col.removeIndex('idx_atendimentos_created_by')
    col.removeIndex('idx_atendimentos_data')
    col.removeIndex('idx_atendimentos_tipo')

    col.fields.removeByName('created_by')
    col.fields.removeByName('data')
    col.fields.removeByName('horario')
    col.fields.removeByName('tipo_acesso')
    col.fields.removeByName('relatorio')

    col.fields.add(
      new RelationField({
        name: 'profissional_id',
        required: true,
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    col.fields.add(new TextField({ name: 'data_atendimento', required: true }))
    col.fields.add(new TextField({ name: 'descricao', required: true }))
    col.fields.add(new TextField({ name: 'encaminhamento' }))

    col.listRule =
      '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "PROFESSOR"'
    col.viewRule =
      '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "PROFESSOR"'
    col.createRule =
      '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    col.updateRule =
      '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    col.deleteRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'

    col.addIndex('idx_atendimentos_profissional', false, 'profissional_id', '')
    col.addIndex('idx_atendimentos_aluna', false, 'aluna_id', '')

    app.save(col)
  },
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      return
    }

    col.removeIndex('idx_atendimentos_profissional')
    col.removeIndex('idx_atendimentos_aluna')

    col.fields.removeByName('profissional_id')
    col.fields.removeByName('data_atendimento')
    col.fields.removeByName('descricao')
    col.fields.removeByName('encaminhamento')

    col.fields.add(
      new RelationField({
        name: 'created_by',
        required: true,
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    col.fields.add(new TextField({ name: 'data', required: true }))
    col.fields.add(new TextField({ name: 'horario', required: true }))
    col.fields.add(new TextField({ name: 'tipo_acesso', required: true }))
    col.fields.add(new TextField({ name: 'relatorio', required: true }))

    col.listRule =
      '@request.auth.id != "" && (tipo_acesso = "PUBLICO" || created_by = @request.auth.id)'
    col.viewRule =
      '@request.auth.id != "" && (tipo_acesso = "PUBLICO" || created_by = @request.auth.id)'
    col.createRule =
      '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "GESTAO_GERAL"'
    col.updateRule = 'created_by = @request.auth.id'
    col.deleteRule =
      'created_by = @request.auth.id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'

    col.addIndex('idx_atendimentos_created_by', false, 'created_by', '')
    col.addIndex('idx_atendimentos_data', false, 'data', '')
    col.addIndex('idx_atendimentos_tipo', false, 'tipo_acesso', '')

    app.save(col)
  },
)
