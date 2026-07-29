/** Consulta de endereço por CEP na API pública ViaCEP (https://viacep.com.br). */

export interface EnderecoViaCep {
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

/** Aplica a máscara 00000-000 enquanto a usuária digita. */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/**
 * Busca o endereço do CEP (8 dígitos). Retorna null se o CEP for incompleto,
 * inexistente ou se a API estiver fora do ar — o formulário segue preenchível à mão.
 */
export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
    }
  } catch {
    return null
  }
}
