"use client"

// app/admin/community/promotions/page.tsx
// Admin Centre — promotion management for the Home carousel. The React
// component is only the rendering layer; everything here writes to the
// promotions table through /api/admin/promotions (content.manage + audit).

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Megaphone, Plus, Trash2 } from "lucide-react"

import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminButton, AdminPageHeader, AdminPanel, AdminSectionLabel } from "@/components/admin/ui"
import { useAuth } from "@/components/providers/AuthProvider"
import { PRODUCT_ROUTES } from "@/lib/react-query/promotions.queries"

interface Promotion {
  id: string
  title: string
  description: string
  image_url: string | null
  icon_url: string | null
  cta_text: string
  destination_type: "route" | "url" | "product" | "none"
  destination_url: string | null
  product_id: string | null
  enabled: boolean
  display_order: number
  start_at: string | null
  end_at: string | null
}

const EMPTY_DRAFT = {
  title: "",
  description: "",
  cta_text: "Learn more",
  destination_type: "route" as Promotion["destination_type"],
  destination_url: "",
  product_id: "",
  image_url: "",
  icon_url: "",
  display_order: 100,
  start_at: "",
  end_at: "",
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 16)
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-[var(--admin-green)]" : "bg-white/10"
      }`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

function PromotionEditor({ promotion }: { promotion: Promotion }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Promotion>(promotion)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(promotion)

  function setField<K extends keyof Promotion>(key: K, value: Promotion[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      await adminAction("/api/admin/promotions", "PATCH", {
        id: draft.id,
        title: draft.title,
        description: draft.description,
        cta_text: draft.cta_text,
        destination_type: draft.destination_type,
        destination_url: draft.destination_url,
        product_id: draft.product_id,
        image_url: draft.image_url,
        icon_url: draft.icon_url,
        enabled: draft.enabled,
        display_order: draft.display_order,
        start_at: draft.start_at ? new Date(draft.start_at).toISOString() : null,
        end_at: draft.end_at ? new Date(draft.end_at).toISOString() : null,
      })
      setMessage("Saved and audited.")
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] })
      await queryClient.invalidateQueries({ queryKey: ["promotions"] })
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete promotion "${draft.title}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await adminAction(`/api/admin/promotions?id=${encodeURIComponent(draft.id)}`, "DELETE")
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] })
      await queryClient.invalidateQueries({ queryKey: ["promotions"] })
    } catch (e) {
      setMessage((e as Error).message)
      setSaving(false)
    }
  }

  // Lightweight operator preview — what Home users will see.
  const resolvedDestination =
    draft.destination_type === "product"
      ? draft.product_id
        ? PRODUCT_ROUTES[draft.product_id] ?? draft.destination_url ?? "(no route yet)"
        : "(no product selected)"
      : draft.destination_type === "none"
        ? "(informational card)"
        : draft.destination_url || "(not set)"

  return (
    <AdminPanel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-4 w-4 text-[var(--admin-green)]" />
          <span className="font-mono text-xs font-bold text-[var(--admin-text)]">{draft.title || "(untitled)"}</span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
              draft.enabled
                ? "bg-[var(--admin-green-wash)] text-[var(--admin-green)]"
                : "bg-white/5 text-[var(--admin-text-faint)]"
            }`}
          >
            {draft.enabled ? "LIVE" : "OFF"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={draft.enabled} onChange={() => setField("enabled", !draft.enabled)} label="Enable promotion" />
          <button
            onClick={remove}
            disabled={saving}
            className="admin-btn admin-btn-danger cursor-pointer"
            aria-label={`Delete ${draft.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <AdminSectionLabel>Title</AdminSectionLabel>
          <input
            value={draft.title}
            onChange={(e) => setField("title", e.target.value)}
            maxLength={80}
            className="admin-input mt-1 w-full font-mono text-sm"
          />
        </label>

        <label className="block">
          <AdminSectionLabel>CTA text</AdminSectionLabel>
          <input
            value={draft.cta_text}
            onChange={(e) => setField("cta_text", e.target.value)}
            maxLength={40}
            className="admin-input mt-1 w-full font-mono text-sm"
          />
        </label>

        <label className="block md:col-span-2">
          <AdminSectionLabel>Description</AdminSectionLabel>
          <textarea
            value={draft.description}
            onChange={(e) => setField("description", e.target.value)}
            maxLength={200}
            rows={2}
            className="admin-input mt-1 w-full resize-none text-sm"
          />
        </label>

        <label className="block">
          <AdminSectionLabel>Destination type</AdminSectionLabel>
          <select
            value={draft.destination_type}
            onChange={(e) => setField("destination_type", e.target.value as Promotion["destination_type"])}
            className="admin-input mt-1 w-full text-sm"
          >
            <option value="route">Internal route</option>
            <option value="product">GNEX product</option>
            <option value="url">External link (https)</option>
            <option value="none">Informational only</option>
          </select>
        </label>

        <label className="block">
          <AdminSectionLabel>
            {draft.destination_type === "product" ? "Product deep-link hint (optional)" : "Destination"}
          </AdminSectionLabel>
          <input
            value={draft.destination_url ?? ""}
            onChange={(e) => setField("destination_url", e.target.value)}
            placeholder={draft.destination_type === "url" ? "https://…" : "/markets"}
            disabled={draft.destination_type === "none"}
            className="admin-input mt-1 w-full font-mono text-sm disabled:opacity-40"
          />
        </label>

        {draft.destination_type === "product" && (
          <label className="block">
            <AdminSectionLabel>Product slug</AdminSectionLabel>
            <input
              value={draft.product_id ?? ""}
              onChange={(e) => setField("product_id", e.target.value)}
              placeholder="prediction"
              className="admin-input mt-1 w-full font-mono text-sm"
            />
          </label>
        )}

        <label className="block">
          <AdminSectionLabel>Image URL (optional)</AdminSectionLabel>
          <input
            value={draft.image_url ?? ""}
            onChange={(e) => setField("image_url", e.target.value)}
            placeholder="/icons/prediction.svg or Supabase Storage https URL"
            className="admin-input mt-1 w-full text-xs"
          />
        </label>

        <label className="block">
          <AdminSectionLabel>Icon URL (optional)</AdminSectionLabel>
          <input
            value={draft.icon_url ?? ""}
            onChange={(e) => setField("icon_url", e.target.value)}
            className="admin-input mt-1 w-full text-xs"
          />
        </label>

        <label className="block">
          <AdminSectionLabel>Display order (lower first)</AdminSectionLabel>
          <input
            type="number"
            min={0}
            max={999}
            value={draft.display_order}
            onChange={(e) => setField("display_order", Math.max(0, Math.floor(Number(e.target.value))))}
            className="admin-input mt-1 w-full font-mono text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <AdminSectionLabel>Starts</AdminSectionLabel>
            <input
              type="datetime-local"
              value={toDatetimeLocal(draft.start_at)}
              onChange={(e) =>
                setField("start_at", e.target.value ? new Date(e.target.value).toISOString() : null)
              }
              className="admin-input mt-1 w-full text-xs"
            />
          </label>
          <label className="block">
            <AdminSectionLabel>Ends</AdminSectionLabel>
            <input
              type="datetime-local"
              value={toDatetimeLocal(draft.end_at)}
              onChange={(e) =>
                setField("end_at", e.target.value ? new Date(e.target.value).toISOString() : null)
              }
              className="admin-input mt-1 w-full text-xs"
            />
          </label>
        </div>
      </div>

      {/* Operator preview */}
      <div className="mt-4 rounded-lg border border-dashed border-[var(--admin-border)] p-3">
        <p className="text-[10px] uppercase tracking-widest text-[var(--admin-text-faint)]">User preview</p>
        <p className="mt-1 text-sm font-bold text-[var(--admin-text)]">{draft.title || "(untitled)"}</p>
        <p className="text-xs text-[var(--admin-text-dim)]">{draft.description}</p>
        <p className="mt-1.5 text-[10px] text-[var(--admin-text-faint)]">
          [{draft.cta_text}] → {resolvedDestination} · position #{draft.display_order}
          {!draft.enabled && " · hidden while OFF"}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold ${message === "Saved and audited." ? "text-emerald-300" : "text-rose-300"}`}>
          {message}
        </p>
        <AdminButton variant="primary" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </AdminButton>
      </div>
    </AdminPanel>
  )
}

export default function AdminPromotionsPage() {
  const { isSuperAdmin, can } = useAuth()
  const canManage = isSuperAdmin || can("content.manage")
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useAdminQuery<{ promotions: Promotion[] }>("/api/admin/promotions")
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  async function createPromotion() {
    setCreating(true)
    try {
      await adminAction("/api/admin/promotions", "POST", {
        ...draft,
        start_at: draft.start_at ? new Date(draft.start_at).toISOString() : null,
        end_at: draft.end_at ? new Date(draft.end_at).toISOString() : null,
      })
      setDraft(EMPTY_DRAFT)
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] })
      await queryClient.invalidateQueries({ queryKey: ["promotions"] })
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        You need the content.manage permission to manage promotions.
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader
        title="Promotions"
        subtitle="What the Home promotional carousel shows — content, schedule, destinations. Changes go live without a deploy."
      />

      {isLoading && <div className="admin-panel h-40 animate-pulse p-4" />}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      {data?.promotions.map((promotion) => <PromotionEditor key={promotion.id} promotion={promotion} />)}

      {data && data.promotions.length === 0 && !isLoading && (
        <AdminPanel className="p-6 text-center text-sm text-[var(--admin-text-dim)]">
          No promotions yet — create the first campaign below.
        </AdminPanel>
      )}

      {/* New promotion */}
      <AdminPanel className="p-4">
        <AdminSectionLabel className="mb-3">New promotion</AdminSectionLabel>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title (e.g. Play & Predict)"
            maxLength={80}
            className="admin-input w-full font-mono text-sm"
          />
          <input
            value={draft.cta_text}
            onChange={(e) => setDraft({ ...draft, cta_text: e.target.value })}
            placeholder="CTA text (e.g. Explore Prediction)"
            maxLength={40}
            className="admin-input w-full font-mono text-sm"
          />
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Short supporting copy"
            maxLength={200}
            className="admin-input w-full text-sm md:col-span-2"
          />
          <select
            value={draft.destination_type}
            onChange={(e) => setDraft({ ...draft, destination_type: e.target.value as Promotion["destination_type"] })}
            className="admin-input w-full text-sm"
          >
            <option value="route">Internal route</option>
            <option value="product">GNEX product</option>
            <option value="url">External link (https)</option>
            <option value="none">Informational only</option>
          </select>
          <input
            value={draft.destination_url}
            onChange={(e) => setDraft({ ...draft, destination_url: e.target.value })}
            placeholder={draft.destination_type === "url" ? "https://…" : "/markets"}
            disabled={draft.destination_type === "none"}
            className="admin-input w-full font-mono text-sm disabled:opacity-40"
          />
          <input
            type="number"
            min={0}
            max={999}
            value={draft.display_order}
            onChange={(e) => setDraft({ ...draft, display_order: Math.max(0, Math.floor(Number(e.target.value))) })}
            placeholder="Display order"
            className="admin-input w-full font-mono text-sm"
          />
        </div>

        <div className="mt-3 flex items-center justify-end">
          <AdminButton variant="primary" onClick={createPromotion} disabled={creating || draft.title.trim().length < 2}>
            <Plus className="h-3.5 w-3.5" />
            {creating ? "Creating…" : "Create promotion"}
          </AdminButton>
        </div>
      </AdminPanel>

      <p className="text-[10px] text-[var(--admin-text-faint)]">
        Carousel behavior (5s autoplay, swipe, pause-on-touch) is owned by the frontend; this panel owns content,
        ordering and scheduling. Eligibility (enabled + time window) is enforced server-side on every request.
      </p>
    </div>
  )
}
