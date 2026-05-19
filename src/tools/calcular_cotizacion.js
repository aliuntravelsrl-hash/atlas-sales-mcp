import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registrarCalcularCotizacion(server, config) {
  server.tool(
    'calcular_cotizacion',
    'Calcula una cotización formal para un hotel y fechas dadas. Usar después de confirmar hotel, fechas y ocupación del cliente.',
    {
      hotel_name_query: z.string().describe('Nombre o parte del nombre del hotel. Ej: "barcelo bavaro palace"'),
      check_in: z.string().describe('Fecha check-in YYYY-MM-DD'),
      check_out: z.string().describe('Fecha check-out YYYY-MM-DD'),
      adults: z.number().int().min(1).max(8).default(2).describe('Número de adultos'),
      children: z.number().int().min(0).max(6).default(0).describe('Número de niños (0 si no aplica)'),
    },
    async ({ hotel_name_query, check_in, check_out, adults, children }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_cotizacion`,
          { hotel_name_query, check_in, check_out, adults, children },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
