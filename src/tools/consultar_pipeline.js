import { z } from 'zod'
import { wrapError, wrapResult, getSupabaseAuthHeaders } from '../config.js'

export function registerConsultarPipeline(server, config) {
  server.tool(
    'consultar_pipeline',
    'Consulta las métricas y estado actual del pipeline de ventas. Útil para reportes al Director.',
    {},
    async () => {
      try {
        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/crm_pipeline_stats`, {
          method: 'POST',
          headers: getSupabaseAuthHeaders(config),
          body: JSON.stringify({})
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
