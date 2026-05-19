import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registrarValidarOcupacionHabitacion(server, config) {
  server.tool(
    'validar_ocupacion_habitacion',
    'Valida si la cantidad de personas excede la capacidad máxima de un tipo de habitación. Úsala siempre antes de cotizar cuando el cliente indique 3+ personas por habitación.',
    {
      hotel_id: z.string().describe('ID del hotel en el sistema (UUID)'),
      room_type: z.string().describe('Tipo de habitación: standard, superior, suite, family, junior_suite'),
      adultos: z.number().int().min(1).max(8).describe('Número de adultos'),
      ninos: z.number().int().min(0).max(6).default(0).describe('Número de niños'),
    },
    async ({ hotel_id, room_type, adultos, ninos }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/validar_ocupacion_habitacion`,
          { p_hotel_id: hotel_id, p_room_type: room_type, p_adultos: adultos, p_ninos: ninos },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
