import type { ReactNode } from "react"

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_18px_40px_rgba(68,45,24,0.06)]">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}
