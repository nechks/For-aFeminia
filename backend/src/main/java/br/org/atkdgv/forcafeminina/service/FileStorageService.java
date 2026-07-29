package br.org.atkdgv.forcafeminina.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

  private static final Set<String> ALLOWED_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf");

  private final Path uploadsDir;

  public FileStorageService(@Value("${app.uploads-dir}") String uploadsDir) {
    this.uploadsDir = Path.of(uploadsDir).toAbsolutePath();
    try {
      Files.createDirectories(this.uploadsDir);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** Salva o arquivo e retorna o nome gerado. */
  public String store(MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
      throw new IllegalArgumentException("Tipo de arquivo não permitido. Use JPEG, PNG ou PDF.");
    }
    String original = file.getOriginalFilename() == null ? "arquivo" : file.getOriginalFilename();
    String ext = "";
    int dot = original.lastIndexOf('.');
    if (dot >= 0) ext = original.substring(dot).toLowerCase();
    String filename = UUID.randomUUID().toString().replace("-", "") + ext;
    try {
      Files.copy(file.getInputStream(), uploadsDir.resolve(filename),
          StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return filename;
  }

  public Path resolve(String filename) {
    Path p = uploadsDir.resolve(filename).normalize();
    if (!p.startsWith(uploadsDir)) {
      throw new IllegalArgumentException("Nome de arquivo inválido.");
    }
    return p;
  }
}
