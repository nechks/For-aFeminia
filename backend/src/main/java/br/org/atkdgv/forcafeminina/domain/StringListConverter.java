package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

/** Persiste listas curtas de configuração como JSON em uma coluna TEXT. */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

  private static final ObjectMapper JSON = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(List<String> valores) {
    try {
      return JSON.writeValueAsString(valores == null ? List.of() : valores);
    } catch (Exception e) {
      throw new IllegalArgumentException("Não foi possível salvar a lista de valores.", e);
    }
  }

  @Override
  public List<String> convertToEntityAttribute(String valor) {
    if (valor == null || valor.isBlank()) return new ArrayList<>();
    try {
      return new ArrayList<>(JSON.readValue(valor, new TypeReference<List<String>>() {}));
    } catch (Exception e) {
      return new ArrayList<>();
    }
  }
}
