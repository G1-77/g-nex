import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import {
  SETTING_KEYS,
  SETTING_DEFAULTS,
  getPlatformSettings,
  upsertPlatformSetting,
  type SettingKey,
} from "@/lib/admin/settings"

const VALIDATORS: Record<SettingKey, (value: unknown) => boolean> = {
  // Fee convention (unified): fractions — 0.02 = 2%, 0.03 = 3%. Hard ceiling
  // 20% keeps a fat-fingered "20" from becoming a 2000% fee.
  trading_fee_pct: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 0.2,
  max_withdraw_pct: (v) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1,
  withdrawal_fee_rate: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 0.2,
  deposit_min_kes: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
  deposit_max_kes: (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
  maintenance_mode: (v) => typeof v === "boolean",
  payment_providers: (v) =>
    Array.isArray(v) && v.every((p) => typeof p === "string") &&
    (v as string[]).every((p) => ["mpesa", "airtel"].includes(p)),
  supported_assets: (v) =>
    Array.isArray(v) && v.every((a) => typeof a === "string") &&
    (v as string[]).every((a) => ["BTC", "ETH", "SOL", "XRP", "USDT", "XAU"].includes(a)),
  trading_enabled: (v) => typeof v === "boolean",
  quick_trade_enabled: (v) => typeof v === "boolean",
  spot_enabled: (v) => typeof v === "boolean",
  ftt_enabled: (v) => typeof v === "boolean",
  min_trade_usd: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
  max_trade_usd: (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
  max_leverage: (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100,
}

export async function GET() {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "settings.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const stored = await getPlatformSettings(service)
  const settings = Object.fromEntries(
    (Object.keys(SETTING_KEYS) as SettingKey[]).map((key) => [
      key,
      stored[key] ?? SETTING_DEFAULTS[key],
    ])
  )

  return Response.json({ settings })
}

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "settings.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const updates: Record<string, unknown> = body.settings ?? {}

  const before = await getPlatformSettings(service)
  const applied: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    const settingKey = key as SettingKey
    if (!(settingKey in VALIDATORS)) {
      return new Response(`Unknown setting: ${key}`, { status: 400 })
    }
    const validator = VALIDATORS[settingKey]
    if (!validator(value)) {
      return new Response(`Invalid value for ${key}`, { status: 400 })
    }
    const { error } = await upsertPlatformSetting(service, settingKey, value, ctx.userId)
    if (error) return new Response(error, { status: 500 })
    applied[key] = value
  }

  if (Object.keys(applied).length > 0) {
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "settings.update",
      targetTable: "platform_settings",
      oldValue: Object.fromEntries(Object.entries(before).filter(([k]) => k in applied)),
      newValue: applied,
    })
  }

  return Response.json({ success: true, applied })
}