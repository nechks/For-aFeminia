package br.org.atkdgv.forcafeminina.web;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profissoes")
public class ProfissaoController {

  public record Profissao(String codigo, String titulo) {}

  private final List<Profissao> profissoes;

  public ProfissaoController() {
    this.profissoes = carregarCbo();
  }

  @GetMapping
  public List<Profissao> buscar(
      @RequestParam(name = "busca", defaultValue = "") String busca,
      @RequestParam(name = "limite", defaultValue = "20") int limite) {
    String termo = normalizar(busca == null ? "" : busca.trim());
    if (termo.length() < 2) return List.of();
    int maximo = Math.max(1, Math.min(limite, 50));
    String codigoBusca = termo.replaceAll("\\D", "");

    return profissoes.stream()
        .filter(
            profissao ->
                normalizar(profissao.titulo()).contains(termo)
                    || (!codigoBusca.isBlank() && profissao.codigo().contains(codigoBusca)))
        .limit(maximo)
        .toList();
  }

  private List<Profissao> carregarCbo() {
    List<Profissao> lista = new ArrayList<>();
    try (BufferedReader reader =
        new BufferedReader(
            new InputStreamReader(
                new ClassPathResource("cbo2002-ocupacao.csv").getInputStream(),
                StandardCharsets.UTF_8))) {
      String linha;
      boolean cabecalho = true;
      while ((linha = reader.readLine()) != null) {
        if (cabecalho) {
          cabecalho = false;
          continue;
        }
        int separador = linha.indexOf(';');
        if (separador <= 0 || separador == linha.length() - 1) continue;
        String codigo = linha.substring(0, separador).replace("\"", "").trim();
        String titulo = linha.substring(separador + 1).replace("\"", "").trim();
        if (!codigo.isBlank() && !titulo.isBlank()) lista.add(new Profissao(codigo, titulo));
      }
      return List.copyOf(lista);
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "cbo_indisponivel",
          "Não foi possível carregar a lista oficial de profissões.");
    }
  }

  private static String normalizar(String texto) {
    return Normalizer.normalize(texto, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT);
  }
}
