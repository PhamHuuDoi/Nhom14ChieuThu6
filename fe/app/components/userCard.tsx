"use client";
import { useEffect, useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserFormProps {
  onSubmit: (data: { name: string; email: string }) => Promise<void>;
  editingUser: User | null;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export default function UserForm({
  onSubmit,
  editingUser,
  isSubmitting,
  onCancel,
}: UserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setEmail(editingUser.email);
    } else {
      setName("");
      setEmail("");
    }
  }, [editingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    await onSubmit({
      name: name.trim(),
      email: email.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-10 rounded-xl border bg-white p-6 shadow-sm"
    >
      <h2 className="mb-6 text-xl font-semibold text-gray-800">
        {editingUser ? "Cập nhật người dùng" : "Thêm người dùng mới"}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Họ và tên
          </label>
          <input
            type="text"
            placeholder="Nhập tên người dùng"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-800 
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 
                     focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-800 
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 
                     focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 justify-end">
        {editingUser && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 
                     hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !email.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 
                   font-medium text-white hover:bg-blue-700 disabled:bg-blue-400 
                   disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
              Đang xử lý...
            </>
          ) : editingUser ? (
            "Cập nhật"
          ) : (
            "Thêm người dùng"
          )}
        </button>
      </div>
    </form>
  );
}