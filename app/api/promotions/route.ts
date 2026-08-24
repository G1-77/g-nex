// GET /api/promotions
//
// Public feed of currently-eligible promotions for the Home carousel.
// Eligibility (enabled + time window) is resolved HERE on the server with the
// service role — the browser never sees disabled or scheduled campaigns, and
// the client only rotates through this already-fetched collection locally.

import { createServiceClient } from '@/lib/admin/service'

export interface PromotionPayload {
  id: string
  title: string
  description: string
  imageUrl: string | null
  iconUrl: string | null
  ctaText: string
  destinationType: 'route' | 'url' | 'product' | 'none'
  destinationUrl: string | null
  productId: string | null
}

interface PromotionRow {
  id: string
  title: string
  description: string
  image_url: string | null
  icon_url: string | null
  cta_text: string
  destination_type: PromotionPayload['destinationType']
  destination_url: string | null
  product_id: string | null
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data, error } = await service
    .from('promotions')
    .select(
      'id, title, description, image_url, icon_url, cta_text, destination_type, destination_url, product_id'
    )
    .eq('enabled', true)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('display_order', { ascending: true })
    .limit(10)

  if (error) {
    console.error('GNEX promotions query failure:', error.message)
    // Promotions are non-critical Home content — an empty collection lets
    // every other Home section render untouched.
    return Response.json({ promotions: [] satisfies PromotionPayload[] })
  }

  const promotions: PromotionPayload[] = ((data ?? []) as unknown as PromotionRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    iconUrl: row.icon_url,
    ctaText: row.cta_text,
    destinationType: row.destination_type,
    destinationUrl: row.destination_url,
    productId: row.product_id,
  }))

  return Response.json({ promotions }, { headers: { 'Cache-Control': 'no-store' } })
}
