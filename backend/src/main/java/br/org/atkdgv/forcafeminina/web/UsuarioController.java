package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.ExclusaoUsuario;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.repo.ExclusaoUsuarioRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UsuarioController {

  private final UsuarioRepository usuarios;
  private final ExclusaoUsuarioRepository exclusoes;
  private final FileStorageService files;
  private final PasswordEncoder passwordEncoder;
  private final FichaInscricaoRepository fichas;
  private final FichaConfirmacaoRepository confirmacoes;
  private final ObjectMapper objectMapper;
  private final NucleoRepository nucleos;
  private final TurmaRepository turmas;

  public UsuarioController(
      UsuarioRepository usuarios,
      ExclusaoUsuarioRepository exclusoes,
      FileStorageService files,
      PasswordEncoder passwordEncoder,
      FichaInscricaoRepository fichas,
      FichaConfirmacaoRepository confirmacoes,
      ObjectMapper objectMapper,
      NucleoRepository nucleos,
      TurmaRepository turmas) {
    this.usuarios = usuarios;
    this.exclusoes = exclusoes;
    this.files = files;
    this.passwordEncoder = passwordEncoder;
    this.fichas = fichas;
    this.confirmacoes = confirmacoes;
    this.objectMapper = objectMapper;
    this.nucleos = nucleos;
    this.turmas = turmas;
  }

  /** Aceita um perfil ou vários separados por vírgula (ex.: {@code PROFESSOR,ASSISTENTE_SOCIAL}). */
  @GetMapping
  public List<Usuario> list(@RequestParam("perfil") String perfil) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    List<Perfil> perfis;
    try {
      perfis =
          java.util.Arrays.stream(perfil.split(","))
              .map(String::trim)
              .filter(p -> !p.isEmpty())
              .map(Perfil::valueOf)
              .distinct()
              .toList();
    } catch (IllegalArgumentException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "perfil_invalido", "Perfil desconhecido.");
    }
    if (perfis.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "perfil_invalido", "Informe ao menos um perfil.");
    }
    return usuarios.findByPerfilInOrderByNameAsc(perfis).stream()
        .filter(u -> !u.isExcluido())
        .toList();
  }

  public record ExclusaoRequest(String justificativa) {}

  /**
   * Exclusão com justificativa obrigatória e auditoria (regra 7 do escopo). Soft delete: a conta é
   * marcada como excluída/inativa e o registro fica no banco para fins de auditoria.
   */
  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> delete(@PathVariable String id, @RequestBody ExclusaoRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL);
    if (req == null || req.justificativa() == null || req.justificativa().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "justificativa_obrigatoria",
          "A justificativa é obrigatória para excluir um usuário.");
    }
    if (atual.getId().equals(id)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "forbidden", "Você não pode excluir a própria conta.");
    }
    Usuario alvo =
        usuarios
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(HttpStatus.NOT_FOUND, "not_found", "Usuário não encontrado."));
    if (alvo.getPerfil() == Perfil.GESTAO_GERAL) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "forbidden", "Contas de Gestão Geral não podem ser excluídas.");
    }

    ExclusaoUsuario auditoria = new ExclusaoUsuario();
    auditoria.setUserId(alvo.getId());
    auditoria.setUserNome(alvo.getName());
    auditoria.setUserEmail(alvo.getEmail());
    auditoria.setPerfil(alvo.getPerfil().name());
    auditoria.setStatusAnterior(alvo.isAtivo() ? "ATIVO" : "INATIVO");
    auditoria.setExcluidoPor(atual.getId());
    auditoria.setExcluidoPorNome(atual.getName());
    auditoria.setJustificativa(req.justificativa().trim());
    exclusoes.save(auditoria);

    alvo.setExcluido(true);
    alvo.setAtivo(false);
    usuarios.save(alvo);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Usuario updateMultipart(
      @PathVariable String id,
      @RequestParam(value = "name", required = false) String name,
      @RequestParam(value = "nomeSocial", required = false) String nomeSocial,
      @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
    Usuario alvo = loadAndCheckPermission(id);
    if (name != null && !name.isBlank()) alvo.setName(name.trim());
    if (nomeSocial != null) alvo.setNomeSocial(nomeSocial.trim());
    if (avatar != null && !avatar.isEmpty()) alvo.setAvatar(files.store(avatar));
    return usuarios.save(alvo);
  }

  public record UpdateUserRequest(String name, String nomeSocial, Boolean ativo, String turma) {}

  @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Usuario updateJson(
      @PathVariable String id, @org.springframework.web.bind.annotation.RequestBody UpdateUserRequest req) {
    Usuario alvo = loadAndCheckPermission(id);
    if (req.name() != null && !req.name().isBlank()) alvo.setName(req.name().trim());
    if (req.nomeSocial() != null) alvo.setNomeSocial(req.nomeSocial().trim());
    if (req.turma() != null) alvo.setTurma(req.turma());
    if (req.ativo() != null) {
      Usuario atual = CurrentUser.get();
      if (atual.getPerfil() != Perfil.ADMINISTRATIVO && atual.getPerfil() != Perfil.GESTAO_GERAL) {
        throw new ApiException(
            HttpStatus.FORBIDDEN, "forbidden", "Apenas o administrativo pode ativar/inativar contas.");
      }
      alvo.setAtivo(req.ativo());
    }
    return usuarios.save(alvo);
  }

  public record ResetPasswordRequest(String newPassword) {}

  public record TransferirNucleoRequest(String turma) {}

  /** Transfere a aluna para as próximas chamadas sem alterar presenças e faltas históricas. */
  @PatchMapping("/{id}/nucleo")
  @Transactional
  public Usuario transferirNucleo(
      @PathVariable String id, @RequestBody TransferirNucleoRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if (req == null || req.turma() == null || !nucleos.existsByCodigo(req.turma())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "nucleo_invalido", "Selecione um núcleo válido.");
    }
    Usuario aluna = usuarios.findById(id).orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aluna não encontrada."));
    if (aluna.getPerfil() != Perfil.ALUNA_FF) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "perfil_invalido", "A transferência de núcleo é exclusiva para alunas.");
    }
    FichaInscricao ficha = fichas.findFirstByUserIdAndStatus(id, StatusInscricao.APROVADA)
        .or(() -> fichas.findFirstByUserIdOrderByCreatedDesc(id)).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "inscricao_nao_encontrada", "A inscrição da aluna não foi encontrada."));
    if (req.turma().equals(ficha.getTurma())) {
      throw new ApiException(HttpStatus.CONFLICT, "mesmo_nucleo", "A aluna já pertence a este núcleo.");
    }
    aluna.setTurma(req.turma());
    ficha.setTurma(req.turma());
    // Cada núcleo tem uma única turma e não existe passo de alocação: a aluna passa direto para a
    // turma do núcleo de destino. Enquanto esse núcleo não tiver turma aberta, ela fica sem turma
    // e o vínculo é feito quando a turma for criada.
    String turmaDestino =
        nucleos
            .findByCodigo(req.turma())
            .flatMap(n -> turmas.findByNucleoIdOrderByNomeAsc(n.getId()).stream().findFirst())
            .map(Turma::getId)
            .orElse(null);
    aluna.setTurmaId(turmaDestino);
    ficha.setTurmaId(turmaDestino);
    fichas.save(ficha);
    confirmacoes.findFirstByUserIdOrderByCreatedDesc(id).ifPresent(conf -> atualizarTurmaConfirmacao(conf, req.turma()));
    return usuarios.save(aluna);
  }

  private void atualizarTurmaConfirmacao(FichaConfirmacao conf, String turma) {
    try {
      Map<String, Object> secao = conf.getSecao5Dados() == null || conf.getSecao5Dados().isBlank()
          ? new LinkedHashMap<>()
          : objectMapper.readValue(conf.getSecao5Dados(), new TypeReference<>() {});
      secao.put("turma", turma);
      conf.setSecao5Dados(objectMapper.writeValueAsString(secao));
      confirmacoes.save(conf);
    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "transferencia_error", "Não foi possível atualizar a ficha de confirmação.");
    }
  }

  /**
   * Redefinição de senha pela Gestão Geral (para quando a usuária esquece a senha). Contas de
   * Gestão Geral não podem ter a senha redefinida por terceiros — usam a troca da própria senha.
   */
  @PostMapping("/{id}/reset-password")
  public ResponseEntity<Void> resetPassword(
      @PathVariable String id, @RequestBody ResetPasswordRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL);
    if (req == null || req.newPassword() == null || req.newPassword().length() < 8) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "validation_error",
          "A nova senha deve ter pelo menos 8 caracteres.");
    }
    Usuario alvo =
        usuarios
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(HttpStatus.NOT_FOUND, "not_found", "Usuário não encontrado."));
    if (alvo.getPerfil() == Perfil.GESTAO_GERAL && !alvo.getId().equals(atual.getId())) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "forbidden",
          "Contas de Gestão Geral não podem ter a senha redefinida por terceiros.");
    }
    alvo.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    usuarios.save(alvo);
    return ResponseEntity.noContent().build();
  }

  private Usuario loadAndCheckPermission(String id) {
    Usuario atual = CurrentUser.get();
    boolean isAdmin =
        atual.getPerfil() == Perfil.ADMINISTRATIVO || atual.getPerfil() == Perfil.GESTAO_GERAL;
    if (!atual.getId().equals(id) && !isAdmin) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "forbidden", "Você só pode editar o próprio perfil.");
    }
    return usuarios
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Usuário não encontrado."));
  }
}
