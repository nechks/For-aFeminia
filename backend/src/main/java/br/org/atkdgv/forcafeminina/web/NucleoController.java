package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.*;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/nucleos")
public class NucleoController {
  private final NucleoRepository nucleos; private final ProjetoRepository projetos; private final UsuarioRepository usuarios; private final FichaInscricaoRepository inscricoes; private final TurmaRepository turmas; private final TurmaEquipeRepository equipe; private final ZonaPrioritariaRepository zonas; private final NucleoZonaPrioritariaRepository vinculosZona; private final PasswordEncoder encoder;
  public NucleoController(NucleoRepository n, ProjetoRepository p, UsuarioRepository u, FichaInscricaoRepository i, TurmaRepository t, TurmaEquipeRepository te, ZonaPrioritariaRepository z, NucleoZonaPrioritariaRepository vz, PasswordEncoder e){nucleos=n;projetos=p;usuarios=u;inscricoes=i;turmas=t;equipe=te;zonas=z;vinculosZona=vz;encoder=e;}
  @GetMapping public List<Nucleo> listar(){
    List<Nucleo> lista=nucleos.findAllByOrderByNomeAsc();
    lista.forEach(this::carregarZonas);
    return lista;
  }

  /**
   * Núcleos ativos para a tela pública de inscrição. Devolve só o necessário para escolher — código,
   * nome e os períodos que têm turma aberta —, sem endereço, telefone ou capacidade.
   */
  @GetMapping("/publicos")
  public List<Map<String,Object>> publicos(){
    List<Map<String,Object>> body=new ArrayList<>();
    for(Nucleo n: nucleos.findAllByOrderByNomeAsc()){
      if(!n.isAtivo()) continue;
      // A candidata escolhe um horário concreto, não mais um turno solto. O turno viaja junto
      // porque é ele que a gestão usa para casar a aluna com a turma na hora de alocar.
      List<Map<String,Object>> horarios=new ArrayList<>();
      java.util.Set<String> vistos=new java.util.LinkedHashSet<>();
      for(Turma t: turmas.findByNucleoIdOrderByNomeAsc(n.getId())){
        if(!t.isAtivo()||t.getHorarioInicio()==null||t.getHorarioFim()==null) continue;
        String label=t.getHorarioInicio()+" às "+t.getHorarioFim();
        if(!vistos.add(label+"|"+t.getTurno())) continue;
        Map<String,Object> h=new LinkedHashMap<>();
        h.put("inicio",t.getHorarioInicio());
        h.put("fim",t.getHorarioFim());
        h.put("turno",t.getTurno());
        h.put("label",label);
        h.put("dias",t.getDiasSemana());
        horarios.add(h);
      }
      horarios.sort(Comparator.comparing(h->(String)h.get("inicio")));
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("codigo",n.getCodigo());
      item.put("nome",n.getNome());
      item.put("horarios",horarios);
      // A zona e global e reutilizavel. Na inscricao publica expomos somente os dados necessarios
      // para conferir se o bairro informado pode escolher este nucleo.
      List<Map<String,Object>> areas=new ArrayList<>();
      for(ZonaPrioritaria zona: zonas.findVinculadasAoNucleo(n.getId())){
        Map<String,Object> area=new LinkedHashMap<>();
        area.put("nome",zona.getNome());
        area.put("cidade",zona.getCidade());
        area.put("estado",zona.getEstado());
        area.put("bairros",zona.getBairros());
        areas.add(area);
      }
      item.put("zonas_prioritarias",areas);
      // Espaço Kids é do projeto, não do núcleo: a inscrição só pergunta quando o projeto
      // deste núcleo oferece o espaço.
      item.put("espaco_kids",
          n.getProjetoId()!=null
              && projetos.findById(n.getProjetoId()).map(Projeto::isEspacoKids).orElse(false));
      body.add(item);
    }
    return body;
  }

  @GetMapping("/{id}")
  public Nucleo detalhe(@PathVariable String id){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Nucleo nucleo=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    return carregarZonas(nucleo);
  }

  /** Contadores usados nos cards da lista de núcleos, para a tela não precisar carregar tudo. */
  @GetMapping("/resumo")
  public List<Map<String,Object>> resumo(){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL);
    List<Map<String,Object>> body=new ArrayList<>();
    for(Nucleo n: nucleos.findAllByOrderByNomeAsc()){
      List<Turma> doNucleo=turmas.findByNucleoIdOrderByNomeAsc(n.getId());
      List<String> ids=doNucleo.stream().map(Turma::getId).toList();
      long membros=ids.isEmpty()?0:equipe.findByTurmaIdInAndAtivoTrue(ids).stream().map(TurmaEquipe::getUserId).distinct().count();
      long alunas=inscricoes.countByTurmaAndStatusAndAcessoAtivoTrue(n.getCodigo(),StatusInscricao.APROVADA);
      Integer capacidade=n.getCapacidade();
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("nucleo_id",n.getId());
      item.put("turmas",doNucleo.size());
      item.put("equipe",membros);
      item.put("alunas",alunas);
      item.put("capacidade",capacidade);
      item.put("vagas_disponiveis",capacidade==null?null:Math.max(0,capacidade-alunas));
      item.put("lotado",capacidade!=null&&alunas>=capacidade);
      body.add(item);
    }
    return body;
  }

  /** Equipe de todas as turmas do núcleo, agrupada por pessoa. */
  @GetMapping("/{id}/equipe")
  public List<Map<String,Object>> equipeDoNucleo(@PathVariable String id){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    List<Turma> doNucleo=turmas.findByNucleoIdOrderByNomeAsc(id);
    Map<String,Turma> turmaPorId=new LinkedHashMap<>();
    doNucleo.forEach(t->turmaPorId.put(t.getId(),t));
    if(doNucleo.isEmpty()) return List.of();

    List<TurmaEquipe> vinculos=equipe.findByTurmaIdInAndAtivoTrue(new ArrayList<>(turmaPorId.keySet()));
    Map<String,Usuario> usuarioPorId=new HashMap<>();
    usuarios.findAllById(vinculos.stream().map(TurmaEquipe::getUserId).distinct().toList())
        .forEach(u->usuarioPorId.put(u.getId(),u));

    List<Map<String,Object>> body=new ArrayList<>();
    for(TurmaEquipe v: vinculos){
      Usuario u=usuarioPorId.get(v.getUserId());
      Turma t=turmaPorId.get(v.getTurmaId());
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("id",v.getId());
      item.put("user_id",v.getUserId());
      item.put("nome",u==null?"—":(u.getNomeSocial()==null||u.getNomeSocial().isBlank()?u.getName():u.getNomeSocial()));
      item.put("email",u==null?"":u.getEmail());
      item.put("avatar",u==null?null:u.getAvatar());
      item.put("turma_id",v.getTurmaId());
      item.put("turma_nome",t==null?"—":t.getNome());
      item.put("turma_turno",t==null?"":t.getTurno());
      item.put("turma_dias",t==null?"":t.getDiasSemana());
      item.put("tipo_profissional",v.getTipoProfissional());
      body.add(item);
    }
    body.sort(Comparator.comparing((Map<String,Object> m)->((String)m.get("nome")).toLowerCase())
        .thenComparing(m->(String)m.get("turma_nome")));
    return body;
  }

  /** Alunas aprovadas do núcleo, com a turma em que estão alocadas (nulo = não alocada). */
  @GetMapping("/{id}/alunas")
  public List<Map<String,Object>> alunasDoNucleo(@PathVariable String id){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL);
    Nucleo n=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    Map<String,String> nomeTurma=new HashMap<>();
    turmas.findByNucleoIdOrderByNomeAsc(id).forEach(t->nomeTurma.put(t.getId(),t.getNome()));

    List<Map<String,Object>> body=new ArrayList<>();
    for(FichaInscricao f: inscricoes.findByTurmaAndStatusOrderByNomeCompletoAsc(n.getCodigo(),StatusInscricao.APROVADA)){
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("inscricao_id",f.getId());
      item.put("user_id",f.getUserId());
      item.put("nome_completo",f.getNomeCompleto());
      item.put("turma_id",f.getTurmaId());
      item.put("turma_nome",f.getTurmaId()==null?null:nomeTurma.get(f.getTurmaId()));
      // Orienta quem aloca: a turma escolhida deve bater com o período pedido na inscrição.
      item.put("periodo_preferido",f.getPeriodoPreferido());
      body.add(item);
    }
    return body;
  }
  @PostMapping @Transactional public ResponseEntity<Nucleo> criar(@RequestBody Nucleo n){
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if(n.getProjetoId()==null||n.getProjetoId().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"projeto_obrigatorio","Selecione o projeto do núcleo.");
    Projeto projeto=projetos.findById(n.getProjetoId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"projeto_invalido","Projeto não encontrado."));
    if(!projeto.isAtivo()) throw new ApiException(HttpStatus.BAD_REQUEST,"projeto_inativo","Selecione um projeto ativo.");
    if(n.getNome()==null||n.getNome().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"campos_obrigatorios","Informe o nome do núcleo.");
    validarCapacidadeDoProjeto(projeto,n.getCapacidade(),null);
    String base=n.getNome().trim().toUpperCase().replaceAll("[^A-Z0-9]+","_").replaceAll("(^_|_$)","");
    if(base.length()<3)base="NUCLEO"; if(base.length()>64)base=base.substring(0,64);
    String codigo=base; int sufixo=2; while(nucleos.existsByCodigo(codigo))codigo=base+"_"+(sufixo++);
    n.setCodigo(codigo); n.setNome(n.getNome().trim());
    n.setAtivo(true); nucleos.save(n);
    return ResponseEntity.status(HttpStatus.CREATED).body(n);
  }
  /** Edição do núcleo. Código e projeto não mudam: são a identidade dele para turmas e inscrições. */
  @PutMapping("/{id}") @Transactional
  public Nucleo editar(@PathVariable String id, @RequestBody Nucleo dados){
    Usuario atual=CurrentUser.require(Perfil.GESTAO_GERAL);
    Nucleo n=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    if(dados.getNome()==null||dados.getNome().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"campos_obrigatorios","Informe o nome do núcleo.");
    n.setNome(dados.getNome().trim());
    n.setEndereco(dados.getEndereco()); n.setBairro(dados.getBairro()); n.setCidade(dados.getCidade());
    n.setEstado(dados.getEstado()); n.setCep(dados.getCep()); n.setTelefone(dados.getTelefone());
    n.setEmail(dados.getEmail()); n.setResponsavel(dados.getResponsavel());
    if(n.getProjetoId()!=null){
      Projeto projeto=projetos.findById(n.getProjetoId()).orElse(null);
      if(projeto!=null) validarCapacidadeDoProjeto(projeto,dados.getCapacidade(),n.getId());
    }
    n.setCapacidade(dados.getCapacidade());
    n.setDataInicio(dados.getDataInicio()); n.setDataTermino(dados.getDataTermino());
    n.setDiasSemana(dados.getDiasSemana()); n.setTurno(dados.getTurno());
    n.setHorarioInicio(dados.getHorarioInicio()); n.setHorarioFim(dados.getHorarioFim());
    n.setAtivo(dados.isAtivo());
    n.setAtualizadoEm(Instant.now()); n.setAtualizadoPor(atual.getId()); n.setAtualizadoPorNome(atual.getName());
    return carregarZonas(nucleos.save(n));
  }

  public record VincularProfissionaisRequest(
      @com.fasterxml.jackson.annotation.JsonProperty("profissionais_ids") List<String> profissionaisIds,
      @com.fasterxml.jackson.annotation.JsonProperty("turma_id") String turmaId,
      @com.fasterxml.jackson.annotation.JsonProperty("tipo_profissional") String tipoProfissional) {}

  /**
   * Vincula vários profissionais ao núcleo de uma vez, no lugar de repetir o vínculo um a um.
   *
   * <p>O vínculo em si continua sendo com a turma — é ele que dá as permissões e faz a turma
   * aparecer no perfil da pessoa —, então a chamada recebe a turma do núcleo e o papel que todos os
   * selecionados vão exercer nela.
   *
   * <p>É idempotente: quem já está na equipe daquela turma é ignorado sem erro, e a resposta diz
   * quem entrou, quem já estava e quem ficou de fora por conflito de horário.
   */
  @PostMapping("/{id}/profissionais") @Transactional
  public Map<String,Object> vincularProfissionais(@PathVariable String id,@RequestBody VincularProfissionaisRequest req){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Nucleo nucleo=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    if(req==null||req.profissionaisIds()==null||req.profissionaisIds().isEmpty())
      throw new ApiException(HttpStatus.BAD_REQUEST,"profissionais_obrigatorios","Selecione ao menos um profissional.");
    if(req.turmaId()==null||req.turmaId().isBlank())
      throw new ApiException(HttpStatus.BAD_REQUEST,"turma_obrigatoria","Selecione a turma do núcleo em que a equipe vai atuar.");
    if(!TipoProfissional.valido(req.tipoProfissional()))
      throw new ApiException(HttpStatus.BAD_REQUEST,"tipo_profissional_invalido","Selecione um tipo profissional válido.");
    Turma turma=turmas.findById(req.turmaId())
        .filter(t->t.isAtivo()&&nucleo.getId().equals(t.getNucleoId()))
        .orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"turma_invalida","A turma selecionada não pertence a este núcleo."));

    List<String> adicionados=new ArrayList<>();
    List<String> jaVinculados=new ArrayList<>();
    List<Map<String,String>> recusados=new ArrayList<>();

    for(String userId: new LinkedHashSet<>(req.profissionaisIds())){
      Usuario alvo=usuarios.findById(userId).filter(u->!u.isExcluido()).orElse(null);
      if(alvo==null||alvo.getPerfil()==Perfil.ALUNA_FF){
        recusados.add(Map.of("user_id",userId,"motivo","Profissional não encontrado ou inválido."));
        continue;
      }
      TurmaEquipe vinculo=equipe.findByTurmaIdAndUserId(turma.getId(),userId).orElse(null);
      if(vinculo!=null&&vinculo.isAtivo()){ jaVinculados.add(userId); continue; }
      String conflito=conflitoDeHorario(alvo,turma);
      if(conflito!=null){ recusados.add(Map.of("user_id",userId,"nome",alvo.getName(),"motivo",conflito)); continue; }
      if(vinculo==null) vinculo=new TurmaEquipe();
      vinculo.setTurmaId(turma.getId());
      vinculo.setUserId(userId);
      vinculo.setTipoProfissional(req.tipoProfissional());
      vinculo.setAtivo(true);
      equipe.save(vinculo);
      sincronizarVinculoPrincipal(alvo,turma,nucleo,req.tipoProfissional());
      adicionados.add(userId);
    }

    Map<String,Object> body=new LinkedHashMap<>();
    body.put("turma_id",turma.getId());
    body.put("adicionados",adicionados);
    body.put("ja_vinculados",jaVinculados);
    body.put("recusados",recusados);
    return body;
  }

  /**
   * Mesma regra do vínculo individual: ninguém em duas turmas que dividam turno e dia da semana.
   * Devolve a explicação do choque, ou nulo quando está liberado.
   */
  private String conflitoDeHorario(Usuario alvo, Turma destino){
    List<String> outras=equipe.findByUserIdAndAtivoTrue(alvo.getId()).stream()
        .map(TurmaEquipe::getTurmaId).filter(t->!t.equals(destino.getId())).distinct().toList();
    if(outras.isEmpty()) return null;
    Set<String> diasDestino=dias(destino);
    for(Turma outra: turmas.findAllById(outras)){
      if(!outra.isAtivo()) continue;
      if(!java.util.Objects.equals(outra.getTurno(),destino.getTurno())) continue;
      Set<String> choque=new LinkedHashSet<>(dias(outra));
      choque.retainAll(diasDestino);
      if(choque.isEmpty()) continue;
      return alvo.getName()+" já atua na turma "+outra.getNome()+" no mesmo dia e período.";
    }
    return null;
  }

  private Set<String> dias(Turma t){
    if(t.getDiasSemana()==null||t.getDiasSemana().isBlank()) return Set.of();
    Set<String> dias=new LinkedHashSet<>();
    for(String dia: t.getDiasSemana().split(",")){
      String limpo=dia.trim().toUpperCase();
      if(!limpo.isEmpty()) dias.add(limpo);
    }
    return dias;
  }

  /** Espelha o vínculo recém-criado nos campos de "vínculo principal" lidos pelas telas antigas. */
  private void sincronizarVinculoPrincipal(Usuario alvo, Turma turma, Nucleo nucleo, String tipo){
    if(alvo.getTurmaId()!=null&&!alvo.getTurmaId().isBlank()) return;
    alvo.setTurmaId(turma.getId());
    alvo.setNucleoId(nucleo.getId());
    alvo.setTurma(nucleo.getCodigo());
    alvo.setProjetoId(nucleo.getProjetoId());
    alvo.setTipoProfissional(tipo);
    usuarios.save(alvo);
  }

  private Nucleo carregarZonas(Nucleo nucleo){
    nucleo.setZonasPrioritarias(zonas.findVinculadasAoNucleo(nucleo.getId()));
    return nucleo;
  }

  /**
   * O projeto tem um teto de alunas, e os núcleos dele são onde essas vagas ficam. A soma das
   * capacidades dos núcleos não pode passar do teto do projeto — senão o limite combinado com o
   * patrocinador viraria só um número na tela.
   *
   * <p>{@code nucleoEmEdicaoId} tira o próprio núcleo da soma quando a chamada vem de uma edição;
   * na criação vem nulo. Núcleo sem capacidade definida não entra na conta.
   */
  private void validarCapacidadeDoProjeto(Projeto projeto, Integer capacidade, String nucleoEmEdicaoId){
    if(capacidade==null) return;
    if(capacidade<1) throw new ApiException(HttpStatus.BAD_REQUEST,"capacidade_invalida","A capacidade deve ser maior que zero.");
    Integer teto=projeto.getCapacidadeAlunas();
    if(teto==null) return;

    int jaComprometido=nucleos.findAllByOrderByNomeAsc().stream()
        .filter(outro->projeto.getId().equals(outro.getProjetoId()))
        .filter(outro->nucleoEmEdicaoId==null||!nucleoEmEdicaoId.equals(outro.getId()))
        .map(Nucleo::getCapacidade)
        .filter(java.util.Objects::nonNull)
        .mapToInt(Integer::intValue)
        .sum();

    int disponivel=teto-jaComprometido;
    if(capacidade>disponivel){
      throw new ApiException(HttpStatus.CONFLICT,"capacidade_acima_do_projeto",
          "O projeto "+projeto.getNome()+" comporta "+teto+" alunas e os outros núcleos já ocupam "
              +jaComprometido+". Restam "+Math.max(disponivel,0)+" vagas para este núcleo.");
    }
  }

  public record ExcluirRequest(String senha){}
  @DeleteMapping("/{id}") @Transactional
  public ResponseEntity<Void> excluir(@PathVariable String id,@RequestBody ExcluirRequest req){
    Usuario gestao=CurrentUser.require(Perfil.GESTAO_GERAL);
    if(req==null||req.senha()==null||!encoder.matches(req.senha(),gestao.getPasswordHash())) throw new ApiException(HttpStatus.FORBIDDEN,"senha_invalida","Senha da Gestão Geral inválida.");
    Nucleo n=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    if(turmas.existsByNucleoId(id)) throw new ApiException(HttpStatus.CONFLICT,"nucleo_com_turmas","Exclua as turmas deste núcleo antes de excluí-lo.");
    if(usuarios.existsByTurma(n.getCodigo())||inscricoes.existsByTurma(n.getCodigo())) throw new ApiException(HttpStatus.CONFLICT,"nucleo_em_uso","Este núcleo possui usuários ou inscrições vinculadas e não pode ser excluído.");
    vinculosZona.deleteByNucleoId(id);
    nucleos.delete(n);return ResponseEntity.noContent().build();
  }
}
