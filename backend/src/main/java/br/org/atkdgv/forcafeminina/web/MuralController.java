package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Mural;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.MuralRepository;
import br.org.atkdgv.forcafeminina.service.AlunaAcessoService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MuralController {

  private final MuralRepository mural;
  private final AlunaAcessoService acessoAluna;

  public MuralController(MuralRepository mural, AlunaAcessoService acessoAluna) {
    this.mural = mural;
    this.acessoAluna = acessoAluna;
  }

  /**
   * Aluna só vê avisos ativos (data ainda não passou) — avisos vencidos somem do painel mas
   * seguem salvos aqui para a equipe, como já acontece com os eventos.
   */
  @GetMapping("/mural")
  public List<Mural> list(@RequestParam(required = false) String turma) {
    Usuario atual = CurrentUser.get();
    if (atual.getPerfil() == Perfil.ALUNA_FF) {
      // O núcleo vem da inscrição aprovada, nunca do parâmetro: a aluna só vê os avisos dela.
      return acessoAluna
          .nucleoDaAlunaLiberada(atual)
          .map(nucleo -> mural.findAtivosParaTurma(LocalDate.now().toString(), nucleo))
          .orElse(List.of());
    }
    if (turma == null || turma.isBlank()) {
      return mural.findAllByOrderByDataPublicacaoDesc();
    }
    return mural.findVisiveisParaTurma(turma);
  }

  public record MuralRequest(
      String titulo,
      String conteudo,
      String turma,
      @JsonProperty("data_publicacao") String dataPublicacao,
      @JsonProperty("exibir_ate") String exibirAte) {}

  @PostMapping("/admin/mural")
  public ResponseEntity<Mural> create(@RequestBody MuralRequest req) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    if (req.titulo() == null || req.titulo().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "titulo é obrigatório.");
    }
    if (req.conteudo() == null || req.conteudo().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "conteudo é obrigatório.");
    }
    Mural aviso = new Mural();
    aviso.setTitulo(req.titulo().trim());
    aviso.setConteudo(req.conteudo().trim());
    aviso.setTurma(req.turma() == null ? "" : req.turma());
    aviso.setDataPublicacao(
        req.dataPublicacao() == null || req.dataPublicacao().isBlank()
            ? LocalDate.now().toString()
            : req.dataPublicacao());
    aviso.setExibirAte(validarExibirAte(req.exibirAte(), aviso.getDataPublicacao()));
    mural.save(aviso);
    return ResponseEntity.status(HttpStatus.CREATED).body(aviso);
  }

  /** Data de validade opcional do aviso: se informada, deve ser válida e não anterior à publicação. */
  private String validarExibirAte(String exibirAte, String dataPublicacao) {
    if (exibirAte == null || exibirAte.isBlank()) return null;
    if (!exibirAte.matches("\\d{4}-\\d{2}-\\d{2}")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Data de exibição inválida.");
    }
    if (exibirAte.compareTo(dataPublicacao) < 0) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "bad_request",
          "A data \"exibir até\" não pode ser anterior à data de publicação.");
    }
    return exibirAte;
  }

  @PatchMapping("/mural/{id}")
  public Mural update(@PathVariable String id, @RequestBody MuralRequest req) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    Mural aviso =
        mural
            .findById(id)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aviso não encontrado."));
    if (req.titulo() != null && !req.titulo().isBlank()) aviso.setTitulo(req.titulo().trim());
    if (req.conteudo() != null && !req.conteudo().isBlank()) aviso.setConteudo(req.conteudo().trim());
    if (req.turma() != null) aviso.setTurma(req.turma());
    if (req.dataPublicacao() != null && !req.dataPublicacao().isBlank()) {
      aviso.setDataPublicacao(req.dataPublicacao());
    }
    if (req.exibirAte() != null) {
      aviso.setExibirAte(validarExibirAte(req.exibirAte(), aviso.getDataPublicacao()));
    }
    return mural.save(aviso);
  }

  @DeleteMapping("/mural/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    mural.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
