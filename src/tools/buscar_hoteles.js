import { z } from 'zod'
import { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } from '../config.js'

export function registerBuscarHoteles(server, config) {
  server.tool(
    'buscar_hoteles',
    'Busca hoteles por destino, amenidades o preferencias usando búsqueda semántica sobre el catálogo activo. Retorna hotel_id, hotel_name y contenido relevante para continuar con consultar_disponibilidad.',
    {
      destination: z.string().describe('Destino o preferencia de búsqueda. Ejemplos: "punta cana todo incluido familia", "puerto plata adults only", "samana playa tranquila"'),
      limit: z.number().int().min(1).max(10).default(5).describe('Cantidad máxima de resultados'),
    },
    async ({ destination, limit }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/search_hotels_text`,
          { query_text: destination, match_count: limit },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult({ source: 'search_hotels_text', query: destination, results: data })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
