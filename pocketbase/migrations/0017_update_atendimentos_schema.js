migrate(
  (app) => {
    var col
    var exists = true
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      exists = false
    }

    if (exists) {
      try {
        col.removeIndex('idx_atendimentos_created_by')
      } catch (_) {}
      try {
        col.removeIndex('idx_atendimentos_data')
      } catch (_) {}
      try {
        col.removeIndex('idx_atendimentos_tipo')
      } catch (_) {}

      try {
        col.fields.removeByName('created_by')
      } catch (_) {}
      try {
        col.fields.removeByName('data')
      } catch (_) {}
      try {
        col.fields.removeByName('horario')
      } catch (_) {}
      try {
        col.fields.removeByName('tipo_acesso')
      } catch (_) {}
      try {
        col.fields.removeByName('relatorio')
      } catch (_) {}

      if (!col.fields.getByName('profissional_id')) {
        col.fields.add(
          new RelationField({
            name: 'profissional_id',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }
      if (!col.fields.getByName('aluna_id')) {
        col.fields.add(
          new RelationField({
            name: 'aluna_id',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }
      if (!col.fields.getByName('data_atendimento')) {
        col.fields.add(new TextField({ name: 'data_atendimento', required: true }))
      }
      if (!col.fields.getByName('descricao')) {
        col.fields.add(new TextField({ name: 'descricao', required: true }))
      }
      if (!col.fields.getByName('encaminhamento')) {
        col.fields.add(new TextField({ name: 'encaminhamento' }))
      }
      if (!col.fields.getByName('tipo')) {
        col.fields.add(
          new SelectField({
            name: 'tipo',
            required: true,
            values: ['INDIVIDUAL', 'GRUPAL', 'FAMILIAR', 'ENCAMINHAMENTO'],
            maxSelect: 1,
          }),
        )
      }
      if (!col.fields.getByName('created')) {
        col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      }
      if (!col.fields.getByName('updated')) {
        col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      }

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
    } else {
      col = new Collection({
        name: 'atendimentos',
        type: 'base',
        listRule:
          '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "PROFESSOR"',
        viewRule:
          '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "PROFESSOR"',
        createRule:
          '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"',
        updateRule:
          '@request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"',
        deleteRule:
          '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"',
        fields: [
          {
            name: 'profissional_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'aluna_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'data_atendimento', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['INDIVIDUAL', 'GRUPAL', 'FAMILIAR', 'ENCAMINHAMENTO'],
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text', required: true },
          { name: 'encaminhamento', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_atendimentos_profissional ON atendimentos (profissional_id)',
          'CREATE INDEX idx_atendimentos_aluna ON atendimentos (aluna_id)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      return
    }
    app.delete(col)
  },
)
