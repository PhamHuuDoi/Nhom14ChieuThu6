"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-6 py-5 text-sm text-[var(--muted)] shadow-[0_24px_60px_rgba(68,45,24,0.08)]">
          Đang tải không gian quản trị...
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (user.role && user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-[0_24px_60px_rgba(68,45,24,0.08)]">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
            Hạn chế truy cập
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            Khu vực này chỉ dành cho tài khoản quản trị
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Phiên đăng nhập của bạn vẫn đang hoạt động, nhưng tài khoản hiện tại
            không có quyền quản trị.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
