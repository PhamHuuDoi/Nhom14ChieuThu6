import { io, type Socket } from "socket.io-client"

const SOCKET_EVENTS = {
  USER_ORDER_STATUS_UPDATED: "user:order-status-updated",
  USER_NOTIFICATION_CREATED: "user:notification-created",
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

export function getClientSocket() {
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
