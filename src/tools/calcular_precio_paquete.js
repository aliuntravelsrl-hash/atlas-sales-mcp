const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerCalcularPrecioPaquete(server, config) {
  server.tool(
    "calcular_precio_paquete",
    "Calcula el precio total de un paquete hotelero y convierte de USD a DOP. Úsala cuando el cliente pida total final o precio en pesos dominicanos.",
    {
      hotel_id: z.string().describe("ID del hotel en el sistema (UUID)"),
      noches: z.number().int().min(1).describe("Cantidad de noches"),
      adultos: z.number().int().min(1).max(8).describe("Número de adultos"),
      ninos: z.number().int().min(0).max(6).default(0).describe("Número de niños (0 si no aplica)"),
      tasa_venta: z.number().min(0).default(0).describe("Tasa de venta USD/DOP del día (0 para usar la del sistema)"),
      es_proveedor_local: z.boolean().default(false).describe("true si el proveedor factura en DOP con tarifa congelada, false si factura en USD"),
    },
    async ({ hotel_id, noches, adultos, ninos, tasa_venta, es_proveedor_local }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_precio_paquete`,
          {
            p_hotel_id: hotel_id,
            p_noches: noches,
            p_adultos: adultos,
            p_ninos: ninos,
            p_tasa_venta: tasa_venta,
            p_es_proveedor_local_dop: es_proveedor_local,
          },
          getSupabaseAuthHeaders(config)
        );
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  );
}

module.exports = { registerCalcularPrecioPaquete };
