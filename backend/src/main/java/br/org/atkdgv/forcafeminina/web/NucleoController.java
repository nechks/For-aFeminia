package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.*;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/nucleos")
public class NucleoController {
  private final NucleoRepository nucleos; private final ProjetoRepository projetos; private final UsuarioRepository usuarios; private final FichaInscricaoRepository inscricoes; private final TurmaRepository turmas; private final PasswordEncoder encoder;
  public NucleoController(NucleoRepository n, ProjetoRepository p, UsuarioRepository u, FichaInscricaoRepository i, TurmaRepository t, PasswordEncoder e){nucleos=n;projetos=p;usuarios=u;inscricoes=i;turmas=t;encoder=e;}
  @GetMapping public List<Nucleo> listar(){ return nucleos.findAllByOrderByNomeAsc(); }
  @PostMapping @Transactional public ResponseEntity<Nucleo> criar(@RequestBody Nucleo n){
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if(n.getProjetoId()==null||n.getProjetoId().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"projeto_obrigatorio","Selecione o projeto do núcleo.");
    Projeto projeto=projetos.findById(n.getProjetoId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"projeto_invalido","Projeto não encontrado."));
    if(!projeto.isAtivo()) throw new ApiException(HttpStatus.BAD_REQUEST,"projeto_inativo","Selecione um projeto ativo.");
    if(n.getNome()==null||n.getNome().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"campos_obrigatorios","Informe o nome do núcleo.");
    String base=n.getNome().trim().toUpperCase().replaceAll("[^A-Z0-9]+","_").replaceAll("(^_|_$)","");
    if(base.length()<3)base="NUCLEO"; if(base.length()>64)base=base.substring(0,64);
    String codigo=base; int sufixo=2; while(nucleos.existsByCodigo(codigo))codigo=base+"_"+(sufixo++);
    n.setCodigo(codigo); n.setNome(n.getNome().trim());
    n.setAtivo(true); nucleos.save(n);
    return ResponseEntity.status(HttpStatus.CREATED).body(n);
  }
  public record ExcluirRequest(String senha){}
  @DeleteMapping("/{id}") @Transactional
  public ResponseEntity<Void> excluir(@PathVariable String id,@RequestBody ExcluirRequest req){
    Usuario gestao=CurrentUser.require(Perfil.GESTAO_GERAL);
    if(req==null||req.senha()==null||!encoder.matches(req.senha(),gestao.getPasswordHash())) throw new ApiException(HttpStatus.FORBIDDEN,"senha_invalida","Senha da Gestão Geral inválida.");
    Nucleo n=nucleos.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"not_found","Núcleo não encontrado."));
    if(turmas.existsByNucleoId(id)) throw new ApiException(HttpStatus.CONFLICT,"nucleo_com_turmas","Exclua as turmas deste núcleo antes de excluí-lo.");
    if(usuarios.existsByTurma(n.getCodigo())||inscricoes.existsByTurma(n.getCodigo())) throw new ApiException(HttpStatus.CONFLICT,"nucleo_em_uso","Este núcleo possui usuários ou inscrições vinculadas e não pode ser excluído.");
    nucleos.delete(n);return ResponseEntity.noContent().build();
  }
}
