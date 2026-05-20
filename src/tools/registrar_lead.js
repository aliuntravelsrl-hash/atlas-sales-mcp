import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registerRegistrarLead(server, config) {
  server.tool(
    'registrar_lead',
    'Registra un nuevo lead de ventas en el CRM. Llamar cuando un cliente nuevo contacte por WhatsApp o widget.',
    {
      full_name: z.string().describe('Nombre completo del cliente'),
      phone: z.string().describe('Teléfono con código de país'),
      email: z.string().optional().describe('Email opcional'),
      source: z.enum(['widget', 'whatsapp', 'meta_ad', 'referral', 'manual']).describe('Canal de entrada'),
      hotel_interest: z.string().optional().describe('Slug del hotel de interés'),
      check_in: z.string().optional().describe('Fecha check-in YYYY-MM-DD'),
      check_out: z.string().optional().describe('Fecha check-out YYYY-MM-DD'),
      adults: z.number().int().min(1).default(2),
      children: z.number().int().min(0).default(0),
      message: z.string().optional().describe('Mensaje inicial del cliente')
    },
    async (params) => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/crm_leads`, {
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
