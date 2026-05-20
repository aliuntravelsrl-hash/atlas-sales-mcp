import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registerRegistrarActividad(server, config) {
  server.tool(
    'registrar_actividad',
    'Registra una actividad o nota en el historial de un lead. Llamar después de cada interacción importante.',
    {
      lead_id: z.string().uuid().describe('UUID del lead'),
      type: z.enum(['nota', 'llamada', 'whatsapp', 'cotizacion', 'email', 'sistema']).describe('Tipo de actividad'),
      content: z.string().describe('Descripción de la actividad o nota'),
      cotizacion_id: z.string().optional().describe('ID de cotización si aplica')
    },
    async ({ lead_id, type, content, cotizacion_id }) => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/crm_activities`, {
          method: 'POST',
          headers: { ...getSupabaseAuthHeaders(config), 'Prefer': 'return=representation' },
          body: JSON.stringify({ lead_id, type, content, cotizacion_id, created_by: 'openclaw' })
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
