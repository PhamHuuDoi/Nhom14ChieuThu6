'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FolderTree,
  Package,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import catalogService from '@/services/catalog.service';
import type { DashboardData, Order } from '@/types/api';

const DASHBOARD_PREFS_KEY = 'admin-dashboard-visibility-v2';

type DashboardSectionKey =
  | 'dailyRevenue'
  | 'monthlyRevenue'
  | 'yearlyRevenue'
  | 'pendingOrders'
  | 'totalProducts'
  | 'activeCategories'
  | 'totalUsers'
  | 'availableInventory'
  | 'recentOrders'
  | 'systemSummary';

const DEFAULT_VISIBLE_SECTIONS: Record<DashboardSectionKey, boolean> = {
  dailyRevenue: true,
  monthlyRevenue: true,
  yearlyRevenue: true,
  pendingOrders: true,
  totalProducts: true,
  activeCategories: true,
  totalUsers: true,
  availableInventory: true,
  recentOrders: true,
  systemSummary: true,
};

function formatCurrency(amount: number) {
  return `${Math.round(amount).toLocaleString('vi-VN')} vnđ`;
}

function formatOrderDate(dateValue?: string) {
  if (!dateValue) {
    return 'Chưa có ngày tạo';
  }

  const date = new Date(dateValue);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function mapOrderStatus(status?: Order['order_status']) {
  if (status === 'pending') return 'Chờ xác nhận';
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'preparing') return 'Đang chuẩn bị';
  if (status === 'shipping') return 'Đang giao vận';
  if (status === 'completed') return 'Hoàn thành';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Đang cập nhật';
}

function readStoredVisibility() {
  if (typeof window === 'undefined') {
    return DEFAULT_VISIBLE_SECTIONS;
  }

  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!storedValue) {
      return DEFAULT_VISIBLE_SECTIONS;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<Record<DashboardSectionKey, boolean>>;
    return {
      ...DEFAULT_VISIBLE_SECTIONS,
      ...parsedValue,
    };
  } catch {
    return DEFAULT_VISIBLE_SECTIONS;
  }
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [visibleSections, setVisibleSections] =
    useState<Record<DashboardSectionKey, boolean>>(DEFAULT_VISIBLE_SECTIONS);

  useEffect(() => {
    setVisibleSections(readStoredVisibility());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(visibleSections));
  }, [visibleSections]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await catalogService.getDashboard();
        setDashboardData(response);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const stats = dashboardData?.stats;

  const dashboardStats = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      {
        key: 'dailyRevenue' as const,
        label: 'Doanh thu ngày',
        value: formatCurrency(stats.dailyRevenue ?? stats.todayRevenue ?? 0),
        hint: 'Tổng doanh thu của các đơn đã thanh toán trong hôm nay.',
        accent: 'linear-gradient(135deg,#6d3f1f,#d89d56)',
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        key: 'monthlyRevenue' as const,
        label: 'Doanh thu tháng',
        value: formatCurrency(stats.monthlyRevenue ?? 0),
        hint: 'Tổng doanh thu của các đơn đã thanh toán trong tháng hiện tại.',
        accent: 'linear-gradient(135deg,#8a4f22,#d7a267)',
        icon: <CalendarRange className="h-5 w-5" />,
      },
      {
        key: 'yearlyRevenue' as const,
        label: 'Doanh thu năm',
        value: formatCurrency(stats.yearlyRevenue ?? 0),
        hint: 'Tổng doanh thu của các đơn đã thanh toán trong năm hiện tại.',
        accent: 'linear-gradient(135deg,#5e3d7a,#9f72c2)',
        icon: <CalendarDays className="h-5 w-5" />,
      },
      {
        key: 'pendingOrders' as const,
        label: 'Đơn chờ xử lý',
        value: stats.pendingOrders.toString(),
        hint: `${stats.totalOrders} đơn hàng hiện có trong hệ thống.`,
        accent: 'linear-gradient(135deg,#925c1f,#d8a656)',
        icon: <ClipboardCheck className="h-5 w-5" />,
      },
      {
        key: 'totalProducts' as const,
        label: 'Sản phẩm',
        value: stats.totalProducts.toString(),
        hint: `${stats.outOfStockProducts} sản phẩm hết hàng, ${stats.discontinuedProducts} sản phẩm ngừng bán.`,
        accent: 'linear-gradient(135deg,#5c5f2e,#91a24b)',
        icon: <Boxes className="h-5 w-5" />,
      },
      {
        key: 'activeCategories' as const,
        label: 'Danh mục',
        value: stats.activeCategories.toString(),
        hint: `${stats.inactiveCategories} danh mục đang tạm ngưng.`,
        accent: 'linear-gradient(135deg,#4f5c2e,#7ba24b)',
        icon: <FolderTree className="h-5 w-5" />,
      },
      {
        key: 'totalUsers' as const,
        label: 'Người dùng',
        value: stats.totalUsers.toString(),
        hint: `${stats.adminUsers} admin, ${stats.customerUsers} khách hàng.`,
        accent: 'linear-gradient(135deg,#255d69,#4aa7b8)',
        icon: <Users className="h-5 w-5" />,
      },
      {
        key: 'availableInventory' as const,
        label: 'Kho nguyên liệu',
        value: stats.availableInventory.toString(),
        hint: `${stats.outOfStockInventory} nguyên liệu đang hết hàng.`,
        accent: 'linear-gradient(135deg,#2f5e47,#64ab82)',
        icon: <Package className="h-5 w-5" />,
      },
    ];
  }, [stats]);

  const visibleStats = useMemo(
    () => dashboardStats.filter((item) => visibleSections[item.key]),
    [dashboardStats, visibleSections],
  );

  const recentOrders = useMemo<Order[]>(() => dashboardData?.recentOrders ?? [], [dashboardData]);

  const toggleSection = (sectionKey: DashboardSectionKey) => {
    setVisibleSections((currentValue) => ({
      ...currentValue,
      [sectionKey]: !currentValue[sectionKey],
    }));
  };

  const resetSections = () => {
    setVisibleSections(DEFAULT_VISIBLE_SECTIONS);
  };

  if (isLoading) {
    return (
      <SectionCard title="Tổng Quan" description="Đang tải dữ liệu dashboard từ hệ thống.">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
          Đang tải dữ liệu tổng quan...
        </div>
      </SectionCard>
    );
  }

  if (errorMessage) {
    return (
      <SectionCard title="Tổng Quan" description="Không thể lấy dữ liệu từ database hiện tại.">
        <div className="rounded-3xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] p-4 text-sm text-[var(--danger)]">
          {errorMessage}
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Tùy Chỉnh Dashboard"
        description="Chọn từng khối bạn muốn xem hoặc ẩn đi. Lựa chọn sẽ được lưu lại trên trình duyệt admin này."
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { key: 'dailyRevenue', label: 'Doanh thu ngày' },
              { key: 'monthlyRevenue', label: 'Doanh thu tháng' },
              { key: 'yearlyRevenue', label: 'Doanh thu năm' },
              { key: 'pendingOrders', label: 'Đơn chờ xử lý' },
              { key: 'totalProducts', label: 'Sản phẩm' },
              { key: 'activeCategories', label: 'Danh mục' },
              { key: 'totalUsers', label: 'Người dùng' },
              { key: 'availableInventory', label: 'Kho nguyên liệu' },
              { key: 'recentOrders', label: 'Đơn hàng gần đây' },
              { key: 'systemSummary', label: 'Tóm tắt hệ thống' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--foreground)]"
              >
                <input
                  type="checkbox"
                  checked={visibleSections[item.key as DashboardSectionKey]}
                  onChange={() => toggleSection(item.key as DashboardSectionKey)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={resetSections}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Đặt lại mặc định
          </button>
        </div>
      </SectionCard>

      {visibleStats.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleStats.map(({ key, ...item }) => (
            <StatCard key={key} {...item} />
          ))}
        </div>
      ) : null}

      {visibleSections.recentOrders || visibleSections.systemSummary ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          {visibleSections.recentOrders ? (
            <SectionCard
              title="Đơn Hàng Gần Đây"
              description="Mỗi đơn đều hiển thị ngày tạo để admin theo dõi như mốc thời gian của hóa đơn."
            >
              <div className="space-y-3">
                {recentOrders.length === 0 ? (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
                    Chưa có đơn hàng nào để hiển thị.
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{order.order_code}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {order.user?.name ?? 'Khách hàng không xác định'}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Ngày hóa đơn: {formatOrderDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                            {mapOrderStatus(order.order_status)}
                          </span>
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            {formatCurrency(Number(order.total_amount || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          ) : (
            <div />
          )}

          {visibleSections.systemSummary ? (
            <SectionCard
              title="Tóm Tắt Hệ Thống"
              description="Snapshot nhanh từ database để bạn kiểm tra vận hành trong admin."
            >
              <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  {stats?.activeCategories ?? 0} danh mục đang hoạt động, trong đó {stats?.inactiveCategories ?? 0}{' '}
                  danh mục đang tạm ngưng.
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  {stats?.outOfStockProducts ?? 0} sản phẩm hết hàng và {stats?.discontinuedProducts ?? 0} sản phẩm
                  ngừng bán.
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  {stats?.outOfStockInventory ?? 0} nguyên liệu đang hết hàng trong kho.
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  {stats?.adminUsers ?? 0} tài khoản admin và {stats?.customerUsers ?? 0} tài khoản khách hàng.
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
