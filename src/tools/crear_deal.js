import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registerCrearDeal(server, config) {
  server.tool(
    'crear_deal',
    'Crea un deal/negociación formal para un lead que quiere reservar. Llamar cuando el cliente confirma interés en reservar.',
    {
      lead_id: z.string().uuid().describe('UUID del lead'),
      hotel_slug: z.string().describe('Slug del hotel'),
      check_in: z.string().describe('Fecha check-in YYYY-MM-DD'),
      check_out: z.string().describe('Fecha check-out YYYY-MM-DD'),
      adults: z.number().int().min(1),
      children: z.number().int().min(0).default(0),
      total_usd: z.number().positive().describe('Precio total en USD'),
      margin_pct: z.number().min(0).default(10).describe('Porcentaje de margen Aliun'),
      landing_url: z.string().optional().describe('URL de landing de cotización'),
      cotizacion_id: z.string().optional()
    },
    async (params) => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/crm_deals`, {
          method: 'POST',
          headers: { ...getSupabaseAuthHeaders(config), 'Prefer': 'return=representation' },
          body: JSON.stringify(params)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        return wrapResult(data[0] || data);
      } catch (error) {
        return wrapError(error);
      }
    }
  )
}
