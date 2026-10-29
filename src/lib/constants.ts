import { PerfilUsuario, StatusInscricao } from '@/lib/types'

/**
 * Nome humano de cada perfil. O valor guardado é um código técnico (`ALUNA_FF`) e nunca deve
 * aparecer na interface.
 */
export const perfilLabels: Readonly<Record<PerfilUsuario, string>> = Object.freeze({
  ALUNA_FF: 'Aluna',
  PROFESSOR: 'Professor(a)',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  ADMINISTRATIVO: 'Administrativo',
  GESTAO_GERAL: 'Gestão Geral',
})

export const formatarPerfil = (perfil?: string | null) =>
  perfil ? (perfilLabels[perfil as PerfilUsuario] ?? perfil) : '—'

/**
 * Nomes dos núcleos históricos do projeto. Servem de base para que inscrições antigas nunca
 * exibam o código técnico (ex.: `AEST_SERRA`) quando o núcleo correspondente ainda não foi
 * cadastrado no backend. Os núcleos vindos da API sobrescrevem estes rótulos.
 */
export const NUCLEOS_PADRAO: Readonly<Record<string, string>> = Object.freeze({
  CENTRO_VITORIA: 'Centro - Vitória',
  AEST_SERRA: 'Clube AEST - Serra',
  ITAQUARI_CARIACICA: 'Itaquari - Cariacica',
  CONJUNTO_CARAPINA_SERRA: 'Conj. Carapina I - Serra',
  ATLANTICA_VILLE_VITORIA: 'Atlântica Ville - Vitória',
})

// Começa com os nomes padrão e recebe os núcleos cadastrados no backend na inicialização.
export const turmaLabels: Record<string, string> = { ...NUCLEOS_PADRAO }

/**
 * Núcleos que realmente existem no backend, preenchidos na inicialização. É esta a lista que os
 * seletores devem oferecer: `turmaLabels` também guarda os nomes padrão, que servem apenas para
 * traduzir códigos de inscrições antigas e não correspondem a núcleos cadastrados — oferecê-los
 * para escolha gerava opções repetidas e consultas que nunca encontram ninguém.
 */
export const nucleosCadastrados: { codigo: string; nome: string }[] = []

/**
 * Nome humano do núcleo. O fallback evita expor códigos técnicos enquanto os rótulos ainda
 * estão carregando e também melhora registros legados que perderam letras acentuadas no código.
 */
export const formatarNucleo = (codigo?: string | null) => {
  if (!codigo) return '—'
  const rotulo = turmaLabels[codigo]
  if (rotulo) return rotulo
  return codigo
    .split('_')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLocaleLowerCase('pt-BR'))
    .join(' ')
}

export const statusInfo: Record<StatusInscricao, { label: string; color: string }> = {
  AGUARDANDO: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  APROVADA: { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  REPROVADA: { label: 'Reprovada', color: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
  EM_ANALISE: { label: 'Em Análise', color: 'bg-sky-100 text-sky-800 hover:bg-sky-100' },
  LISTA_ESPERA: {
    label: 'Lista de Espera',
    color: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-200 text-gray-700 hover:bg-gray-200' },
}

export const getStatusInfo = (status: string | undefined) =>
  statusInfo[status as StatusInscricao] ?? {
    label: status ?? '—',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  }

export const confirmacaoStatusInfo: Record<string, { label: string; color: string }> = {
  PREENCHIDA: {
    label: 'Preenchida',
    color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  },
  EM_REVISAO: { label: 'Em Revisão', color: 'bg-sky-100 text-sky-800 hover:bg-sky-100' },
}

export const getConfirmacaoStatusInfo = (status: string | undefined) =>
  confirmacaoStatusInfo[status ?? ''] ?? {
    label: status ?? '—',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  }

export const tipoAtendimentoLabels: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  GRUPAL: 'Grupal',
  FAMILIAR: 'Familiar',
  ENCAMINHAMENTO: 'Encaminhamento',
}

export const getTipoAtendimentoLabel = (tipo: string | undefined) =>
  tipoAtendimentoLabels[tipo ?? ''] ?? tipo ?? '—'
