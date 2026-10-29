package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.CalendarioAula;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.CalendarioAulaRepository;
import br.org.atkdgv.forcafeminina.service.AlunaAcessoService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendario")
public class CalendarioController {

  private final CalendarioAulaRepository calendario;
  private final AlunaAcessoService acessoAluna;

  public CalendarioController(CalendarioAulaRepository calendario, AlunaAcessoService acessoAluna) {
    this.calendario = calendario;
    this.acessoAluna = acessoAluna;
  }

  @GetMapping
  public List<CalendarioAula> list(@RequestParam(required = false) String turma) {
    Usuario atual = CurrentUser.get();
    if (atual.getPerfil() == Perfil.ALUNA_FF) {
      // A aluna vê só o calendário do próprio núcleo, e só depois de liberada.
      return acessoAluna
          .nucleoDaAlunaLiberada(atual)
          .map(calendario::findByTurmaOrderByDataAulaAsc)
          .orElse(List.of());
    }
    if (turma == null || turma.isBlank()) {
      return calendario.findAllByOrderByDataAulaAsc();
    }
    return calendario.findByTurmaOrderByDataAulaAsc(turma);
  }

  public record CalendarioRequest(String turma, @JsonProperty("data_aula") String dataAula) {}

  @PostMapping
  public ResponseEntity<CalendarioAula> create(@RequestBody CalendarioRequest req) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    if (req.turma() == null || req.turma().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "turma é obrigatório.");
    }
    if (req.dataAula() == null || req.dataAula().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "data_aula é obrigatório.");
    }
    try {
      LocalDate.parse(req.dataAula());
    } catch (DateTimeParseException e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "data_invalida", "Informe a data da aula no formato AAAA-MM-DD.");
    }
    // A data repetida contaria a mesma aula duas vezes no total usado para a frequência.
    if (calendario.existsByTurmaAndDataAula(req.turma(), req.dataAula())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "aula_duplicada", "Já existe aula cadastrada nesta data para o núcleo.");
    }
    CalendarioAula aula = new CalendarioAula();
    aula.setTurma(req.turma());
    aula.setDataAula(req.dataAula());
    calendario.save(aula);
    return ResponseEntity.status(HttpStatus.CREATED).body(aula);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    calendario.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
