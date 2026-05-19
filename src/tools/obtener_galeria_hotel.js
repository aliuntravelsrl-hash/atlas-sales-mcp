import { z } from 'zod'
import { getSupabaseAuthHeaders, wrapError, wrapResult } from '../config.js'

export function registerObtenerGaleriaHotel(server, config) {
  server.tool(
    'obtener_galeria_hotel',
    'Obtiene galería de imágenes de un hotel directamente desde Supabase. Retorna URLs de gallery_data para compartir con el cliente.',
    {
      hotel_slug: z.string().describe('Slug del hotel, ej: barcelo-bavaro-beach'),
      limit: z.number().int().min(1).max(20).default(8).describe('Cantidad máxima de imágenes'),
    },
    async ({ hotel_slug, limit }) => {
      try {
        const headers = getSupabaseAuthHeaders(config)
        const response = await fetch(
          `${config.supabaseUrl}/rest/v1/hotels_master?slug=eq.${encodeURIComponent(hotel_slug)}&select=id,name,slug,zone,stars,gallery_data&is_active=eq.true`,
          { method: 'GET', headers }
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        const data = await response.json()
        const hotel = Array.isArray(data) && data.length > 0 ? data[0] : null
        if (!hotel) return wrapResult({ found: false, hotel_slug, images: [] })

        const gallery = Array.isArray(hotel.gallery_data) ? hotel.gallery_data : []
        const images = gallery
          .slice(0, limit)
          .map(img => ({
            url: img.url || img.image || img.public_url || '',
            title: img.title || '',
            scope: img.scope || ''
          }))
          .filter(img => img.url)

        return wrapResult({
          found: true,
          hotel_name: hotel.name,
          zone: hotel.zone,
          stars: hotel.stars,
          total_available: gallery.length,
          images
        })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
