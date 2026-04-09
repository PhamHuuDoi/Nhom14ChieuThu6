import { io, type Socket } from "socket.io-client"

const SOCKET_EVENTS = {
  ADMIN_NEW_ORDER: "admin:new-order",
  ADMIN_ORDER_STATUS_UPDATED: "admin:order-status-updated",
  ADMIN_NOTIFICATION_CREATED: "admin:notification-created",
} as const

const resolveSocketUrl = () => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!configuredBaseUrl) {
    return "http://localhost:5000"
  }

  if (configuredBaseUrl.startsWith("/")) {
    if (typeof window !== "undefined") {
      const { hostname } = window.location
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:5000"
      }
    }

    return configuredBaseUrl.replace(/\/api\/?$/, "") || ""
  }

  return configuredBaseUrl.replace(/\/api\/?$/, "")
}

let socket: Socket | null = null

export function getAdminSocket() {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    })
  }

  return socket
}

export { SOCKET_EVENTS }
