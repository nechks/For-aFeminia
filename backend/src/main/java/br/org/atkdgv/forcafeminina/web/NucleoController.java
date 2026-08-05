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
  private final NucleoRepository nucleos; private final ProjetoRepository projetos; private final UsuarioRepository usuarios; private final FichaInscricaoRepository inscricoes; private final TurmaRepository turmas; private final TurmaEquipeRepository equipe; private final PasswordEncoder encoder;
  public NucleoController(NucleoRepository n, ProjetoRepository p, UsuarioRepository u, FichaInscricaoRepository i, TurmaRepository t, TurmaEquipeRepository te, PasswordEncoder e){nucleos=n;projetos=p;usuarios=u;inscricoes=i;turmas=t;equipe=te;encoder=e;}
  @GetMapping public List<Nucleo> listar(){ return nucleos.findAllByOrderByNomeAsc(); }

  /**
   * Núcleos ativos para a tela pública de inscrição. Devolve só o necessário para escolher — código,
   * nome e os períodos que têm turma aberta —, sem endereço, telefone ou capacidade.
   */
  @GetMapping("/publicos")
  public List<Map<String,Object>> publicos(){
    List<Map<String,Object>> body=new ArrayList<>();
    for(Nucleo n: nucleos.findAllByOrderByNomeAsc()){
      if(!n.isAtivo()) continue;
      List<String> turnos=turmas.findByNucleoIdOrderByNomeAsc(n.getId()).stream()
          .filter(Turma::isAtivo).map(Turma::getTurno).filter(java.util.Objects::nonNull)
          .distinct().sorted().toList();
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("codigo",n.getCodigo());
      item.put("nome",n.getNome());
      item.put("turnos",turnos);
      body.add(item);
    }
    return body;
  }

  @GetMapping("/{id}")
  public Nucleo detalhe(@PathVariable String id){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    return nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
  }

  /** Contadores usados nos cards da lista de núcleos, para a tela não precisar carregar tudo. */
  @GetMapping("/resumo")
  public List<Map<String,Object>> resumo(){
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    List<Map<String,Object>> body=new ArrayList<>();
    for(Nucleo n: nucleos.findAllByOrderByNomeAsc()){
      List<Turma> doNucleo=turmas.findByNucleoIdOrderByNomeAsc(n.getId());
      List<String> ids=doNucleo.stream().map(Turma::getId).toList();
      long membros=ids.isEmpty()?0:equipe.findByTurmaIdInAndAtivoTrue(ids).stream().map(TurmaEquipe::getUserId).distinct().count();
      long alunas=inscricoes.findByTurmaAndStatusOrderByNomeCompletoAsc(n.getCodigo(),StatusInscricao.APROVADA).size();
      Map<String,Object> item=new LinkedHashMap<>();
      item.put("nucleo_id",n.getId());
      item.put("turmas",doNucleo.size());
      item.put("equipe",membros);
      item.put("alunas",alunas);
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
    String base=n.getNome().trim().toUpperCase().replaceAll("[^A-Z0-9]+","_").replaceAll("(^_|_$)","");
    if(base.length()<3)base="NUCLEO"; if(base.length()>64)base=base.substring(0,64);
    String codigo=base; int sufixo=2; while(nucleos.existsByCodigo(codigo))codigo=base+"_"+(sufixo++);
    n.setCodigo(codigo); n.setNome(n.getNome().trim());
    n.setAtivo(true); nucleos.save(n);
    return ResponseEntity.status(HttpStatus.CREATED).body(n);
  }
  public record ExcluirRequest(String senha){}
  @DeleteMapping("/{id}") @Transactional
  public ResponseEntity<Void> excluir(@PathVariable String id,@RequestBody ExcluirRequest req){
    Usuario gestao=CurrentUser.require(Perfil.GESTAO_GERAL);
    if(req==null||req.senha()==null||!encoder.matches(req.senha(),gestao.getPasswordHash())) throw new ApiException(HttpStatus.FORBIDDEN,"senha_invalida","Senha da Gestão Geral inválida.");
    Nucleo n=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    if(turmas.existsByNucleoId(id)) throw new ApiException(HttpStatus.CONFLICT,"nucleo_com_turmas","Exclua as turmas deste núcleo antes de excluí-lo.");
    if(usuarios.existsByTurma(n.getCodigo())||inscricoes.existsByTurma(n.getCodigo())) throw new ApiException(HttpStatus.CONFLICT,"nucleo_em_uso","Este núcleo possui usuários ou inscrições vinculadas e não pode ser excluído.");
    nucleos.delete(n);return ResponseEntity.noContent().build();
  }
}
