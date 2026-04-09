'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { getAdminSocket, SOCKET_EVENTS } from '@/lib/socket';
import catalogService from '@/services/catalog.service';
import type { Order } from '@/types/api';

const ORDER_STATUS_LABELS: Record<Order['order_status'], string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao vận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thanh toán thất bại' },
  { value: 'refunded', label: 'Hoàn trả' },
] as const;

const ORDER_GROUPS: Array<{
  key: Order['order_status'];
  label: string;
  description: string;
}> = [
  {
    key: 'pending',
    label: ORDER_STATUS_LABELS.pending,
    description: 'Đơn mới đang chờ admin xác nhận.',
  },
  {
    key: 'confirmed',
    label: ORDER_STATUS_LABELS.confirmed,
    description: 'Đơn đã được xác nhận và chờ xử lý tiếp.',
  },
  {
    key: 'preparing',
    label: ORDER_STATUS_LABELS.preparing,
    description: 'Đơn đang được chuẩn bị trước khi giao.',
  },
  {
    key: 'shipping',
    label: ORDER_STATUS_LABELS.shipping,
    description: 'Đơn đang giao vận.',
  },
  {
    key: 'completed',
    label: ORDER_STATUS_LABELS.completed,
    description: 'Đơn chỉ hoàn thành sau khi người dùng xác nhận đã nhận hàng.',
  },
  {
    key: 'cancelled',
    label: ORDER_STATUS_LABELS.cancelled,
    description: 'Đơn đã bị hủy.',
  },
];

const ITEMS_PER_PAGE = 10;
const ADMIN_ORDERS_REFRESH_INTERVAL_MS = 10000;

function formatCurrency(amount: number | string | null | undefined) {
  const numericAmount = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  return `${Math.round(safeAmount).toLocaleString('vi-VN')} vnđ`;
}

function getAvailableOrderStatusOptions(order: Order) {
  const currentStatus = order.order_status;

  if (currentStatus === 'pending') {
    return [
      { value: 'pending', label: ORDER_STATUS_LABELS.pending },
      { value: 'confirmed', label: ORDER_STATUS_LABELS.confirmed },
      { value: 'preparing', label: ORDER_STATUS_LABELS.preparing, disabled: true },
      { value: 'shipping', label: ORDER_STATUS_LABELS.shipping, disabled: true },
      { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
    ];
  }

  if (currentStatus === 'confirmed') {
    return [
      { value: 'confirmed', label: ORDER_STATUS_LABELS.confirmed },
      { value: 'preparing', label: ORDER_STATUS_LABELS.preparing },
      { value: 'shipping', label: ORDER_STATUS_LABELS.shipping, disabled: true },
      { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
    ];
  }

  if (currentStatus === 'preparing') {
    return [
      { value: 'preparing', label: ORDER_STATUS_LABELS.preparing },
      { value: 'shipping', label: ORDER_STATUS_LABELS.shipping },
    ];
  }

  if (currentStatus === 'shipping') {
    return [{ value: 'shipping', label: ORDER_STATUS_LABELS.shipping }];
  }

  if (currentStatus === 'completed') {
    return [{ value: 'completed', label: ORDER_STATUS_LABELS.completed }];
  }

  return [{ value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled }];
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<Order['order_status']>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | Order['payment_status']>('all');
  const focusOrderId = Number(searchParams.get('focusOrderId') || '');

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await catalogService.getOrders());
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể tải danh sách đơn hàng.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const socket = getAdminSocket();
    const handleRefresh = () => {
      void loadOrders();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadOrders();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadOrders();
      }
    }, ADMIN_ORDERS_REFRESH_INTERVAL_MS);

    socket.connect();
    socket.on(SOCKET_EVENTS.ADMIN_NEW_ORDER, handleRefresh);
    socket.on(SOCKET_EVENTS.ADMIN_ORDER_STATUS_UPDATED, handleRefresh);
    socket.on(SOCKET_EVENTS.ADMIN_NOTIFICATION_CREATED, handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off(SOCKET_EVENTS.ADMIN_NEW_ORDER, handleRefresh);
      socket.off(SOCKET_EVENTS.ADMIN_ORDER_STATUS_UPDATED, handleRefresh);
      socket.off(SOCKET_EVENTS.ADMIN_NOTIFICATION_CREATED, handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
      socket.disconnect();
    };
  }, [loadOrders]);

  useEffect(() => {
    if (Number.isNaN(focusOrderId) || focusOrderId <= 0 || orders.length === 0) {
      return;
    }

    const targetOrder = orders.find((order) => order.id === focusOrderId);
    if (!targetOrder) {
      return;
    }

    const targetGroup = targetOrder.order_status;
    const groupedOrders = orders.filter((order) => order.order_status === targetGroup);
    const orderIndex = groupedOrders.findIndex((order) => order.id === focusOrderId);
    if (orderIndex === -1) {
      return;
    }

    const targetPage = Math.floor(orderIndex / ITEMS_PER_PAGE) + 1;
    setSelectedOrderGroup(targetGroup);
    setCurrentPage(targetPage);
    setExpandedOrderId(focusOrderId);
  }, [focusOrderId, orders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return orders.filter((order) => {
      const matchesGroup = order.order_status === selectedOrderGroup;
      const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
      const matchesSearch =
        !normalizedQuery ||
        `${order.order_code} ${order.user?.name ?? ''} ${order.user?.email ?? ''} ${order.shipping_address ?? ''}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesGroup && matchesPayment && matchesSearch;
    });
  }, [orders, paymentFilter, searchQuery, selectedOrderGroup]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const startOrderIndex =
    filteredOrders.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endOrderIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length);
  const shouldShowAllOrdersInGroup = selectedOrderGroup === 'pending';
  const paginatedOrders = useMemo(
    () =>
      shouldShowAllOrdersInGroup
        ? filteredOrders
        : filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredOrders, currentPage, shouldShowAllOrdersInGroup]
  );

  const currentGroup =
    ORDER_GROUPS.find((group) => group.key === selectedOrderGroup) ?? ORDER_GROUPS[0];

  const updateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  };

  useEffect(() => {
    setCurrentPage(1);
    if (!filteredOrders.some((order) => order.id === expandedOrderId)) {
      setExpandedOrderId(null);
    }
  }, [selectedOrderGroup, expandedOrderId, filteredOrders, paymentFilter, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleChangeStatus = async (orderId: number, status: Order['order_status']) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      updateOrder(await catalogService.updateOrderStatus(orderId, status));
      setSuccessMessage('Cập nhật trạng thái đơn hàng thành công.');
      window.dispatchEvent(new Event('admin-orders-updated'));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePaymentStatus = async (
    orderId: number,
    paymentStatus: Order['payment_status']
  ) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      updateOrder(await catalogService.updateOrderPaymentStatus(orderId, paymentStatus));
      setSuccessMessage('Cập nhật trạng thái thanh toán thành công.');
      window.dispatchEvent(new Event('admin-orders-updated'));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể cập nhật trạng thái thanh toán.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const nextPageItems = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    if (!nextPageItems.some((item) => item.id === expandedOrderId)) {
      setExpandedOrderId(null);
    }
  };

  return (
    <SectionCard
      title="Đơn hàng"
      description="Phân loại theo trạng thái, chuyển trang theo từng nhóm và chỉ mở chi tiết khi bạn chọn đúng đơn cần xem."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">
          Đang tải đơn hàng...
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          {errorMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {successMessage ? (
            <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">
              {successMessage}
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Chọn loại đơn hàng</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Chọn trạng thái cần xem, admin chỉ thấy đúng nhóm đơn đó.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo mã đơn, khách hàng, email hoặc địa chỉ"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value as 'all' | Order['payment_status'])
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tất cả thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
                <option value="failed">Thanh toán thất bại</option>
                <option value="refunded">Hoàn trả</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {ORDER_GROUPS.map((group) => {
                const count = orders.filter((order) => order.order_status === group.key).length;
                const isActive = selectedOrderGroup === group.key;

                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setSelectedOrderGroup(group.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {group.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{currentGroup.label}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{currentGroup.description}</p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {filteredOrders.length} đơn
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
                Chưa có đơn nào trong nhóm này.
              </div>
            ) : null}

            {paginatedOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const availableStatusOptions = getAvailableOrderStatusOptions(order);
              const isOrderStatusLocked =
                order.order_status === 'shipping' ||
                order.order_status === 'completed' ||
                order.order_status === 'cancelled';
              const isPaymentStatusLocked = isSubmitting || order.order_status === 'cancelled';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {order.order_code}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Khách hàng: {order.user?.name ?? 'Không xác định'} • Tổng:{' '}
                        {formatCurrency(order.total_amount)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Trạng thái: {ORDER_STATUS_LABELS[order.order_status]}
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <div className="grid gap-2 text-sm text-[var(--muted)]">
                        <p>Email: {order.user?.email ?? 'Chưa có'}</p>
                        <p>Địa chỉ giao hàng: {order.shipping_address}</p>
                        {order.note ? <p>Ghi chú: {order.note}</p> : null}
                        <p>
                          Hình thức: {order.payment_method ?? order.payment?.method ?? 'Chưa có'}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Trạng thái đơn
                          </p>
                          <select
                            value={order.order_status}
                            disabled={isSubmitting || isOrderStatusLocked}
                            onChange={(event) =>
                              handleChangeStatus(
                                order.id,
                                event.target.value as Order['order_status']
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {availableStatusOptions.map((item) => (
                              <option
                                key={item.value}
                                value={item.value}
                                disabled={'disabled' in item ? item.disabled : false}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                          {order.order_status === 'shipping' ? (
                            <p className="text-xs text-[var(--muted)]">
                              Khi khách xác nhận đã nhận hàng, đơn sẽ tự chuyển sang hoàn thành.
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Thanh toán
                          </p>
                          <select
                            value={order.payment_status}
                            disabled={isPaymentStatusLocked}
                            onChange={(event) =>
                              handleChangePaymentStatus(
                                order.id,
                                event.target.value as Order['payment_status']
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                          >
                            {PAYMENT_STATUS_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          {order.order_status === 'cancelled' ? (
                            <p className="text-xs text-[var(--muted)]">
                              Đơn đã hủy nên trạng thái thanh toán đã được khóa.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
                        <p className="font-semibold text-[var(--foreground)]">
                          Sản phẩm trong đơn
                        </p>
                        {order.order_items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-1 rounded-2xl bg-white p-3"
                          >
                            <p className="font-medium text-[var(--foreground)]">
                              {item.products?.name ?? 'Sản phẩm không xác định'}
                            </p>
                            <p>SKU: {item.products?.sku ?? '-'}</p>
                            <p>Số lượng: {item.quantity}</p>
                            <p>Giá đơn vị: {formatCurrency(item.unit_price)}</p>
                            <p>Tổng: {formatCurrency(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {filteredOrders.length > 0 && !shouldShowAllOrdersInGroup ? (
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">
                  Đang hiển thị {startOrderIndex}-{endOrderIndex} / {filteredOrders.length} đơn • Trang {currentPage}/{totalPages}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    Trang trước
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
                        currentPage === page
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)] bg-white text-[var(--foreground)]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            ) : null}
            {filteredOrders.length > 0 && shouldShowAllOrdersInGroup ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                Đang hiển thị toàn bộ {filteredOrders.length} đơn chờ xác nhận.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </SectionCard>
  );
}


