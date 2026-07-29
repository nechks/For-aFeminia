package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Solicitacao;
import br.org.atkdgv.forcafeminina.repo.SolicitacaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Cadastro público de professor (ficha da equipe). Diferente da inscrição da aluna, a conta NÃO é
 * criada aqui: o cadastro vira uma {@link Solicitacao} pendente e a Gestão Geral é quem aprova,
 * definindo o núcleo do professor no momento da aprovação (ver {@link SolicitacaoController}).
 */
@RestController
public class CadastroProfessorController {

  /** Campos de texto/seleção do formulário salvos em `dados`. */
  private static final List<String> CAMPOS = List.of(
      "nome_completo", "telefone", "cpf", "data_nascimento", "rg", "nome_empresa", "cnpj",
      "nacionalidade", "estado_civil", "profissao", "endereco_residencial", "endereco_comercial",
      "tamanho_camisa", "dados_bancarios", "vinculo_contratual", "vinculo_contratual_outro",
      "projeto_contratante", "servico_prestado");

  /** Campos obrigatórios (documentos opcionais e "outro" ficam de fora). */
  private static final List<String> OBRIGATORIOS = List.of(
      "nome_completo", "telefone", "cpf", "data_nascimento", "rg", "nome_empresa", "cnpj",
      "nacionalidade", "estado_civil", "profissao",
      "cep_residencial", "logradouro_residencial", "numero_residencial", "bairro_residencial",
      "cidade_residencial", "uf_residencial", "cep_comercial", "logradouro_comercial",
      "numero_comercial", "bairro_comercial", "cidade_comercial", "uf_comercial",
      "tamanho_camisa", "nome_banco", "numero_banco", "conta", "agencia", "chave_pix",
      "vinculo_contratual");

  private final SolicitacaoRepository solicitacoes;
  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;
  private final FileStorageService files;
  private final ObjectMapper objectMapper;

  public CadastroProfessorController(
      SolicitacaoRepository solicitacoes,
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder,
      FileStorageService files,
      ObjectMapper objectMapper) {
    this.solicitacoes = solicitacoes;
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
    this.files = files;
    this.objectMapper = objectMapper;
  }

  @PostMapping(value = "/api/cadastro-professor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, Object>> cadastrar(
      @RequestParam Map<String, String> params,
      @RequestPart(value = "rg_cpf_cnh", required = false) MultipartFile rgCpfCnh,
      @RequestPart(value = "comprovante_residencia", required = false) MultipartFile comprovante,
      @RequestPart(value = "curriculo", required = false) MultipartFile curriculo,
      @RequestPart(value = "cartao_cnpj", required = false) MultipartFile cartaoCnpj,
      @RequestPart(value = "registro_conselho", required = false) MultipartFile registroConselho,
      @RequestPart(value = "contrato_social", required = false) MultipartFile contratoSocial) {

    Map<String, String> errors = new LinkedHashMap<>();
    for (String campo : OBRIGATORIOS) {
      String v = params.get(campo);
      if (v == null || v.isBlank()) errors.put(campo, "Campo obrigatório");
    }

    String email = params.getOrDefault("email", "").trim().toLowerCase();
    if (email.isEmpty() || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
      errors.put("email", "E-mail válido é obrigatório");
    } else if (usuarios.existsByEmailIgnoreCase(email)) {
      errors.put("email", "E-mail já cadastrado. Use a opção de login.");
    }

    String senha = params.getOrDefault("senha", "");
    if (senha.length() < 8) {
      errors.put("senha", "A senha deve ter pelo menos 8 caracteres");
    }

    String cpf = params.getOrDefault("cpf", "").replaceAll("\\D", "");
    if (!cpf.isEmpty() && !isCpfValido(cpf)) {
      errors.put("cpf", "CPF inválido");
    }
    String profissao = params.getOrDefault("profissao", "").trim();
    if (!profissao.isEmpty() && !profissao.matches("\\d{4}-\\d{2} - .+")) {
      errors.put("profissao", "Selecione uma profissão da lista oficial da CBO");
    }
    validarEnderecos(params, errors);
    validarDadosBancarios(params, errors);

    // Documentos obrigatórios (registro no conselho e contrato social são opcionais).
    if (isEmpty(rgCpfCnh)) errors.put("rg_cpf_cnh", "Documento obrigatório");
    if (isEmpty(comprovante)) errors.put("comprovante_residencia", "Documento obrigatório");
    if (isEmpty(curriculo)) errors.put("curriculo", "Documento obrigatório");
    if (isEmpty(cartaoCnpj)) errors.put("cartao_cnpj", "Documento obrigatório");

    if (!errors.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "Dados inválidos", errors);
    }

    Map<String, Object> dados = new LinkedHashMap<>();
    for (String campo : CAMPOS) {
      String v = params.get(campo);
      if (v != null) dados.put(campo, v.trim());
    }
    dados.put(
        "dados_bancarios",
        String.join(
            "\n",
            "Nome do banco: " + params.get("nome_banco").trim(),
            "Nº do banco: " + params.get("numero_banco").trim(),
            "Conta: " + params.get("conta").trim(),
            "Agência: " + params.get("agencia").trim(),
            "Chave pix: " + params.get("chave_pix").trim()));
    dados.put("cpf", cpf);
    dados.put("email", email);

    Map<String, String> documentos = new LinkedHashMap<>();
    try {
      documentos.put("rg_cpf_cnh", files.store(rgCpfCnh));
      documentos.put("comprovante_residencia", files.store(comprovante));
      documentos.put("curriculo", files.store(curriculo));
      documentos.put("cartao_cnpj", files.store(cartaoCnpj));
      if (!isEmpty(registroConselho)) {
        documentos.put("registro_conselho", files.store(registroConselho));
      }
      if (!isEmpty(contratoSocial)) {
        documentos.put("contrato_social", files.store(contratoSocial));
      }
    } catch (IllegalArgumentException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "arquivo_invalido", e.getMessage());
    }
    dados.put("documentos", documentos);

    Solicitacao s = new Solicitacao();
    s.setTipo(SolicitacaoController.TIPO_CADASTRO_PROFESSOR);
    try {
      s.setDados(objectMapper.writeValueAsString(dados));
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Dados inválidos.");
    }
    s.setSenhaHash(passwordEncoder.encode(senha));
    // Auto-cadastro: não há solicitante logado; o próprio candidato é a referência.
    s.setSolicitadoPor("");
    s.setSolicitadoPorNome(params.get("nome_completo").trim());
    s.setStatus("PENDENTE");
    solicitacoes.save(s);

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("id", s.getId());
    body.put("status", s.getStatus());
    return ResponseEntity.status(HttpStatus.CREATED).body(body);
  }

  private static boolean isEmpty(MultipartFile f) {
    return f == null || f.isEmpty();
  }

  private static void validarEnderecos(
      Map<String, String> params, Map<String, String> errors) {
    for (String tipo : List.of("residencial", "comercial")) {
      String cep = params.getOrDefault("cep_" + tipo, "").replaceAll("\\D", "");
      String uf = params.getOrDefault("uf_" + tipo, "").trim();
      if (!cep.isEmpty() && !cep.matches("\\d{8}")) {
        errors.put("cep_" + tipo, "Informe um CEP válido");
      }
      if (!uf.isEmpty() && !uf.matches("(?i)[A-Z]{2}")) {
        errors.put("uf_" + tipo, "Informe a UF com 2 letras");
      }
    }
  }

  private static void validarDadosBancarios(
      Map<String, String> params, Map<String, String> errors) {
    String nome = params.getOrDefault("nome_banco", "").trim();
    String banco = params.getOrDefault("numero_banco", "").trim();
    String conta = params.getOrDefault("conta", "").trim();
    String agencia = params.getOrDefault("agencia", "").trim();
    String pix = params.getOrDefault("chave_pix", "").trim();

    if (!nome.isEmpty() && (nome.length() < 2 || nome.matches("\\d+"))) {
      errors.put("nome_banco", "Informe o nome válido da instituição bancária");
    }
    if (!banco.isEmpty() && (!banco.matches("\\d{3}") || somenteZeros(banco))) {
      errors.put("numero_banco", "Informe o código bancário com 3 dígitos");
    }
    if (!agencia.isEmpty()
        && (!agencia.matches("\\d{1,6}(-?[0-9Xx])?") || somenteZeros(agencia))) {
      errors.put("agencia", "Informe uma agência válida");
    }
    if (!conta.isEmpty()
        && (!conta.matches("[0-9A-Za-z.-]{2,20}") || somenteZeros(conta))) {
      errors.put("conta", "Informe uma conta válida, incluindo o dígito");
    }
    if (!pix.isEmpty() && !isChavePixValida(pix)) {
      errors.put(
          "chave_pix", "Use CPF/CNPJ, e-mail, telefone com +55 ou chave aleatória válida");
    }
  }

  private static boolean somenteZeros(String valor) {
    String digitos = valor.replaceAll("\\D", "");
    return !digitos.isEmpty() && digitos.matches("0+");
  }

  private static boolean isChavePixValida(String chave) {
    String digitos = chave.replaceAll("\\D", "");
    boolean email = chave.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    boolean telefone = chave.replaceAll("[\\s()-]", "").matches("\\+55\\d{10,11}");
    boolean aleatoria =
        chave.matches(
            "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
    boolean documento =
        (digitos.length() == 11 && isCpfValido(digitos))
            || (digitos.length() == 14 && isCnpjValido(digitos));
    return email || telefone || aleatoria || documento;
  }

  private static boolean isCnpjValido(String cnpj) {
    if (cnpj.length() != 14 || cnpj.chars().distinct().count() == 1) return false;
    int[] pesos1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    int[] pesos2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    int soma = 0;
    for (int i = 0; i < 12; i++) soma += (cnpj.charAt(i) - '0') * pesos1[i];
    int resto = soma % 11;
    int d1 = resto < 2 ? 0 : 11 - resto;
    soma = 0;
    for (int i = 0; i < 13; i++) soma += (cnpj.charAt(i) - '0') * pesos2[i];
    resto = soma % 11;
    int d2 = resto < 2 ? 0 : 11 - resto;
    return d1 == cnpj.charAt(12) - '0' && d2 == cnpj.charAt(13) - '0';
  }

  private static boolean isCpfValido(String cpf) {
    if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) return false;
    int sum1 = 0;
    for (int i = 0; i < 9; i++) sum1 += (cpf.charAt(i) - '0') * (10 - i);
    int d1 = 11 - (sum1 % 11);
    if (d1 >= 10) d1 = 0;
    int sum2 = 0;
    for (int i = 0; i < 10; i++) sum2 += (cpf.charAt(i) - '0') * (11 - i);
    int d2 = 11 - (sum2 % 11);
    if (d2 >= 10) d2 = 0;
    return d1 == cpf.charAt(9) - '0' && d2 == cpf.charAt(10) - '0';
  }
}
