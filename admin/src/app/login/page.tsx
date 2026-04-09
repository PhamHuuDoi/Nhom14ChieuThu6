"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole, Mail } from "lucide-react"

import { useAuth } from "@/context/auth-context"

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\S]{8,50}$/

type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login, refreshUser } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): LoginErrors => {
    const nextErrors: LoginErrors = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      nextErrors.email = "Vui lòng nhập email."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Email chưa đúng định dạng."
    }

    if (!password.trim()) {
      nextErrors.password = "Vui lòng nhập mật khẩu."
    } else if (password.length < 8) {
      nextErrors.password = "Mật khẩu phải có ít nhất 8 ký tự."
    } else if (!/[A-Za-z]/.test(password)) {
      nextErrors.password = "Mật khẩu phải có ít nhất 1 chữ cái."
    } else if (!/\d/.test(password)) {
      nextErrors.password = "Mật khẩu phải có ít nhất 1 chữ số."
    } else if (!PASSWORD_RULE.test(password)) {
      nextErrors.password = "Mật khẩu phải gồm cả chữ và số."
    }

    return nextErrors
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const user = await login({
        email: email.trim(),
        password,
      })

      const currentUser = user.role ? user : await refreshUser()

      if (currentUser?.role && currentUser.role !== "admin") {
        setErrors({
          form: "Tài khoản này không có quyền truy cập trang quản trị.",
        })
        return
      }

      router.replace("/dashboard")
      router.refresh()
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Không thể đăng nhập.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_30px_80px_rgba(68,45,24,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-[linear-gradient(150deg,#5d3417_0%,#8f5a30_45%,#d89d56_100%)] p-8 text-[var(--primary-foreground)] lg:p-10">
          <p className="text-xs uppercase tracking-[0.32em] text-white/70">
            TheZooCoffee
          </p>
          <h1 className="mt-5 max-w-sm text-4xl font-semibold leading-tight">
            Khu vực quản trị dành cho vận hành quán cà phê
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/82">
            Dùng URL quản trị riêng để xử lý sản phẩm, đơn hàng và người dùng mà
            không lẫn với giao diện khách hàng.
          </p>
          <div className="mt-10 grid gap-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-semibold">URL riêng</p>
              <p className="mt-2 text-sm text-white/78">
                Chạy trang này tại <span className="font-semibold">localhost:3001</span>
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-semibold">Dùng chung backend</p>
              <p className="mt-2 text-sm text-white/78">
                Đăng nhập admin dùng chung session và cookie với website chính.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Đăng nhập
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
            Đăng Nhập Quản Trị
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Tiếp tục với tài khoản có quyền quản trị.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Email
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                <Mail className="h-4 w-4 text-[var(--muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setErrors((prev) => ({ ...prev, email: undefined, form: undefined }))
                  }}
                  placeholder="admin@gmail.com"
                  className="w-full border-0 bg-transparent p-0 text-sm text-[var(--foreground)] outline-none"
                />
              </div>
              {errors.email ? (
                <p className="mt-2 text-sm text-[var(--danger)]">{errors.email}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Mật khẩu
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-[var(--muted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((prev) => ({ ...prev, password: undefined, form: undefined }))
                  }}
                  placeholder="Nhập mật khẩu"
                  className="w-full border-0 bg-transparent p-0 text-sm text-[var(--foreground)] outline-none"
                />
              </div>
              {errors.password ? (
                <p className="mt-2 text-sm text-[var(--danger)]">{errors.password}</p>
              ) : null}
            </label>

            {errors.form ? (
              <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                {errors.form}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Vào Trang Quản Trị"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
