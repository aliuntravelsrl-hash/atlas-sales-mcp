import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registrarStalePayments(server, config) {
  server.tool(
    'stale_payments',
    'Lista pagos en estado pending_review estancados más de p_hours horas. Para Mission Control y el briefing de Ariadne (alerta de comprobantes sin confirmar por el Director).',
    {
      hours: z.number().int().positive().default(24).describe('Antigüedad mínima en horas para considerar un pago estancado (default 24)'),
    },
    async ({ hours }) => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/stale_payments`, {
          method: 'POST',
          headers: getSupabaseAuthHeaders(config),
          body: JSON.stringify({ p_hours: hours })
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
