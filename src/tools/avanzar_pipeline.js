import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registerAvanzarPipeline(server, config) {
  server.tool(
    'avanzar_pipeline',
    'Avanza un lead a un nuevo stage en el pipeline de ventas. Llamar cuando el cliente progresa en el proceso.',
    {
      lead_id: z.string().uuid().describe('UUID del lead en crm_leads'),
      new_stage: z.enum(['nuevo', 'contactado', 'cotizado', 'negociando', 'confirmada', 'perdido']).describe('Nuevo stage del pipeline'),
      actor: z.string().default('openclaw').describe('Agente que realiza el cambio')
    },
    async ({ lead_id, new_stage, actor }) => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/avanzar_pipeline`, {
          method: 'POST',
          headers: getSupabaseAuthHeaders(config),
          body: JSON.stringify({ p_lead_id: lead_id, p_new_stage: new_stage, p_actor: actor })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  )
}
