import { z } from 'zod'
import { wrapError, wrapResult } from '../config.js'

export function registrarAnalisisFinanciero(server, config) {
  server.tool(
    'analisis_financiero',
    'Analiza opciones hoteleras o escenarios de viaje en función del presupuesto del cliente. Úsala para comparar valor, rango de precio y viabilidad.',
    {
      analysis_description: z.string().describe('Qué quiere analizar el cliente. Ejemplo: comparar Barcelo Bavaro vs Riu Republica para 2 adultos 5 noches'),
      budget: z.number().min(0).default(0).describe('Presupuesto máximo en USD (0 si no especifica)'),
    },
    async ({ analysis_description, budget }) => {
      try {
        const response = await fetch(`${config.n8nWebhookBase}/webhook/mcp-analisis-financiero`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis_description, budget })
        })
        const result = await response.json()
        return wrapResult({ status: response.status, ...result })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
