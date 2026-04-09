'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const resolvedTitle = title || "Thông báo"
        const resolvedDescription =
          description || "Đã xảy ra sự cố. Vui lòng thử lại."

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              <ToastTitle>{resolvedTitle}</ToastTitle>
              <ToastDescription>{resolvedDescription}</ToastDescription>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
