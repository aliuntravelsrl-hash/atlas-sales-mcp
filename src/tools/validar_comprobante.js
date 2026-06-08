import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registrarValidarComprobante(server, config) {
  server.tool(
    'validar_comprobante',
    'Registra el comprobante de pago enviado por el cliente. Inserta el pago en atlas_payments con status=pending_review para revisión del Director. NO confirma el depósito ni emite voucher.',
    {
      booking_ref: z.string().describe('Referencia de reserva ALN-XXXXX'),
      evidence_url: z.string().optional().describe('URL de la foto/comprobante (opcional)'),
      notes: z.string().optional().describe('Notas del cliente sobre el comprobante (opcional)'),
    },
    async ({ booking_ref, evidence_url, notes }) => {
      try {
        const body = { p_booking_ref: booking_ref }
        if (evidence_url) body.p_evidence_url = evidence_url
        if (notes) body.p_notes = notes

        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/validar_comprobante`, {
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
