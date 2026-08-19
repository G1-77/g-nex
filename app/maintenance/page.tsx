import { GNEXLogo } from "@/components/brand/GNEXLogo"

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--admin-bg)] px-6 text-center">
      <GNEXLogo height={32} />
      <h1 className="mt-8 text-2xl font-black text-slate-100">Under maintenance</h1>
      <p className="mt-3 max-w-sm text-sm text-[var(--admin-text-dim)]">
        The GNEX platform is undergoing scheduled maintenance. Trading and
        funding are temporarily paused. Please check back shortly.
      </p>
      <a
        href="/login"
        className="mt-8 rounded-lg border border-[var(--admin-border)] px-5 py-2 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
      >
        Go to login
      </a>
    </main>
  )
}