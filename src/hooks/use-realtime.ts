import { useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 10_000

export interface RealtimeEvent<TRecord = Record<string, unknown>> {
  action: string
  record: TRecord
}

/**
 * A API REST (Spring Boot) não possui push de eventos como o antigo PocketBase.
 * Este hook mantém a mesma assinatura das telas, mas atualiza por polling:
 * o callback é chamado periodicamente para recarregar os dados.
 */
export function useRealtime<TRecord = Record<string, unknown>>(
  collectionName: string,
  callback: (data: RealtimeEvent<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      callbackRef.current({ action: 'refresh', record: {} as TRecord })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(id)
  }, [collectionName, enabled])
}

export default useRealtime
