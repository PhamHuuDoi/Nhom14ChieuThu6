// User & Auth Types
export interface User {
  id: string | number
  email: string
  name: string
  role?: string
  phone?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  address?: string
  latitude?: number
  longitude?: number
}

export type AuthResponse = User

// Product Types
export interface Category {
  id: number
  name: string
  status: "active" | "inactive"
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: number
  name: string
  description?: string | null
  price: number | string
  image?: string | null
  images?: string[]
  category?: string
  stock?: number
  badge?: string
  sold_count?: number
  is_best_seller?: boolean
  rating?: number
  reviewCount?: number
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
  status?: "available" | "out_of_stock" | "discontinued"
  categories?: {
    id: number
    name: string
    status?: "active" | "inactive"
  } | null
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Cart Types
export interface CartItem {
  id: number
  cartItemId?: number
  productId: number
  name?: string
  description?: string
  price?: number
  image?: string
  product: Product
  quantity: number
}

export interface Cart {
  id: string
  userId: string
  items: CartItem[]
  subtotal: number
  createdAt: string
  updatedAt: string
}

export interface AddToCartData {
  productId: string
  quantity: number
}

export interface UpdateCartQuantityData {
  quantity: number
}

// Order Types
export type PaymentMethod = "cod" | "vnpay" | "momo" | "zalopay"

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipping"
  | "completed"
  | "cancelled"

export interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
}

export interface ShippingInfo {
  fullName: string
  phone: string
  email: string
  address: string
  latitude?: number
  longitude?: number
  note?: string
}

export interface ShippingQuote {
  shippingFee: number
  serviceName: string
  distanceKm?: number
}

export interface StoreLocation {
  id?: number
  admin_user_id?: number
  name: string
  phone?: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  is_primary?: boolean
  updated_at?: string
}

export interface CheckoutItem {
  productId: number
  quantity: number
}

export interface Coupon {
  id: number
  code: string
  name: string
  description?: string | null
  discount_type: "percentage" | "fixed"
  discount_value: number | string
  min_order_value?: number | string | null
  max_discount_amount?: number | string | null
  usage_limit?: number | null
  used_count?: number | null
  starts_at?: string | null
  expires_at?: string | null
  status: "active" | "inactive"
  created_at?: string
  updated_at?: string
}

export interface CouponValidationResult {
  coupon: Coupon
  discountAmount: number
  finalSubtotal: number
}

export interface Order {
  id: string | number
  coupon_id?: number | null
  order_code: string
  discount_amount?: number | string | null
  shipping_fee?: number | string | null
  total_amount: number | string
  shipping_address: string
  note?: string | null
  order_status: "pending" | "confirmed" | "preparing" | "shipping" | "completed" | "cancelled"
  payment_status: "unpaid" | "paid" | "failed" | "refunded"
  payment_method?: "cash" | "momo" | "banking" | "zalopay" | "vnpay" | null
  created_at?: string
  updated_at?: string
  user?: {
    id: number
    name: string
    email: string
  }
  users?: {
    id: number
    name: string
    email: string
  }
  order_items?: Array<{
    id: number
    quantity: number
    unit_price: number | string
    subtotal: number | string
    products?: {
      id: number
      name: string
      sku?: string | null
    }
  }>
  payment?: {
    id: number
    method: "cash" | "momo" | "banking" | "zalopay" | "vnpay"
    status?: "pending" | "success" | "failed" | "refunded"
    transaction_code?: string | null
    created_at?: string
  } | null
  paymentUrl?: string | null
}

export interface CheckoutData {
  shippingInfo: ShippingInfo
  paymentMethod: PaymentMethod
  items: CheckoutItem[]
  couponCode?: string
}

export interface OrdersResponse {
  orders: Order[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
}

// API Response Types
export interface ApiResponse<T> {
  message?: string
  metadata: T
  statusCode?: number
  success?: boolean
  data?: T
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}

export interface Notification {
  id: number
  user_id?: number | null
  order_id?: number | null
  audience: "admin" | "user"
  type: string
  title: string
  message: string
  is_read?: boolean | null
  is_deleted?: boolean | null
  read_at?: string | null
  created_at?: string
  updated_at?: string
  orders?: {
    id: number
    order_code: string
    order_status: Order["order_status"]
    payment_status: Order["payment_status"]
  } | null
}
