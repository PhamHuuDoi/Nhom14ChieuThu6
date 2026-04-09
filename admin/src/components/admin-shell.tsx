"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Boxes,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FlaskConical,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Trash2,
  TicketPercent,
  Users,
} from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { LocationSearch } from "@/components/location-search"
import { type OpenStreetMapLocationSelection } from "@/lib/openstreetmap"
import { getAdminSocket, SOCKET_EVENTS } from "@/lib/socket"
import authService from "@/services/auth.service"
import notificationService from "@/services/notification.service"
import shippingService from "@/services/shipping.service"

const ADMIN_SIDEBAR_REFRESH_INTERVAL_MS = 10000

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/categories", label: "Danh mục", icon: FolderTree },
  { href: "/products", label: "Sản phẩm", icon: Boxes },
  { href: "/recipes", label: "Công thức", icon: FlaskConical },
  { href: "/inventory", label: "Kho nguyên liệu", icon: Package },
  { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/coupons", label: "Mã giảm giá", icon: TicketPercent },
  { href: "/users", label: "Người dùng", icon: Users },
]

type StoreLocation = {
  id: number
  name: string
  phone?: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  is_primary?: boolean
}

type AdminNotification = {
  id: number
  title: string
  message: string
  is_read?: boolean | null
  is_deleted?: boolean | null
  created_at?: string
  orders?: {
    id: number
    order_code: string
    order_status: string
    payment_status: string
  } | null
}

function formatStoreLocation(location: Partial<StoreLocation> | null | undefined) {
  if (!location) {
    return "Chưa có địa chỉ cửa hàng"
  }

  return [
    location.address,
  ]
    .filter(Boolean)
    .join(", ")
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, refreshUser } = useAuth()
  const [shopName, setShopName] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([])
  const [isSavingPickupAddress, setIsSavingPickupAddress] = useState(false)
  const [isSavingAdditionalLocation, setIsSavingAdditionalLocation] =
    useState(false)
  const [isAddressPanelOpen, setIsAddressPanelOpen] = useState(false)
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null)
  const [pickupMessage, setPickupMessage] = useState("")
  const [pickupError, setPickupError] = useState("")
  const [selectedGooglePlace, setSelectedGooglePlace] =
    useState<OpenStreetMapLocationSelection | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [showReadNotifications, setShowReadNotifications] = useState(false)
  const activeStoreLocation =
    storeLocations.find((location) => location.id === activeLocationId) ??
    storeLocations.find((location) => location.is_primary) ??
    null
  const pendingConfirmationNotifications = notifications.filter(
    (notification) => notification.orders?.order_status === "pending"
  )
  const allPendingOrders = useMemo(
    () =>
      Array.from(
        new Map(
          pendingConfirmationNotifications
            .sort((left, right) => Number(right.id) - Number(left.id))
            .map((notification) => [
              notification.orders?.id ?? notification.id,
              {
                id: notification.orders?.id ?? notification.id,
                order_code: notification.orders?.order_code || "Đơn hàng chờ xác nhận",
                order_status: notification.orders?.order_status || "pending",
                payment_status: notification.orders?.payment_status || "unpaid",
              },
            ])
        ).values()
      ),
    [pendingConfirmationNotifications]
  )
  const getPendingNotificationByOrderId = useCallback(
    (orderId: number) =>
      pendingConfirmationNotifications.find(
        (notification) => notification.orders?.id === orderId
      ),
    [pendingConfirmationNotifications]
  )
  const unreadPendingOrders = useMemo(
    () =>
      allPendingOrders.filter((order) => {
        const matchedNotification = getPendingNotificationByOrderId(Number(order.id))
        return !matchedNotification || !matchedNotification.is_read
      }),
    [allPendingOrders, getPendingNotificationByOrderId]
  )
  const readPendingOrders = useMemo(
    () =>
      allPendingOrders.filter((order) => {
        const matchedNotification = getPendingNotificationByOrderId(Number(order.id))
        return Boolean(matchedNotification?.is_read)
      }),
    [allPendingOrders, getPendingNotificationByOrderId]
  )

  const handleGooglePlaceSelect = async (place: OpenStreetMapLocationSelection) => {
    setSelectedGooglePlace(place)
    setPickupAddress(place.addressLine || place.formattedAddress)
    setPickupError("")
    setPickupMessage("")
  }

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }

    try {
      const data = await notificationService.getAdminNotifications()
      setNotifications(data as AdminNotification[])
    } catch {
      setNotifications([])
    }
  }, [user])

  const applyStoreLocationToForm = (location: StoreLocation) => {
    setShopName(location.name ?? "")
    setPickupAddress(location.address ?? "")
    setSelectedGooglePlace(
      location.address
        ? {
            placeId: null,
            formattedAddress: location.address || "",
            addressLine: location.address || "",
            provinceName: "",
            districtName: "",
            wardName: "",
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
          }
        : null
    )
  }

  useEffect(() => {
    setShopName(user?.name ?? "")
    setPickupAddress(user?.address ?? "")
    setSelectedGooglePlace(
      user?.address
        ? {
            placeId: null,
            formattedAddress: user?.address || "",
            addressLine: user?.address || "",
            provinceName: "",
            districtName: "",
            wardName: "",
            latitude: user?.latitude ?? null,
            longitude: user?.longitude ?? null,
          }
        : null
    )
  }, [user])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications, pathname])

  useEffect(() => {
    const handleAdminOrdersUpdated = () => {
      void loadNotifications()
    }

    window.addEventListener("admin-orders-updated", handleAdminOrdersUpdated)
    return () => {
      window.removeEventListener("admin-orders-updated", handleAdminOrdersUpdated)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!user) {
      return
    }

    const socket = getAdminSocket()
    const handleRealtimeSync = () => {
      void loadNotifications()
    }
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications()
      }
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNotifications()
      }
    }, ADMIN_SIDEBAR_REFRESH_INTERVAL_MS)

    socket.connect()
    socket.on(SOCKET_EVENTS.ADMIN_NEW_ORDER, handleRealtimeSync)
    socket.on(SOCKET_EVENTS.ADMIN_ORDER_STATUS_UPDATED, handleRealtimeSync)
    socket.on(SOCKET_EVENTS.ADMIN_NOTIFICATION_CREATED, handleRealtimeSync)
    document.addEventListener('visibilitychange', handleVisibilitySync)

    return () => {
      socket.off(SOCKET_EVENTS.ADMIN_NEW_ORDER, handleRealtimeSync)
      socket.off(SOCKET_EVENTS.ADMIN_ORDER_STATUS_UPDATED, handleRealtimeSync)
      socket.off(SOCKET_EVENTS.ADMIN_NOTIFICATION_CREATED, handleRealtimeSync)
      document.removeEventListener('visibilitychange', handleVisibilitySync)
      window.clearInterval(intervalId)
      socket.disconnect()
    }
  }, [loadNotifications, user])

  const handleMarkNotificationAsRead = async (notificationId: number) => {
    try {
      const updatedNotification =
        await notificationService.markAdminNotificationAsRead(notificationId)
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === updatedNotification.id
            ? (updatedNotification as AdminNotification)
            : notification
        )
      )
    } catch {
      // Ignore quiet sidebar action failure.
    }
  }

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAdminNotificationsAsRead()
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.is_read
            ? notification
            : {
                ...notification,
                is_read: true,
              }
        )
      )
    } catch {
      // Ignore quiet sidebar action failure.
    }
  }

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await notificationService.deleteAdminNotification(notificationId)
      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.id !== notificationId)
      )
    } catch {
      // Ignore quiet sidebar action failure.
    }
  }

  const handleClearNotifications = async () => {
    const hasUnreadNotifications = unreadPendingOrders.length > 0

    if (
      hasUnreadNotifications &&
      !window.confirm('Vẫn còn đơn chờ xác nhận chưa đọc. Bạn có chắc muốn xóa tất cả thông báo không?')
    ) {
      return
    }

    try {
      await notificationService.clearAdminNotifications()
      setNotifications([])
      setShowReadNotifications(false)
    } catch {
      // Ignore quiet sidebar action failure.
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadStoreLocations = async () => {
      if (!user) {
        if (isMounted) {
          setStoreLocations([])
          setActiveLocationId(null)
        }
        return
      }

      try {
        const locations = await shippingService.getStoreLocations()

        if (!isMounted) return

        setStoreLocations(locations)
        setActiveLocationId(
          locations.find((location) => location.is_primary)?.id ?? null
        )
      } catch {
        if (isMounted) {
          setStoreLocations([])
          setActiveLocationId(null)
        }
      }
    }

    void loadStoreLocations()

    return () => {
      isMounted = false
    }
  }, [user])


  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const validateStoreLocationForm = (emptyNameMessage: string) => {
    if (!shopName.trim()) {
      setPickupError(emptyNameMessage)
      setPickupMessage("")
      return false
    }

    if (!pickupAddress.trim()) {
      setPickupError("Vui lòng nhập địa chỉ chi tiết của cửa hàng.")
      setPickupMessage("")
      return false
    }

    if (!selectedGooglePlace?.latitude || !selectedGooglePlace?.longitude) {
      setPickupError("Vui lòng chọn địa điểm trên bản đồ để lưu tọa độ cửa hàng.")
      setPickupMessage("")
      return false
    }

    return true
  }

  const handleSavePickupAddress = async () => {
    if (!validateStoreLocationForm("Vui lòng nhập tên cửa hàng trước khi lưu.")) {
      return
    }

    setIsSavingPickupAddress(true)
    setPickupError("")
    setPickupMessage("")

    try {
      await authService.updateProfile({
        name: shopName.trim(),
        phone: user?.phone ?? "",
        address: pickupAddress.trim(),
        latitude: selectedGooglePlace?.latitude || undefined,
        longitude: selectedGooglePlace?.longitude || undefined,
      })

      await refreshUser()
      setStoreLocations((currentLocations) =>
        currentLocations.map((location) =>
          location.is_primary
            ? {
                ...location,
                name: shopName.trim(),
                phone: user?.phone ?? "",
                address: pickupAddress.trim(),
                latitude: selectedGooglePlace?.latitude || null,
                longitude: selectedGooglePlace?.longitude || null,
              }
            : location
        )
      )
      setPickupMessage("Đã lưu địa chỉ cửa hàng và đồng bộ vị trí giao hàng.")
    } catch (error) {
      setPickupError(
        error instanceof Error ? error.message : "Không thể lưu địa chỉ cửa hàng."
      )
    } finally {
      setIsSavingPickupAddress(false)
    }
  }

  const handleAddStoreLocation = async () => {
    if (!validateStoreLocationForm("Vui lòng nhập tên cửa hàng trước khi thêm địa chỉ.")) {
      return
    }

    setIsSavingAdditionalLocation(true)
    setPickupError("")
    setPickupMessage("")

    try {
      const createdLocation = await shippingService.createStoreLocation({
        name: shopName.trim(),
        phone: user?.phone ?? "",
        address: pickupAddress.trim(),
        latitude: selectedGooglePlace?.latitude || undefined,
        longitude: selectedGooglePlace?.longitude || undefined,
      })

      setStoreLocations((currentLocations) => [createdLocation, ...currentLocations])
      setPickupMessage("Đã thêm địa chỉ cửa hàng mới.")
    } catch (error) {
      setPickupError(
        error instanceof Error ? error.message : "Không thể thêm địa chỉ cửa hàng."
      )
    } finally {
      setIsSavingAdditionalLocation(false)
    }
  }

  const handleSelectStoreLocation = async (location: StoreLocation) => {
    setActiveLocationId(location.id)
    setPickupError("")
    setPickupMessage("")

    try {
      await shippingService.setPrimaryStoreLocation(location.id)
      await refreshUser()
      applyStoreLocationToForm({
        ...location,
        is_primary: true,
      })
      setStoreLocations((currentLocations) =>
        currentLocations.map((currentLocation) => ({
          ...currentLocation,
          is_primary: currentLocation.id === location.id,
        }))
      )
      setPickupMessage("Đã chuyển sang địa chỉ cửa hàng này.")
    } catch (error) {
      setActiveLocationId(
        storeLocations.find((currentLocation) => currentLocation.is_primary)?.id ??
          null
      )
      setPickupError(
        error instanceof Error ? error.message : "Không thể chọn địa chỉ cửa hàng."
      )
    }
  }

  const storeLocationPanel = (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(68,45,24,0.06)]">
      <button
        type="button"
        onClick={() => setIsAddressPanelOpen((currentValue) => !currentValue)}
        className="flex w-full flex-col gap-4 text-left lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Địa chỉ cửa hàng
            </p>
            <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--foreground)]">
              {storeLocations.length} địa chỉ đã lưu
            </span>
            {activeStoreLocation ? (
              <span className="rounded-full bg-[rgba(46,125,91,0.12)] px-3 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                Đang dùng giao hàng
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="min-w-0 rounded-3xl bg-[linear-gradient(135deg,rgba(109,63,31,0.08)_0%,rgba(168,107,59,0.14)_100%)] p-5">
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {activeStoreLocation?.name || shopName || "TheZooCoffee"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {formatStoreLocation(activeStoreLocation)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Địa chỉ đang dùng sẽ hiển thị ngoài client và làm điểm tính phí giao hàng.
              </p>
            </div>
          </div>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl border border-[var(--border)] bg-white text-[var(--foreground)] lg:self-start">
          {isAddressPanelOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {isAddressPanelOpen ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="rounded-3xl border border-[var(--border)] bg-white p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    Cập nhật địa chỉ cửa hàng
                  </h3>
                </div>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Sửa nhanh tên shop và địa chỉ đang dùng.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                    Tên cửa hàng
                  </span>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(event) => setShopName(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm outline-none"
                    placeholder="Nhập tên cửa hàng"
                  />
                </label>

                <LocationSearch onSelect={handleGooglePlaceSelect} />

                {selectedGooglePlace?.formattedAddress ? (
                  <div className="sm:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">
                      Địa điểm đã chọn
                    </p>
                    <p className="mt-1 leading-6">
                      {selectedGooglePlace.formattedAddress}
                    </p>
                  </div>
                ) : null}

                {pickupError ? (
                  <div className="sm:col-span-2 rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                    {pickupError}
                  </div>
                ) : null}

                {pickupMessage ? (
                  <div className="sm:col-span-2 rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">
                    {pickupMessage}
                  </div>
                ) : null}

                <div className="sm:col-span-2 grid gap-3 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleSavePickupAddress}
                    disabled={isSavingPickupAddress}
                    className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingPickupAddress
                      ? "Đang lưu địa chỉ cửa hàng..."
                      : "Lưu địa chỉ cửa hàng"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddStoreLocation}
                    disabled={isSavingAdditionalLocation}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingAdditionalLocation
                      ? "Đang thêm địa chỉ mới..."
                      : "Thêm địa chỉ mới"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    Địa chỉ đã lưu
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                  {storeLocations.length}
                </span>
              </div>

              {storeLocations.length ? (
                <div className="mt-4 grid gap-3">
                  {storeLocations.map((location) => (
                    <div
                      key={location.id}
                      className={`rounded-2xl border p-4 transition ${
                        activeLocationId === location.id
                          ? "border-[var(--primary)] bg-[rgba(109,63,31,0.06)] shadow-[0_14px_30px_rgba(109,63,31,0.08)]"
                          : "border-[var(--border)] bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {location.name}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                              {formatStoreLocation(location)}
                            </p>
                          </div>
                          {activeLocationId === location.id ? (
                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                              Đang dùng
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectStoreLocation(location)}
                          disabled={activeLocationId === location.id}
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-default disabled:bg-[var(--panel-strong)] disabled:text-[var(--muted)]"
                        >
                          {activeLocationId === location.id
                            ? "Đang dùng giao hàng"
                            : "Đặt làm địa chỉ giao hàng"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                  Chưa có địa chỉ cửa hàng nào được lưu.
                </div>
              )}
            </div>
          </div>
      ) : null}
    </section>
  )

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1560px] gap-4 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(68,45,24,0.08)]">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#6d3f1f_0%,#a86b3b_100%)] p-5 text-[var(--primary-foreground)]">
            <p className="text-xs uppercase tracking-[0.32em] text-white/70">
              {shopName || "TheZooCoffee"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Trang quản trị</h1>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Khu vực riêng để quản lý vận hành, sản phẩm, công thức, đơn hàng và mã giảm giá.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isOrdersItem = item.href === "/orders"

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_16px_30px_rgba(109,63,31,0.22)]"
                      : "text-[var(--foreground)] hover:bg-[var(--panel-strong)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition ${
                      isActive
                        ? "text-[var(--primary-foreground)]"
                        : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isOrdersItem && unreadPendingOrders.length > 0 ? (
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                      {unreadPendingOrders.length}
                    </span>
                  ) : null}
                </Link>
              )
            })}

            <button
              type="button"
              onClick={() => setIsAddressPanelOpen((currentValue) => !currentValue)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isAddressPanelOpen
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_16px_30px_rgba(109,63,31,0.22)]"
                  : "text-[var(--foreground)] hover:bg-[var(--panel-strong)]"
              }`}
            >
              <MapPin
                className={`h-4 w-4 transition ${
                  isAddressPanelOpen
                    ? "text-[var(--primary-foreground)]"
                    : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                }`}
              />
              <span className="flex-1 text-left">Địa chỉ cửa hàng</span>
              <ChevronDown
                className={`h-4 w-4 transition ${
                  isAddressPanelOpen ? "rotate-180 text-[var(--primary-foreground)]" : "text-[var(--muted)]"
                }`}
              />
            </button>
          </nav>

          <div className="mt-4 min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Đang đăng nhập
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-[var(--muted)]">
              {user?.email}
            </p>
            <p className="mt-2 break-words text-sm font-medium leading-6 text-[var(--foreground)]">
              Vai trò: {user?.role || "admin"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </aside>

        <div className="space-y-4">
          <header className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,253,248,0.85)] px-6 py-5 shadow-[0_24px_60px_rgba(68,45,24,0.06)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                  Trung tâm điều hành
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Toàn cảnh vận hành cửa hàng
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsNotificationPanelOpen((currentValue) => !currentValue)
                  }
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(68,45,24,0.06)] transition hover:border-[var(--primary)]"
                >
                  <span className="rounded-2xl bg-[var(--panel)] p-2 text-[var(--foreground)]">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      Thông báo
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {unreadPendingOrders.length > 0
                        ? `${unreadPendingOrders.length} đơn chờ xác nhận`
                        : "Không có thông báo mới"}
                    </p>
                  </div>
                  {unreadPendingOrders.length > 0 ? (
                    <span className="rounded-full bg-[var(--primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary-foreground)]">
                      {unreadPendingOrders.length}
                    </span>
                  ) : null}
                </button>

                <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                  URL quản trị:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    localhost:3001
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-4">
            {isAddressPanelOpen ? storeLocationPanel : null}
            <main>{children}</main>
          </div>
        </div>
      </div>

      {isNotificationPanelOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[rgba(30,22,16,0.18)] backdrop-blur-[2px]"
          onClick={() => setIsNotificationPanelOpen(false)}
        >
          <aside
            className="absolute right-4 top-4 h-[calc(100vh-2rem)] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-[32px] border border-[var(--border)] bg-[rgba(255,253,248,0.97)] p-4 shadow-[0_28px_70px_rgba(68,45,24,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Thông báo
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {unreadPendingOrders.length > 0
                    ? `${unreadPendingOrders.length} đơn chờ xác nhận`
                    : "Không có thông báo mới"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadPendingOrders.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleMarkAllNotificationsAsRead()
                    }}
                    className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    Đọc tất cả
                  </button>
                ) : null}
                {allPendingOrders.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleClearNotifications()
                    }}
                    className="rounded-2xl border border-[rgba(157,49,49,0.2)] px-3 py-2 text-xs font-semibold text-[var(--danger)] transition hover:bg-[rgba(157,49,49,0.08)]"
                  >
                    Xóa tất cả
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsNotificationPanelOpen(false)}
                  className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {unreadPendingOrders.length > 0 ? (
                unreadPendingOrders.map((pendingOrder) => {
                  const matchedNotification = getPendingNotificationByOrderId(
                    Number(pendingOrder.id)
                  )

                  return (
                    <div
                      key={pendingOrder.id}
                      className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]" />
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {pendingOrder.order_code}
                            </p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                            Đơn hàng đang chờ admin xác nhận trước khi chuyển sang chuẩn bị.
                          </p>
                        </div>
                        {matchedNotification ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteNotification(matchedNotification.id)
                            }}
                            className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[rgba(157,49,49,0.08)] hover:text-[var(--danger)]"
                            aria-label="Xóa thông báo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                          {pendingOrder.payment_status === "paid"
                            ? "Đã thanh toán"
                            : "Chưa thanh toán"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationPanelOpen(false)
                              router.push(`/orders?focusOrderId=${pendingOrder.id}`)
                            }}
                            className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            Mở đơn
                          </button>
                          {matchedNotification ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleMarkNotificationAsRead(
                                  matchedNotification.id
                                )
                              }}
                              className="rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-semibold text-[var(--primary-foreground)]"
                            >
                              Đã đọc
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                  Chưa có đơn hàng nào đang chờ xác nhận.
                </div>
              )}

              {readPendingOrders.length > 0 ? (
                <div className="border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowReadNotifications((currentValue) => !currentValue)}
                    className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Thông báo đã đọc
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {readPendingOrders.length} mục đã ẩn xuống dưới
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {showReadNotifications ? "Thu gọn" : "Kéo xuống để xem thêm"}
                    </span>
                  </button>

                  {showReadNotifications ? (
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {readPendingOrders.map((pendingOrder) => {
                        const matchedNotification = getPendingNotificationByOrderId(
                          Number(pendingOrder.id)
                        )

                        return (
                          <div
                            key={`read-${pendingOrder.id}`}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                                  {pendingOrder.order_code}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                                  Đơn chờ xác nhận đã được xem, kéo xuống để xem lại khi cần.
                                </p>
                              </div>
                              {matchedNotification ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteNotification(matchedNotification.id)
                                  }}
                                  className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[rgba(157,49,49,0.08)] hover:text-[var(--danger)]"
                                  aria-label="Xóa thông báo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                                {pendingOrder.payment_status === "paid"
                                  ? "Đã thanh toán"
                                  : "Chưa thanh toán"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsNotificationPanelOpen(false)
                                  router.push(`/orders?focusOrderId=${pendingOrder.id}`)
                                }}
                                className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              >
                                Mở đơn
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

