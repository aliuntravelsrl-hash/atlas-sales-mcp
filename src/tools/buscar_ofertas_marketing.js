import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registrarBuscarOfertasMarketing(server, config) {
  server.tool(
    'buscar_ofertas_marketing',
    'Busca ofertas activas de hoteles con stock real. Retorna precio, descuento, fechas disponibles con inventario por fecha, ocupación, condiciones y si acepta depósito.',
    {
      hotel_slug: z.string().nullable().default(null).describe('Slug del hotel para filtrar. null para buscar en todos.'),
      offer_type: z.string().nullable().default(null).describe('Tipo: last_minute, flash_sale, package, early_bird, group. null para todos.'),
      limit: z.number().int().min(1).max(10).default(5).describe('Cantidad máxima de ofertas'),
    },
    async ({ hotel_slug, offer_type, limit }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/buscar_ofertas_marketing`,
          { p_hotel_slug: hotel_slug, p_offer_type: offer_type, p_limit: limit },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
