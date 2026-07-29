package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.service.FileStorageService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
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

  public FileController(FileStorageService files) {
    this.files = files;
  }

  @GetMapping("/{filename}")
  public ResponseEntity<Resource> serve(@PathVariable String filename) {
    Path path = files.resolve(filename);
    if (!Files.exists(path)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "not_found", "Arquivo não encontrado.");
    }
    String contentType;
    try {
      contentType = Files.probeContentType(path);
    } catch (IOException e) {
      contentType = null;
    }
    return ResponseEntity.ok()
        .contentType(
            contentType != null
                ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM)
        .body(new PathResource(path));
  }
}
