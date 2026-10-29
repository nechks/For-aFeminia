package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.service.FileAccessService;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {

  private final FileStorageService files;
  private final FileAccessService acesso;

  public FileController(FileStorageService files, FileAccessService acesso) {
    this.files = files;
    this.acesso = acesso;
  }

  @GetMapping("/{filename}")
  public ResponseEntity<Resource> serve(@PathVariable String filename) {
    Path path = files.resolve(filename);
    // Sem permissão responde 404, como arquivo inexistente: não confirma que o arquivo existe.
    if (!Files.exists(path) || !acesso.podeAcessar(CurrentUser.get(), filename)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "not_found", "Arquivo não encontrado.");
    }
    String contentType = files.tipoParaServir(filename);
    ResponseEntity.BodyBuilder resposta =
        ResponseEntity.ok().header("X-Content-Type-Options", "nosniff");
    if (contentType == null) {
      // Extensão fora da lista (arquivo antigo): nunca é renderizado pelo navegador.
      return resposta
          .contentType(MediaType.APPLICATION_OCTET_STREAM)
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
          .body(new PathResource(path));
    }
    return resposta.contentType(MediaType.parseMediaType(contentType)).body(new PathResource(path));
  }
}
