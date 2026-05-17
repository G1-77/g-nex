import { fetchCryptoPrices } from "./coingecko"
import { fetchGoldPrice } from "./gold"

export async function getCurrentPrice(assetId: string): Promise<number> {
  // GOLD fallback
  if (assetId === "XAU" || assetId === "gold") {
    const gold = await fetchGoldPrice()
    return gold.price_usd
  }

  // CRYPTO path (CoinGecko expects ids, not symbols)
  const prices = await fetchCryptoPrices([assetId])

  if (!prices.length) {
    throw new Error("Asset price not found")
  }

  return prices[0].current_price
}