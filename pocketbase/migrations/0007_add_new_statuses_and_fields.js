migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')

    col.fields.add(
      new SelectField({
        name: 'status',
        required: false,
        values: ['AGUARDANDO', 'APROVADA', 'REPROVADA', 'EM_ANALISE', 'LISTA_ESPERA', 'CANCELADA'],
        maxSelect: 1,
      }),
    )

    if (!col.fields.getByName('data_primeira_aula')) {
      col.fields.add(new TextField({ name: 'data_primeira_aula' }))
    }

    if (!col.fields.getByName('motivo_cancelamento')) {
      col.fields.add(new TextField({ name: 'motivo_cancelamento' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')

    col.fields.add(
      new SelectField({
        name: 'status',
        required: false,
        values: ['AGUARDANDO', 'APROVADA', 'REPROVADA', 'EM_ANALISE'],
        maxSelect: 1,
      }),
    )

    if (col.fields.getByName('data_primeira_aula')) {
      col.fields.removeByName('data_primeira_aula')
    }

    if (col.fields.getByName('motivo_cancelamento')) {
      col.fields.removeByName('motivo_cancelamento')
    }

    app.save(col)
  },
)
