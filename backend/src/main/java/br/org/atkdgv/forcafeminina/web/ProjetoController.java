package br.org.atkdgv.forcafeminina.web;
import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/projetos")
public class ProjetoController {
  private final ProjetoRepository repo; public ProjetoController(ProjetoRepository r){repo=r;}
  @GetMapping public List<Projeto> listar(){CurrentUser.require(Perfil.GESTAO_GERAL,Perfil.ADMINISTRATIVO);return repo.findAllByOrderByNomeAsc();}
  @PostMapping public ResponseEntity<Projeto> criar(@RequestBody Projeto p){
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if(p.getNome()==null||p.getNome().isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"nome_obrigatorio","Informe o nome do projeto.");
    if(p.getPatrocinador()==null||p.getPatrocinador().isBlank()||p.getCapacidadeAlunas()==null||p.getCapacidadeAlunas()<1||p.getDataInicio()==null||p.getDataTermino()==null)throw new ApiException(HttpStatus.BAD_REQUEST,"campos_obrigatorios","Informe patrocinador, quantidade de alunas e período do projeto.");
    if(p.getDataTermino().compareTo(p.getDataInicio())<0)throw new ApiException(HttpStatus.BAD_REQUEST,"periodo_invalido","O término não pode ser anterior ao início.");
    String base=p.getNome().trim().toUpperCase().replaceAll("[^A-Z0-9]+","_").replaceAll("(^_|_$)","");
    if(base.length()<2)base="PROJETO"; if(base.length()>32)base=base.substring(0,32);
    String codigo=base; int sufixo=2; while(repo.existsByCodigo(codigo))codigo=base+"_"+(sufixo++);
    p.setCodigo(codigo);p.setNome(p.getNome().trim());p.setPatrocinador(p.getPatrocinador().trim());p.setAtivo(true);return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(p));
  }
}
