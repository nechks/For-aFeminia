routerAdd(
  'POST',
  '/backend/v1/admin/mural',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    const perfil = auth.getString('perfil')
    if (perfil !== 'ADMIN' && perfil !== 'GESTAO') {
      return e.forbiddenError('Acesso restrito a administradores e gestão.')
    }

    const body = e.requestInfo().body || {}
    const titulo = String(body.titulo || '').trim()
    const conteudo = String(body.conteudo || '').trim()
    const turma = body.turma ? String(body.turma) : ''
    const dataPublicacao = body.data_publicacao || new Date().toISOString().split('T')[0]

    if (!titulo) return e.badRequestError('titulo é obrigatório.')
    if (!conteudo) return e.badRequestError('conteudo é obrigatório.')

    try {
      const col = $app.findCollectionByNameOrId('mural')
      const record = new Record(col)
      record.set('titulo', titulo)
      record.set('conteudo', conteudo)
      record.set('data_publicacao', String(dataPublicacao))
      record.set('turma', turma)
      $app.save(record)
      return e.json(201, record)
    } catch (err) {
      return e.json(500, {
        error: 'internal_error',
        message: 'Erro ao criar aviso no mural.',
      })
    }
  },
  $apis.requireAuth(),
)
