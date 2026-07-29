package br.org.atkdgv.forcafeminina.web;
import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/turmas")
public class TurmaController{
 private final TurmaRepository turmas;private final NucleoRepository nucleos;
 public TurmaController(TurmaRepository t,NucleoRepository n){turmas=t;nucleos=n;}
 @GetMapping public List<Turma> listar(@RequestParam("nucleo_id") String nucleoId){CurrentUser.require(Perfil.GESTAO_GERAL,Perfil.ADMINISTRATIVO);return turmas.findByNucleoIdOrderByNomeAsc(nucleoId);}
 @PostMapping @Transactional public ResponseEntity<Turma> criar(@RequestBody Turma t){
  CurrentUser.require(Perfil.GESTAO_GERAL);
  if(t.getNucleoId()==null||!nucleos.existsById(t.getNucleoId()))throw new ApiException(HttpStatus.BAD_REQUEST,"nucleo_invalido","Selecione um núcleo válido.");
  if(t.getNome()==null||t.getNome().isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"nome_obrigatorio","Informe o nome da turma.");
  if(t.getDiasSemana()==null||t.getDiasSemana().isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"dias_obrigatorios","Selecione pelo menos um dia de aula.");
  if(t.getTurno()==null||!Set.of("MANHA","TARDE","NOITE").contains(t.getTurno()))throw new ApiException(HttpStatus.BAD_REQUEST,"turno_invalido","Selecione manhã, tarde ou noite.");
  String base=t.getNome().trim().toUpperCase().replaceAll("[^A-Z0-9]+","_").replaceAll("(^_|_$)","");if(base.length()<3)base="TURMA";if(base.length()>64)base=base.substring(0,64);
  String codigo=base;int i=2;while(turmas.existsByCodigo(codigo))codigo=base+"_"+(i++);
  t.setCodigo(codigo);t.setNome(t.getNome().trim());t.setAtivo(true);return ResponseEntity.status(HttpStatus.CREATED).body(turmas.save(t));
 }
}
