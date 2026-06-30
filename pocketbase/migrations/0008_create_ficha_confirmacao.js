migrate(
  (app) => {
    const fichaInscricaoId = app.findCollectionByNameOrId('ficha_inscricao_ff').id

    const fichaConfirmacao = new Collection({
      name: 'ficha_confirmacao_ff',
      type: 'base',
      listRule:
        '@request.auth.id = user_id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO" || @request.auth.perfil = "ASSISTENTE_SOCIAL"',
      viewRule:
        '@request.auth.id = user_id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO" || @request.auth.perfil = "ASSISTENTE_SOCIAL"',
      createRule: '@request.auth.id != ""',
      updateRule:
        '@request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO" || @request.auth.perfil = "ASSISTENTE_SOCIAL"',
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
        {
          name: 'inscricao_id',
          type: 'relation',
          required: true,
          collectionId: fichaInscricaoId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['PREENCHIDA', 'EM_REVISAO'],
          maxSelect: 1,
        },
        { name: 'secao_1_dados', type: 'json' },
        { name: 'secao_2_dados', type: 'json' },
        { name: 'secao_3_dados', type: 'json' },
        { name: 'secao_4_dados', type: 'json' },
        { name: 'secao_5_dados', type: 'json' },
        { name: 'secao_6_socioeconomico', type: 'json' },
        { name: 'secao_7_violencia', type: 'json' },
        { name: 'secao_8_declaracoes', type: 'json' },
        { name: 'aceite_lgpd', type: 'bool', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ficha_conf_user ON ficha_confirmacao_ff (user_id)'],
    })
    app.save(fichaConfirmacao)

    const confirmacaoId = app.findCollectionByNameOrId('ficha_confirmacao_ff').id

    const documentosAnexos = new Collection({
      name: 'documentos_anexos',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.perfil = "ADMIN"',
      deleteRule: '@request.auth.perfil = "ADMIN"',
      fields: [
        {
          name: 'confirmacao_id',
          type: 'relation',
          required: true,
          collectionId: confirmacaoId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['RG', 'CPF', 'PERFIL'],
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_doc_conf ON documentos_anexos (confirmacao_id)'],
    })
    app.save(documentosAnexos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('documentos_anexos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ficha_confirmacao_ff'))
    } catch (_) {}
  },
)
