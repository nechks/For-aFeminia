package br.org.atkdgv.forcafeminina.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Documento de evidências das aulas, nos dois formatos pedidos pela coordenação. Word e PDF
 * compartilham o mesmo modelo ({@link Aula}) e a mesma sequência de blocos, para que as duas saídas
 * fiquem com o mesmo layout.
 *
 * <p>As imagens saem embutidas no arquivo. Formatos que a biblioteca de saída não sabe desenhar
 * (WebP, por exemplo) entram como uma linha citando o arquivo, em vez de derrubar a exportação
 * inteira.
 */
@Service
public class EvidenciaExportService {

  private static final Logger log = LoggerFactory.getLogger(EvidenciaExportService.class);
  private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final int LARGURA_FOTO_PX = 380;

  /** Uma aula com tudo que entra no documento. */
  public record Aula(
      String projeto,
      String nucleo,
      String turma,
      String profissional,
      LocalDate data,
      String relatorio,
      String observacoes,
      List<String> presentes,
      List<Foto> fotos) {}

  /** Arquivo anexado como evidência, já resolvido no diretório de uploads. */
  public record Foto(Path caminho, String nomeOriginal) {}

  private final FileStorageService arquivos;

  public EvidenciaExportService(FileStorageService arquivos) {
    this.arquivos = arquivos;
  }

  public Path caminhoDe(String arquivo) {
    return arquivos.resolve(arquivo);
  }

  /** Nome padronizado do arquivo exportado. */
  public String nomeDoArquivo(String projeto, String turma, String extensao) {
    return "evidencias_"
        + slug(projeto)
        + "_"
        + slug(turma)
        + "_"
        + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        + "."
        + extensao;
  }

  // ------------------------------------------------------------------------ Word

  public byte[] gerarDocx(String titulo, String periodo, List<Aula> aulas) {
    try (XWPFDocument doc = new XWPFDocument();
        ByteArrayOutputStream saida = new ByteArrayOutputStream()) {

      escreverDocx(doc, titulo, 20, true, ParagraphAlignment.CENTER);
      if (periodo != null && !periodo.isBlank()) {
        escreverDocx(doc, periodo, 11, false, ParagraphAlignment.CENTER);
      }

      for (Aula aula : aulas) {
        escreverDocx(doc, "", 11, false, ParagraphAlignment.LEFT);
        escreverDocx(doc, cabecalho(aula), 13, true, ParagraphAlignment.LEFT);
        escreverDocx(doc, linhaProfissional(aula), 11, false, ParagraphAlignment.LEFT);

        escreverDocx(doc, "Conteúdo da aula", 12, true, ParagraphAlignment.LEFT);
        escreverDocx(doc, textoOu(aula.relatorio(), "Sem relatório registrado."), 11, false, ParagraphAlignment.LEFT);
        if (aula.observacoes() != null && !aula.observacoes().isBlank()) {
          escreverDocx(doc, "Observações", 12, true, ParagraphAlignment.LEFT);
          escreverDocx(doc, aula.observacoes(), 11, false, ParagraphAlignment.LEFT);
        }

        escreverDocx(doc, "Presentes (" + aula.presentes().size() + ")", 12, true, ParagraphAlignment.LEFT);
        if (aula.presentes().isEmpty()) {
          escreverDocx(doc, "Nenhuma presença registrada nesta data.", 11, false, ParagraphAlignment.LEFT);
        } else {
          for (String nome : aula.presentes()) {
            escreverDocx(doc, "• " + nome, 11, false, ParagraphAlignment.LEFT);
          }
        }

        escreverDocx(doc, "Evidências (" + aula.fotos().size() + ")", 12, true, ParagraphAlignment.LEFT);
        for (Foto foto : aula.fotos()) {
          inserirFotoDocx(doc, foto);
        }
      }

      doc.write(saida);
      return saida.toByteArray();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private void escreverDocx(
      XWPFDocument doc, String texto, int tamanho, boolean negrito, ParagraphAlignment alinhamento) {
    XWPFParagraph p = doc.createParagraph();
    p.setAlignment(alinhamento);
    XWPFRun run = p.createRun();
    run.setFontSize(tamanho);
    run.setBold(negrito);
    for (String linha : texto.split("\n", -1)) {
      run.setText(linha);
      run.addBreak();
    }
  }

  private void inserirFotoDocx(XWPFDocument doc, Foto foto) {
    int tipo = tipoPoi(foto.caminho());
    if (tipo < 0 || !Files.isReadable(foto.caminho())) {
      escreverDocx(doc, "[anexo: " + foto.nomeOriginal() + "]", 10, false, ParagraphAlignment.LEFT);
      return;
    }
    try (InputStream in = Files.newInputStream(foto.caminho())) {
      XWPFParagraph p = doc.createParagraph();
      p.setAlignment(ParagraphAlignment.CENTER);
      XWPFRun run = p.createRun();
      run.addPicture(
          in,
          tipo,
          foto.nomeOriginal(),
          Units.pixelToEMU(LARGURA_FOTO_PX),
          Units.pixelToEMU((int) (LARGURA_FOTO_PX * 0.75)));
    } catch (Exception e) {
      log.warn("Não foi possível embutir {} no Word: {}", foto.nomeOriginal(), e.getMessage());
      escreverDocx(doc, "[anexo: " + foto.nomeOriginal() + "]", 10, false, ParagraphAlignment.LEFT);
    }
  }

  private int tipoPoi(Path caminho) {
    String nome = caminho.getFileName().toString().toLowerCase(Locale.ROOT);
    if (nome.endsWith(".png")) return XWPFDocument.PICTURE_TYPE_PNG;
    if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) return XWPFDocument.PICTURE_TYPE_JPEG;
    if (nome.endsWith(".gif")) return XWPFDocument.PICTURE_TYPE_GIF;
    return -1;
  }

  // ------------------------------------------------------------------------- PDF

  public byte[] gerarPdf(String titulo, String periodo, List<Aula> aulas) {
    Document doc = new Document(PageSize.A4, 48, 48, 48, 48);
    ByteArrayOutputStream saida = new ByteArrayOutputStream();
    PdfWriter.getInstance(doc, saida);
    doc.open();

    doc.add(paragrafo(titulo, 18, true, Element.ALIGN_CENTER));
    if (periodo != null && !periodo.isBlank()) {
      doc.add(paragrafo(periodo, 11, false, Element.ALIGN_CENTER));
    }

    for (Aula aula : aulas) {
      doc.add(paragrafo(" ", 11, false, Element.ALIGN_LEFT));
      doc.add(paragrafo(cabecalho(aula), 13, true, Element.ALIGN_LEFT));
      doc.add(paragrafo(linhaProfissional(aula), 11, false, Element.ALIGN_LEFT));

      doc.add(paragrafo("Conteúdo da aula", 12, true, Element.ALIGN_LEFT));
      doc.add(paragrafo(textoOu(aula.relatorio(), "Sem relatório registrado."), 11, false, Element.ALIGN_LEFT));
      if (aula.observacoes() != null && !aula.observacoes().isBlank()) {
        doc.add(paragrafo("Observações", 12, true, Element.ALIGN_LEFT));
        doc.add(paragrafo(aula.observacoes(), 11, false, Element.ALIGN_LEFT));
      }

      doc.add(paragrafo("Presentes (" + aula.presentes().size() + ")", 12, true, Element.ALIGN_LEFT));
      if (aula.presentes().isEmpty()) {
        doc.add(paragrafo("Nenhuma presença registrada nesta data.", 11, false, Element.ALIGN_LEFT));
      } else {
        for (String nome : aula.presentes()) {
          doc.add(paragrafo("• " + nome, 11, false, Element.ALIGN_LEFT));
        }
      }

      doc.add(paragrafo("Evidências (" + aula.fotos().size() + ")", 12, true, Element.ALIGN_LEFT));
      for (Foto foto : aula.fotos()) {
        inserirFotoPdf(doc, foto);
      }
    }

    doc.close();
    return saida.toByteArray();
  }

  private void inserirFotoPdf(Document doc, Foto foto) {
    try {
      com.lowagie.text.Image imagem =
          com.lowagie.text.Image.getInstance(foto.caminho().toAbsolutePath().toString());
      imagem.scaleToFit(LARGURA_FOTO_PX, LARGURA_FOTO_PX);
      imagem.setAlignment(Element.ALIGN_CENTER);
      doc.add(imagem);
    } catch (Exception e) {
      log.warn("Não foi possível embutir {} no PDF: {}", foto.nomeOriginal(), e.getMessage());
      doc.add(paragrafo("[anexo: " + foto.nomeOriginal() + "]", 10, false, Element.ALIGN_LEFT));
    }
  }

  private Paragraph paragrafo(String texto, int tamanho, boolean negrito, int alinhamento) {
    Font fonte =
        FontFactory.getFont(
            FontFactory.HELVETICA, tamanho, negrito ? Font.BOLD : Font.NORMAL, Color.BLACK);
    Paragraph p = new Paragraph(texto, fonte);
    p.setAlignment(alinhamento);
    p.setSpacingAfter(4);
    return p;
  }

  // ----------------------------------------------------------------------- apoio

  private String cabecalho(Aula aula) {
    return aula.projeto()
        + " · "
        + aula.nucleo()
        + " · "
        + aula.turma()
        + " — "
        + (aula.data() == null ? "sem data" : aula.data().format(DATA_BR));
  }

  private String linhaProfissional(Aula aula) {
    return "Profissional responsável: " + textoOu(aula.profissional(), "não informado");
  }

  private static String textoOu(String valor, String padrao) {
    return valor == null || valor.isBlank() ? padrao : valor;
  }

  private static String slug(String valor) {
    if (valor == null || valor.isBlank()) return "geral";
    String limpo =
        java.text.Normalizer.normalize(valor, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    return limpo.isEmpty() ? "geral" : limpo;
  }
}
