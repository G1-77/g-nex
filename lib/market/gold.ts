

export async function fetchGoldPrice() {
  //simulate realistic fluctuation
  const base = 3300
  const variation = Math.random() * 20 -10

  const price = base + variation

  return {
    symbol: "XAU",
    price_usd: price,
    change_24h: (variation / base) * 130,
    last_updated: new Date().toISOString()
  }
}