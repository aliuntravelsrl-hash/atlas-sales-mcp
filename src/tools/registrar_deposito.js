import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registrarRegistrarDeposito(server, config) {
  server.tool(
    'registrar_deposito',
    'Confirma un depósito recibido (solo con aprobación del Director). Ejecuta la RPC registrar_deposito en Supabase para actualizar el estado del pago. La emisión del voucher/PDF es un paso SEPARADO posterior (Liberar Voucher).',
    {
      booking_ref: z.string().describe('Referencia de reserva ALN-XXXXX'),
      monto: z.number().positive().describe('Monto del depósito en USD'),
      metodo: z.enum(['transfer', 'cash', 'card_azul', 'card_paypal']).describe('Método de pago'),
      notas: z.string().optional().describe('Notas del depósito (opcional)'),
    },
    async ({ booking_ref, monto, metodo, notas }) => {
      try {
        const body = {
          p_booking_ref: booking_ref,
          p_monto: monto,
          p_metodo: metodo
        }
        if (notas) body.p_notas = notas

        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/registrar_deposito`, {
          method: 'POST',
          headers: getSupabaseAuthHeaders(config, { write: true }),
          body: JSON.stringify(body)
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        const data = await response.json()
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
