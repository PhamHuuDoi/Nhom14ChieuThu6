'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { useAuth } from '@/context/auth-context';
import catalogService from '@/services/catalog.service';
import type { User } from '@/types/api';

const ITEMS_PER_PAGE = 5;

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeUserAction, setActiveUserAction] = useState<{ id: number; type: 'role' | 'delete' } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedUserId, setExpandedUserId] = useState<string | number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setUsers(await catalogService.getUsers());
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Khong the tai danh sach nguoi dung.');
            } finally {
                setIsLoading(false);
            }
        };
        void loadUsers();
    }, []);

    const totalPages = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));
    const paginatedUsers = useMemo(() => users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [users, currentPage]);

    const handleToggleRole = async (userItem: User) => {
        if (!userItem.id || activeUserAction) return;

        setErrorMessage('');
        setSuccessMessage('');

        if (currentUser?.id === userItem.id) {
            setErrorMessage('Ban khong the thay doi quyen cua chinh minh.');
            return;
        }

        setActiveUserAction({ id: Number(userItem.id), type: 'role' });

        try {
            const newRole = userItem.role === 'admin' ? 'customer' : 'admin';
            const updatedUser = await catalogService.updateUserRole(Number(userItem.id), newRole as 'customer' | 'admin');
            setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
            setSuccessMessage('Cap nhat vai tro nguoi dung thanh cong.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat vai tro nguoi dung.');
        } finally {
            setActiveUserAction(null);
        }
    };

    const handleDeleteUser = async (userItem: User) => {
        if (!userItem.id || activeUserAction) return;

        setErrorMessage('');
        setSuccessMessage('');

        if (currentUser?.id === userItem.id) {
            setErrorMessage('Ban khong the xoa chinh tai khoan admin dang dang nhap.');
            return;
        }

        if (!confirm(`Ban co chac muon xoa nguoi dung "${userItem.name}"?`)) return;

        setActiveUserAction({ id: Number(userItem.id), type: 'delete' });

        try {
            await catalogService.deleteUser(Number(userItem.id));
            setUsers((prev) => prev.filter((user) => user.id !== userItem.id));
            if (expandedUserId === userItem.id) setExpandedUserId(null);
            setSuccessMessage('Xoa nguoi dung thanh cong.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Khong the xoa nguoi dung.');
        } finally {
            setActiveUserAction(null);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const nextPageItems = users.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        if (!nextPageItems.some((item) => item.id === expandedUserId)) setExpandedUserId(null);
    };

    return (
        <SectionCard title="Nguoi dung" description="Co phan trang va chi hien detail khi ban bam vao dung nguoi dung.">
            {isLoading ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">Dang tai nguoi dung...</div>
            ) : (
                <div className="space-y-4">
                    {errorMessage ? <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">{errorMessage}</div> : null}
                    {successMessage ? <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">{successMessage}</div> : null}
                    <div className="grid gap-3">
                        {paginatedUsers.map((userItem) => {
                            const isExpanded = expandedUserId === userItem.id;
                            const isUpdatingRole = activeUserAction?.id === userItem.id && activeUserAction.type === 'role';
                            const isDeletingUser = activeUserAction?.id === userItem.id && activeUserAction.type === 'delete';
                            return (
                                <div key={userItem.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button type="button" onClick={() => setExpandedUserId(isExpanded ? null : userItem.id)} className="flex w-full items-center justify-between gap-3 text-left">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--foreground)]">{userItem.name}</p>
                                            <p className="mt-1 text-sm text-[var(--muted)]">{userItem.email}</p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                                    </button>
                                    {isExpanded ? (
                                        <div className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                                            {userItem.phone ? <p>SDT: {userItem.phone}</p> : null}
                                            {userItem.address ? <p>Dia chi: {userItem.address}</p> : null}
                                            <p>Vai tro: {userItem.role === 'admin' ? 'Quan tri' : 'Khach hang'}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button type="button" disabled={Boolean(activeUserAction) || currentUser?.id === userItem.id} onClick={() => handleToggleRole(userItem)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60">
                                                    {isUpdatingRole ? 'Dang cap nhat...' : userItem.role === 'admin' ? 'Giam quyen' : 'Dat lam admin'}
                                                </button>
                                                <button type="button" disabled={Boolean(activeUserAction) || currentUser?.id === userItem.id} onClick={() => handleDeleteUser(userItem)} className="rounded-2xl border border-[var(--danger)] bg-white px-4 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-60">
                                                    {isDeletingUser ? 'Dang xoa...' : 'Xoa'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                        {users.length > 0 ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                                <p className="text-sm text-[var(--muted)]">Trang {currentPage}/{totalPages} • {users.length} nguoi dung</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang truoc</button>
                                    <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang sau</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </SectionCard>
    );
}
