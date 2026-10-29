package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.InteresseNaoAtendido;
import br.org.atkdgv.forcafeminina.domain.MunicipioAtendido;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.repo.InteresseNaoAtendidoRepository;
import br.org.atkdgv.forcafeminina.repo.MunicipioAtendidoRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Municípios em que o projeto atende. A lista é editável pela gestão — nada fixo em código — e é o
 * que decide se a inscrição continua até a pergunta de turma ou é encerrada ali mesmo.
 */
@RestController
@RequestMapping("/api/municipios-atendidos")
public class MunicipioController {

  private final MunicipioAtendidoRepository municipios;
  private final InteresseNaoAtendidoRepository interesses;

  public MunicipioController(
      MunicipioAtendidoRepository municipios, InteresseNaoAtendidoRepository interesses) {
    this.municipios = municipios;
    this.interesses = interesses;
  }

  /** Lista pública usada pelo formulário de inscrição para saber onde há atendimento. */
  @GetMapping("/publicos")
  public List<Map<String, String>> publicos() {
    List<Map<String, String>> body = new ArrayList<>();
    for (MunicipioAtendido m : municipios.findByAtivoTrueOrderByNomeAsc()) {
      Map<String, String> item = new LinkedHashMap<>();
      item.put("nome", m.getNome());
      item.put("uf", m.getUf());
      body.add(item);
    }
    return body;
  }

  @GetMapping
  public List<MunicipioAtendido> listar() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    return municipios.findAllByOrderByNomeAsc();
  }

  public record MunicipioRequest(String nome, String uf, Boolean ativo) {}

  @PostMapping
  @Transactional
  public ResponseEntity<MunicipioAtendido> criar(@RequestBody MunicipioRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    validar(req);
    String chave = MunicipioAtendido.chaveDe(req.nome(), req.uf());
    // Recadastrar um município já existente reativa o que estava lá em vez de duplicar a linha.
    MunicipioAtendido m = municipios.findByChave(chave).orElseGet(MunicipioAtendido::new);
    m.setNome(req.nome().trim());
    m.setUf(req.uf().trim().toUpperCase());
    m.setChave(chave);
    m.setAtivo(req.ativo() == null || req.ativo());
    municipios.save(m);
    return ResponseEntity.status(HttpStatus.CREATED).body(m);
  }

  @PutMapping("/{id}")
  @Transactional
  public MunicipioAtendido editar(@PathVariable String id, @RequestBody MunicipioRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    validar(req);
    MunicipioAtendido m = carregar(id);
    String chave = MunicipioAtendido.chaveDe(req.nome(), req.uf());
    municipios
        .findByChave(chave)
        .filter(outro -> !outro.getId().equals(id))
        .ifPresent(
            outro -> {
              throw new ApiException(
                  HttpStatus.CONFLICT, "municipio_duplicado", "Este município já está cadastrado.");
            });
    m.setNome(req.nome().trim());
    m.setUf(req.uf().trim().toUpperCase());
    m.setChave(chave);
    if (req.ativo() != null) m.setAtivo(req.ativo());
    return municipios.save(m);
  }

  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> excluir(@PathVariable String id) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    municipios.delete(carregar(id));
    return ResponseEntity.noContent().build();
  }

  /**
   * Procura registrada em município ainda não atendido. Serve para a coordenação enxergar onde há
   * demanda reprimida — a inscrição em si não é criada.
   */
  @GetMapping("/interesses")
  public List<InteresseNaoAtendido> interessesNaoAtendidos() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL);
    return interesses.findAllByOrderByCreatedDesc();
  }

  private MunicipioAtendido carregar(String id) {
    return municipios
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Município não encontrado."));
  }

  private void validar(MunicipioRequest req) {
    if (req == null || req.nome() == null || req.nome().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nome_obrigatorio", "Informe o nome do município.");
    }
    if (req.uf() == null || !req.uf().trim().matches("(?i)[A-Z]{2}")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "uf_invalida", "Informe a UF com 2 letras.");
    }
  }

}
