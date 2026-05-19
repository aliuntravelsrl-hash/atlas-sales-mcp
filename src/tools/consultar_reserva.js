import { z } from 'zod'
import { getSupabaseAuthHeaders, wrapError, wrapResult } from '../config.js'

export function registrarConsultarReserva(server, config) {
  server.tool(
    'consultar_reserva',
    'Consulta el estado de una reserva existente por número de referencia o nombre del cliente. Retorna estado, fechas, hotel, monto pagado y saldo pendiente.',
    {
      search_term: z.string().describe('Número de reserva (ej: ALN-12345) o nombre completo del titular'),
    },
    async ({ search_term }) => {
      try {
        const headers = getSupabaseAuthHeaders(config)
        // Search by booking_reference OR lead_guest_name
        const isRef = search_term.startsWith('ALN')
        const filter = isRef
          ? `booking_reference=eq.${encodeURIComponent(search_term)}`
          : `lead_guest_name=ilike.${encodeURIComponent(search_term)}`

        const response = await fetch(
          `${config.supabaseUrl}/rest/v1/bookings?${filter}&select=id,booking_reference,lead_guest_name,hotel_id,status,check_in,check_out,total_amount,currency,payment_status,deposit_amount,created_at`,
          { method: 'GET', headers }
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        const data = await response.json()
        return wrapResult({ found: Array.isArray(data) && data.length > 0, results: data })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
