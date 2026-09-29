package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.NucleoZonaPrioritaria;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.domain.ZonaPrioritaria;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoZonaPrioritariaRepository;
import br.org.atkdgv.forcafeminina.repo.ZonaPrioritariaRepository;
import java.text.Normalizer;
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

@RestController
@RequestMapping("/api/zonas-prioritarias")
public class ZonaPrioritariaController {

  private final ZonaPrioritariaRepository zonas;
  private final NucleoZonaPrioritariaRepository vinculos;
  private final NucleoRepository nucleos;

  public ZonaPrioritariaController(
      ZonaPrioritariaRepository zonas,
      NucleoZonaPrioritariaRepository vinculos,
      NucleoRepository nucleos) {
    this.zonas = zonas;
    this.vinculos = vinculos;
    this.nucleos = nucleos;
  }

  public record ZonaRequest(
      String nome,
      String cidade,
      String estado,
      @com.fasterxml.jackson.annotation.JsonProperty("ponto_entrada") String pontoEntrada,
      @com.fasterxml.jackson.annotation.JsonProperty("ponto_saida") String pontoSaida,
      List<String> bairros) {}

  @GetMapping
  public List<ZonaPrioritaria> listar() {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL);
    return zonas.findAllByOrderByNomeAsc();
  }

  @PostMapping
  @Transactional
  public ResponseEntity<ZonaPrioritaria> criar(@RequestBody ZonaRequest request) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    DadosZona dados = validar(request);
    if (zonas.existsByNomeIgnoreCase(dados.nome())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "zona_duplicada", "Já existe uma zona com esse nome.");
    }
    ZonaPrioritaria zona = new ZonaPrioritaria();
    preencher(zona, dados, atual);
    zona.setCriadoPor(atual.getId());
    zona.setCriadoPorNome(atual.getName());
    return ResponseEntity.status(HttpStatus.CREATED).body(zonas.save(zona));
  }

  @PutMapping("/{zonaId}")
  @Transactional
  public ZonaPrioritaria editar(
      @PathVariable String zonaId, @RequestBody ZonaRequest request) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    ZonaPrioritaria zona = exigirZona(zonaId);
    DadosZona dados = validar(request);
    if (zonas.existsByNomeIgnoreCaseAndIdNot(dados.nome(), zonaId)) {
      throw new ApiException(
          HttpStatus.CONFLICT, "zona_duplicada", "Já existe uma zona com esse nome.");
    }
    preencher(zona, dados, atual);
    return zonas.save(zona);
  }

  @DeleteMapping("/{zonaId}")
  @Transactional
  public ResponseEntity<Void> excluir(@PathVariable String zonaId) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    ZonaPrioritaria zona = exigirZona(zonaId);
    long usos = vinculos.countByZonaId(zonaId);
    if (usos > 0) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "zona_em_uso",
          "Esta zona está vinculada a " + usos + " núcleo(s). Desvincule-a antes de excluir.");
    }
    zonas.delete(zona);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{zonaId}/nucleos/{nucleoId}")
  @Transactional
  public ResponseEntity<Void> vincular(
      @PathVariable String zonaId, @PathVariable String nucleoId) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    exigirZona(zonaId);
    if (!nucleos.existsById(nucleoId)) {
      throw new ApiException(
          HttpStatus.NOT_FOUND, "nucleo_nao_encontrado", "Núcleo não encontrado.");
    }
    if (!vinculos.existsByNucleoIdAndZonaId(nucleoId, zonaId)) {
      NucleoZonaPrioritaria vinculo = new NucleoZonaPrioritaria();
      vinculo.setNucleoId(nucleoId);
      vinculo.setZonaId(zonaId);
      vinculos.save(vinculo);
    }
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{zonaId}/nucleos/{nucleoId}")
  @Transactional
  public ResponseEntity<Void> desvincular(
      @PathVariable String zonaId, @PathVariable String nucleoId) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    vinculos.findByNucleoIdAndZonaId(nucleoId, zonaId).ifPresent(vinculos::delete);
    return ResponseEntity.noContent().build();
  }

  private record DadosZona(
      String nome,
      String cidade,
      String estado,
      String pontoEntrada,
      String pontoSaida,
      List<String> bairros) {}

  private DadosZona validar(ZonaRequest request) {
    String nome = limpar(request == null ? null : request.nome());
    String cidade = limpar(request == null ? null : request.cidade());
    String estado = limpar(request == null ? null : request.estado()).toUpperCase();
    if (nome.isEmpty() || cidade.isEmpty() || estado.length() != 2) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "campos_obrigatorios",
          "Informe o nome, o município e a UF da zona prioritária.");
    }
    if (nome.length() > 120 || cidade.length() > 120) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "campo_muito_longo",
          "Nome e município devem ter no máximo 120 caracteres.");
    }
    List<String> bairros = normalizarBairros(request == null ? null : request.bairros());
    return new DadosZona(
        nome,
        cidade,
        estado,
        limpar(request == null ? null : request.pontoEntrada()),
        limpar(request == null ? null : request.pontoSaida()),
        bairros);
  }

  private void preencher(ZonaPrioritaria zona, DadosZona dados, Usuario atual) {
    zona.setNome(dados.nome());
    zona.setCidade(dados.cidade());
    zona.setEstado(dados.estado());
    zona.setPontoEntrada(dados.pontoEntrada());
    zona.setPontoSaida(dados.pontoSaida());
    zona.setBairros(dados.bairros());
    zona.setAtualizadoPor(atual.getId());
    zona.setAtualizadoPorNome(atual.getName());
  }

  private ZonaPrioritaria exigirZona(String id) {
    return zonas
        .findById(id)
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.NOT_FOUND, "zona_nao_encontrada", "Zona não encontrada."));
  }

  private List<String> normalizarBairros(List<String> valores) {
    Map<String, String> unicos = new LinkedHashMap<>();
    if (valores != null) {
      for (String valor : valores) {
        String bairro = limpar(valor);
        if (!bairro.isEmpty()) unicos.putIfAbsent(normalizar(bairro), bairro);
      }
    }
    if (unicos.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "bairro_obrigatorio",
          "Informe pelo menos um bairro da zona prioritária.");
    }
    return new ArrayList<>(unicos.values());
  }

  private String limpar(String valor) {
    return valor == null ? "" : valor.trim().replaceAll("\\s+", " ");
  }

  private String normalizar(String valor) {
    return Normalizer.normalize(valor, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase()
        .trim();
  }
}
