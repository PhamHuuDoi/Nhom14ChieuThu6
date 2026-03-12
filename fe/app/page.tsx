"use client";

import { useEffect, useState } from "react";
import { User } from "./types/user";
import { getUsers, createUser, deleteUser } from "./services/userService";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError("Không thể tải danh sách người dùng");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await createUser({ name: name.trim(), email: email.trim() });
      setName("");
      setEmail("");
      await loadUsers();
    } catch (err) {
      setError("Không thể thêm người dùng mới");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      setError("Không thể xóa người dùng");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 text-center mb-12 tracking-tight">
          Quản lý Người dùng
        </h1>

        {/* Form Section */}
        <div className="mb-12 rounded-2xl bg-white shadow-xl border border-gray-200/80 p-6 sm:p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Thêm người dùng mới</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Họ và tên
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Nhập tên người dùng"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 
                           placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 
                           focus:ring-blue-500/20 outline-none transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 
                           placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 
                           focus:ring-blue-500/20 outline-none transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-medium 
                       rounded-lg shadow-md hover:bg-blue-700 focus:outline-none 
                       focus:ring-2 focus:ring-blue-500/40 disabled:bg-blue-400 
                       disabled:cursor-not-allowed transition-all duration-200 flex 
                       items-center justify-center gap-2 mx-auto sm:mx-0"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                "Thêm người dùng"
              )}
            </button>
          </form>
        </div>

        {/* User List Section */}
        {isLoading && users.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="inline-block animate-pulse">Đang tải danh sách người dùng...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow border border-gray-200 text-gray-500">
            Chưa có người dùng nào. Hãy thêm người dùng mới nhé!
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="group relative bg-white rounded-xl shadow border border-gray-200 p-6 
                         hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {user.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-800 font-medium text-sm 
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Xóa người dùng"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}