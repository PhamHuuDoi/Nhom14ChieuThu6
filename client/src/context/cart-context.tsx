'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import cartService from '@/services/cart.service';
import { useAuth } from './auth-context';

export interface CartItem {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
    removeFromCart: (id: number) => Promise<void>;
    updateQuantity: (id: number, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalItems: number;
    totalPrice: number;
    isLoading: boolean;
}

const CART_STORAGE_KEY = 'thezoocoffee_cart';
const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeCartItem(item: any): CartItem {
    return {
        id: Number(item.id ?? item.productId ?? item.product?.id),
        name: item.name ?? item.product?.name ?? '',
        description: item.description ?? item.product?.description ?? '',
        price: Number(item.price ?? item.product?.price ?? 0),
        image: item.image ?? item.product?.image ?? '/images/store.jpg',
        quantity: Number(item.quantity ?? 0),
    };
}

function readLocalCart(): CartItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(normalizeCartItem).filter((item) => item.id > 0 && item.quantity > 0);
    } catch {
        return [];
    }
}

function writeLocalCart(items: CartItem[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function clearLocalCart() {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(CART_STORAGE_KEY);
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const lastSyncedUserId = useRef<string | number | null>(null);

    const loadRemoteCart = useCallback(async () => {
        const cart = await cartService.getCart();
        return (cart.items || []).map(normalizeCartItem);
    }, []);

    const loadCart = useCallback(async () => {
        if (!user) {
            setItems(readLocalCart());
            setIsLoading(false);
            lastSyncedUserId.current = null;
            return;
        }

        try {
            setIsLoading(true);

            if (lastSyncedUserId.current !== user.id) {
                const localItems = readLocalCart();

                for (const item of localItems) {
                    await cartService.addToCart({
                        productId: String(item.id),
                        quantity: item.quantity,
                    });
                }

                if (localItems.length > 0) {
                    clearLocalCart();
                }

                lastSyncedUserId.current = user.id;
            }

            setItems(await loadRemoteCart());
        } catch (error) {
            console.error('Error loading cart:', error);
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, loadRemoteCart]);

    useEffect(() => {
        if (isAuthLoading) {
            return;
        }

        void loadCart();
    }, [isAuthLoading, loadCart]);

    const addToCart = useCallback(
        async (item: Omit<CartItem, 'quantity'>) => {
            if (!user) {
                setItems((prevItems) => {
                    const existingItem = prevItems.find((cartItem) => cartItem.id === item.id);
                    const nextItems = existingItem
                        ? prevItems.map((cartItem) =>
                              cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
                          )
                        : [...prevItems, { ...item, quantity: 1 }];

                    writeLocalCart(nextItems);
                    return nextItems;
                });
                return;
            }

            const addedItem = await cartService.addToCart({
                productId: String(item.id),
                quantity: 1,
            });

            const normalized = normalizeCartItem(addedItem);
            setItems((prevItems) => {
                const existingItem = prevItems.find((cartItem) => cartItem.id === normalized.id);
                if (existingItem) {
                    return prevItems.map((cartItem) => (cartItem.id === normalized.id ? normalized : cartItem));
                }
                return [...prevItems, normalized];
            });
        },
        [user],
    );

    const removeFromCart = useCallback(
        async (id: number) => {
            if (!user) {
                setItems((prevItems) => {
                    const nextItems = prevItems.filter((item) => item.id !== id);
                    writeLocalCart(nextItems);
                    return nextItems;
                });
                return;
            }

            await cartService.removeFromCart(String(id));
            setItems((prevItems) => prevItems.filter((item) => item.id !== id));
        },
        [user],
    );

    const updateQuantity = useCallback(
        async (id: number, quantity: number) => {
            if (!user) {
                setItems((prevItems) => {
                    const nextItems =
                        quantity < 1
                            ? prevItems.filter((item) => item.id !== id)
                            : prevItems.map((item) => (item.id === id ? { ...item, quantity } : item));

                    writeLocalCart(nextItems);
                    return nextItems;
                });
                return;
            }

            const updatedItem = await cartService.updateCartQuantity(String(id), { quantity });

            if (quantity < 1 || !updatedItem) {
                setItems((prevItems) => prevItems.filter((item) => item.id !== id));
                return;
            }

            const normalized = normalizeCartItem(updatedItem);
            setItems((prevItems) => prevItems.map((item) => (item.id === id ? normalized : item)));
        },
        [user],
    );

    const clearCart = useCallback(async () => {
        if (!user) {
            clearLocalCart();
            setItems([]);
            return;
        }

        await cartService.clearCart();
        setItems([]);
    }, [user]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                totalItems,
                totalPrice,
                isLoading,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
