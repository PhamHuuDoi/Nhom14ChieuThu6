import type { ReactNode } from "react"

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string
  value: string
  hint: string
  accent: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_18px_40px_rgba(68,45,24,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
          style={{ background: accent }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{hint}</p>
    </div>
  )
}
