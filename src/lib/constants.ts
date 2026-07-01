import { StatusInscricao } from '@/lib/types'

export const turmaLabels: Record<string, string> = {
  CENTRO_VITORIA: 'Centro - Vitória',
  AEST_SERRA: 'Clube AEST - Serra',
  ITAQUARI_CARIACICA: 'Itaquari - Cariacica',
  CONJUNTO_CARAPINA_SERRA: 'Conj. Carapina - Serra',
  ATLANTICA_VILLE_VITORIA: 'Atlântica Ville - Vitória',
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
