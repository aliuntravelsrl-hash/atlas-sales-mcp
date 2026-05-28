import { z } from 'zod'
import { getSupabaseAuthHeaders, apiPostJson, wrapError, wrapResult } from '../config.js'

export function registrarCalcularPrecioPaquete(server, config) {
  server.tool(
    'calcular_precio_paquete',
    'Calcula precio total del paquete hotelero y convierte USD a DOP usando tasa oficial del día.',
    {
      hotel_id: z.string().describe('ID UUID del hotel en el sistema'),
      noches: z.number().int().min(1).describe('Cantidad de noches'),
      adultos: z.number().int().min(1).max(8).describe('Número de adultos'),
      ninos: z.number().int().min(0).max(6).default(0).describe('Número de niños (0 si no aplica)'),
      tasa_venta: z.number().min(0).default(0).describe('Tasa de venta USD/DOP. Usar 0 para tasa oficial automática'),
      es_proveedor_local_dop: z.boolean().default(false).describe('true si el proveedor factura en DOP con tarifa congelada'),
      modo_productivo: z.boolean().default(true).describe('Siempre true en producción'),
    },
    async ({ hotel_id, noches, adultos, ninos, tasa_venta, es_proveedor_local_dop, modo_productivo }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_precio_paquete`,
          { hotel_id, noches, adultos, ninos, tasa_venta, es_proveedor_local_dop, modo_productivo },
          getSupabaseAuthHeaders(config)
        )
        return wrapResult(data)
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
