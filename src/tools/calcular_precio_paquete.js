import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registrarCalcularPrecioPaquete(server, config) {
  server.tool(
    'calcular_precio_paquete',
    'Calcula precio total del paquete hotelero y convierte USD a DOP usando tasa oficial del día.',
    {
      p_hotel_id: z.string().describe('ID UUID del hotel en el sistema'),
      p_noches: z.number().int().min(1).describe('Cantidad de noches'),
      p_adultos: z.number().int().min(1).max(8).describe('Número de adultos'),
      p_ninos: z.number().int().min(0).max(6).default(0).describe('Número de niños (0 si no aplica)'),
      p_tasa_venta: z.number().min(0).default(0).describe('Tasa de venta USD/DOP. Usar 0 para tasa oficial automática'),
      p_es_proveedor_local_dop: z.boolean().default(false).describe('true si el proveedor factura en DOP con tarifa congelada'),
      p_modo_productivo: z.boolean().default(true).describe('Siempre true en producción'),
    },
    async ({ p_hotel_id, p_noches, p_adultos, p_ninos, p_tasa_venta, p_es_proveedor_local_dop, p_modo_productivo }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_precio_paquete`,
          { p_hotel_id, p_noches, p_adultos, p_ninos, p_tasa_venta, p_es_proveedor_local_dop, p_modo_productivo },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
