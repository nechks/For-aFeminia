package br.org.atkdgv.forcafeminina.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

  /**
   * Tipos aceitos e a extensão gravada para cada um. A extensão sai daqui, nunca do nome enviado
   * pelo cliente: um "x.html" declarado como image/png seria servido como página HTML.
   */
  private static final Map<String, String> EXTENSAO_POR_TIPO =
      Map.of(
          "image/jpeg", ".jpg",
          "image/png", ".png",
          "image/webp", ".webp",
          "image/gif", ".gif",
          "application/pdf", ".pdf");

  /** Tipo servido para cada extensão; qualquer outra (arquivos antigos) vai como download. */
  private static final Map<String, String> TIPO_POR_EXTENSAO =
      Map.of(
          ".jpg", "image/jpeg",
          ".jpeg", "image/jpeg",
          ".png", "image/png",
          ".webp", "image/webp",
          ".gif", "image/gif",
          ".pdf", "application/pdf");

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
    String contentType =
        file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
    String ext = EXTENSAO_POR_TIPO.get(contentType);
    if (ext == null) {
      throw new IllegalArgumentException("Tipo de arquivo não permitido. Use JPEG, PNG ou PDF.");
    }
    if (!conteudoConfere(file, contentType)) {
      throw new IllegalArgumentException(
          "O conteúdo do arquivo não corresponde ao tipo informado. Use JPEG, PNG ou PDF.");
    }
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

  /** Tipo com que o arquivo pode ser exibido no navegador, ou null se não for um tipo aceito. */
  public String tipoParaServir(String filename) {
    int dot = filename.lastIndexOf('.');
    if (dot < 0) return null;
    return TIPO_POR_EXTENSAO.get(filename.substring(dot).toLowerCase(Locale.ROOT));
  }

  /** Confere a assinatura do arquivo (primeiros bytes) contra o tipo declarado. */
  private boolean conteudoConfere(MultipartFile file, String contentType) {
    byte[] h = new byte[12];
    int lidos;
    try (InputStream in = file.getInputStream()) {
      lidos = in.readNBytes(h, 0, h.length);
    } catch (IOException e) {
      return false;
    }
    return switch (contentType) {
      case "image/jpeg" ->
          lidos >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
      case "image/png" -> lidos >= 4 && (h[0] & 0xFF) == 0x89 && texto(h, 1, 3).equals("PNG");
      case "image/gif" -> lidos >= 4 && texto(h, 0, 4).equals("GIF8");
      case "image/webp" ->
          lidos >= 12 && texto(h, 0, 4).equals("RIFF") && texto(h, 8, 4).equals("WEBP");
      case "application/pdf" -> lidos >= 4 && texto(h, 0, 4).equals("%PDF");
      default -> false;
    };
  }

  private static String texto(byte[] bytes, int inicio, int tamanho) {
    return new String(bytes, inicio, tamanho, StandardCharsets.US_ASCII);
  }
}
