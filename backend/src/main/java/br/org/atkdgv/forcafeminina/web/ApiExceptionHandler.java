package br.org.atkdgv.forcafeminina.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", ex.getError());
    body.put("message", ex.getMessage());
    if (ex.getFields() != null) body.put("fields", ex.getFields());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "bad_request", "message", String.valueOf(ex.getMessage())));
  }

  private static final org.slf4j.Logger log =
      org.slf4j.LoggerFactory.getLogger(ApiExceptionHandler.class);

  /**
   * Erros de requisição que o próprio Spring já classifica (endereço inexistente, parâmetro
   * obrigatório ausente, método HTTP errado...). Eles trazem o status certo; sem este handler
   * caíam no genérico e viravam 500 "Erro interno", poluindo o log com falhas que não são do
   * servidor.
   */
  @ExceptionHandler({
    NoResourceFoundException.class,
    ServletRequestBindingException.class,
    HttpRequestMethodNotSupportedException.class,
    HttpMediaTypeNotSupportedException.class
  })
  public ResponseEntity<Map<String, Object>> handleSpring(Exception ex) {
    HttpStatusCode status = ((ErrorResponse) ex).getStatusCode();
    String mensagem =
        switch (ex) {
          case NoResourceFoundException e -> "Endereço não encontrado.";
          case MissingServletRequestParameterException e ->
              "Parâmetro obrigatório ausente: " + e.getParameterName() + ".";
          case HttpRequestMethodNotSupportedException e -> "Método não permitido neste endereço.";
          default -> "Requisição inválida.";
        };
    return ResponseEntity.status(status)
        .body(Map.of("error", status.value() == 404 ? "not_found" : "bad_request", "message", mensagem));
  }

  @ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
  public ResponseEntity<Map<String, Object>> handleEntradaInvalida(Exception ex) {
    String mensagem =
        ex instanceof MethodArgumentTypeMismatchException e
            ? "Valor inválido para o parâmetro " + e.getName() + "."
            : "Corpo da requisição inválido.";
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "bad_request", "message", mensagem));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
    log.error("Erro interno não tratado", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "internal_error", "message", "Erro interno do servidor."));
  }
}
