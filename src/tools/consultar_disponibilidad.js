import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registerConsultarDisponibilidad(server, config) {
  server.tool(
    'consultar_disponibilidad',
    'Consulta disponibilidad y tarifas de un hotel Aliun Travel para fechas dadas. Retorna Core1 y Core2. SIEMPRE llamar antes de cotizar.',
    {
      slug: z.string().describe('Slug del hotel, ej: emotions-puerto-plata'),
      check_in: z.string().describe('Fecha entrada YYYY-MM-DD'),
      check_out: z.string().describe('Fecha salida YYYY-MM-DD'),
      adults: z.number().int().min(1).max(8).default(2).describe('Adultos'),
      children: z.number().int().min(0).max(6).default(0).describe('Niños'),
    },
    async ({ slug, check_in, check_out, adults, children }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/consultar_disponibilidad`,
          { p_hotel_slug: slug, p_check_in: check_in, p_check_out: check_out, p_adults: adults, p_children: children },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
