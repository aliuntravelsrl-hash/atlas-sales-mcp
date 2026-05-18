const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerCalcularPrecioPaquete(server, config) {
  server.tool(
    "calcular_precio_paquete",
    "Calcula precio total del paquete hotelero y convierte USD a DOP usando tasa oficial del día. Usar cuando el cliente pregunta el precio en pesos dominicanos o cuando el proveedor factura en DOP con tarifa congelada.",
    {
      p_hotel_id: z.string().describe("ID UUID del hotel en el sistema"),
      p_noches: z.number().int().min(1).describe("Cantidad de noches"),
      p_adultos: z.number().int().min(1).max(8).describe("Número de adultos"),
      p_ninos: z.number().int().min(0).max(6).default(0).describe("Número de niños (0 si no aplica)"),
      p_tasa_venta: z.number().min(0).default(0).describe("Tasa de venta USD/DOP del día. Usar 0 para que el sistema use la tasa oficial automáticamente"),
      p_es_proveedor_local_dop: z.boolean().default(false).describe("true si el proveedor factura en DOP con tarifa congelada (ej. OperaHotel). false si factura en USD"),
      p_modo_productivo: z.boolean().default(true).describe("Siempre true en producción. false solo para pruebas internas"),
    },
    async ({ p_hotel_id, p_noches, p_adultos, p_ninos, p_tasa_venta, p_es_proveedor_local_dop, p_modo_productivo }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_precio_paquete`,
          { p_hotel_id, p_noches, p_adultos, p_ninos, p_tasa_venta, p_es_proveedor_local_dop, p_modo_productivo },
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
