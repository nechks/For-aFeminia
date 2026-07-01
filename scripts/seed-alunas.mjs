import PocketBase from 'pocketbase'

const PB_URL = 'https://atkdgv-forca-feminina-setup-4a60d.shrd00.internal.goskip.dev'
const ADMIN_EMAIL = 'andiaracaneo10@gmail.com'
const ADMIN_PASSWORD = 'Skip@Pass'

const alunas = [
  // CENTRO_VITORIA
  { nome: 'Ana Lima', email: 'ana.lima.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Beatriz Souza', email: 'beatriz.souza.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Camila Ferreira', email: 'camila.ferreira.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Daniela Costa', email: 'daniela.costa.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Eduarda Martins', email: 'eduarda.martins.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Fernanda Alves', email: 'fernanda.alves.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Gabriela Rocha', email: 'gabriela.rocha.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Helena Carvalho', email: 'helena.carvalho.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Isabela Mendes', email: 'isabela.mendes.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  { nome: 'Juliana Santos', email: 'juliana.santos.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
  // AEST_SERRA
  { nome: 'Karla Oliveira', email: 'karla.oliveira.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Larissa Nunes', email: 'larissa.nunes.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Marina Ramos', email: 'marina.ramos.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Natalia Gomes', email: 'natalia.gomes.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Olivia Pereira', email: 'olivia.pereira.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Patricia Vieira', email: 'patricia.vieira.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Rafaela Dias', email: 'rafaela.dias.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Sabrina Lopes', email: 'sabrina.lopes.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Tatiana Moura', email: 'tatiana.moura.as@aluna.ff', turma: 'AEST_SERRA' },
  { nome: 'Ursula Campos', email: 'ursula.campos.as@aluna.ff', turma: 'AEST_SERRA' },
  // ITAQUARI_CARIACICA
  { nome: 'Vanessa Freitas', email: 'vanessa.freitas.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Waleria Pinto', email: 'waleria.pinto.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Ximena Ribeiro', email: 'ximena.ribeiro.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Yasmin Azevedo', email: 'yasmin.azevedo.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Zoe Teixeira', email: 'zoe.teixeira.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Amanda Borges', email: 'amanda.borges.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Bruna Cunha', email: 'bruna.cunha.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Carolina Farias', email: 'carolina.farias.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Debora Melo', email: 'debora.melo.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  { nome: 'Eliane Castro', email: 'eliane.castro.ic@aluna.ff', turma: 'ITAQUARI_CARIACICA' },
  // CONJUNTO_CARAPINA_SERRA
  {
    nome: 'Fabiana Correia',
    email: 'fabiana.correia.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  {
    nome: 'Giovana Monteiro',
    email: 'giovana.monteiro.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  {
    nome: 'Heloisa Barbosa',
    email: 'heloisa.barbosa.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  {
    nome: 'Ingrid Cavalcanti',
    email: 'ingrid.cavalcanti.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  { nome: 'Jessica Duarte', email: 'jessica.duarte.cc@aluna.ff', turma: 'CONJUNTO_CARAPINA_SERRA' },
  {
    nome: 'Keila Nascimento',
    email: 'keila.nascimento.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  {
    nome: 'Leticia Marques',
    email: 'leticia.marques.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  { nome: 'Monique Araujo', email: 'monique.araujo.cc@aluna.ff', turma: 'CONJUNTO_CARAPINA_SERRA' },
  {
    nome: 'Nathalia Cardoso',
    email: 'nathalia.cardoso.cc@aluna.ff',
    turma: 'CONJUNTO_CARAPINA_SERRA',
  },
  { nome: 'Otavia Reis', email: 'otavia.reis.cc@aluna.ff', turma: 'CONJUNTO_CARAPINA_SERRA' },
  // ATLANTICA_VILLE_VITORIA
  {
    nome: 'Pamela Guimaraes',
    email: 'pamela.guimaraes.av@aluna.ff',
    turma: 'ATLANTICA_VILLE_VITORIA',
  },
  { nome: 'Renata Leite', email: 'renata.leite.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  { nome: 'Simone Xavier', email: 'simone.xavier.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  { nome: 'Thais Nogueira', email: 'thais.nogueira.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  { nome: 'Urania Coelho', email: 'urania.coelho.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  {
    nome: 'Viviane Andrade',
    email: 'viviane.andrade.av@aluna.ff',
    turma: 'ATLANTICA_VILLE_VITORIA',
  },
  { nome: 'Wanda Machado', email: 'wanda.machado.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  {
    nome: 'Xenia Rodrigues',
    email: 'xenia.rodrigues.av@aluna.ff',
    turma: 'ATLANTICA_VILLE_VITORIA',
  },
  { nome: 'Yara Moreira', email: 'yara.moreira.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
  { nome: 'Zilma Batista', email: 'zilma.batista.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
]

async function main() {
  const pb = new PocketBase(PB_URL)

  console.log('Autenticando como admin...')
  await pb.collection('users').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log('Autenticado!\n')

  let criadas = 0
  let erros = 0

  for (const aluna of alunas) {
    try {
      // Cria o usuário
      let userId
      try {
        const user = await pb.collection('users').create({
          name: aluna.nome,
          email: aluna.email,
          password: 'Skip@Pass',
          passwordConfirm: 'Skip@Pass',
          perfil: 'ALUNA_FF',
          ativo: true,
        })
        userId = user.id
        console.log(`✓ Usuário criado: ${aluna.nome}`)
      } catch (e) {
        // Usuário já existe, busca o id
        const existentes = await pb.collection('users').getList(1, 1, {
          filter: `email = "${aluna.email}"`,
        })
        if (existentes.items.length > 0) {
          userId = existentes.items[0].id
          console.log(`~ Usuário já existe: ${aluna.nome}`)
        } else {
          throw e
        }
      }

      // Verifica se já tem ficha
      const fichas = await pb.collection('ficha_inscricao_ff').getList(1, 1, {
        filter: `user_id = "${userId}"`,
      })

      if (fichas.items.length === 0) {
        await pb.collection('ficha_inscricao_ff').create({
          user_id: userId,
          nome_completo: aluna.nome,
          turma: aluna.turma,
          status: 'APROVADA',
          aceite_lgpd: true,
        })
        console.log(`  → Ficha criada para ${aluna.nome} (${aluna.turma})`)
      } else {
        console.log(`  → Ficha já existe para ${aluna.nome}`)
      }

      criadas++
    } catch (e) {
      console.error(`✗ Erro com ${aluna.nome}: ${e.message}`)
      erros++
    }
  }

  console.log(`\nConcluído! ${criadas} alunas processadas, ${erros} erros.`)
}

main().catch(console.error)
