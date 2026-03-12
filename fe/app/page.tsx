"use client";
import { useEffect, useState } from "react";
import { User } from "./types/user";
import {
  getUsers,
  createUser,
  deleteUser,
  updateUser,
} from "./services/userService";
import UserForm from "./components/userCard"; 

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Lỗi tải users:", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (data: { name: string; email: string }) => {
    try {
      setIsLoading(true);
      setError(null);

      if (editingUser) {
        await updateUser(editingUser.id, data);
        setEditingUser(null);
      } else {
        await createUser(data);
      }

      await loadUsers();
    } catch (err) {
      console.error("Lỗi lưu user:", err);
      setError("Không thể lưu người dùng. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    try {
      setIsLoading(true);
      setError(null);
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      console.error("Lỗi xóa user:", err);
      setError("Không thể xóa người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-center text-4xl font-bold text-gray-800">
          Quản lý Người dùng
        </h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <UserForm
          onSubmit={handleSubmit}
          editingUser={editingUser}
          isSubmitting={isLoading}
          onCancel={editingUser ? handleCancelEdit : undefined}
        />

        {isLoading && users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="group relative rounded-xl border bg-white p-6 shadow-sm 
                         hover:shadow-md transition-all duration-200"
              >
                <h3 className="truncate text-lg font-semibold text-gray-800">
                  {user.name}
                </h3>
                <p className="mt-1 truncate text-sm text-gray-600">
                  {user.email}
                </p>

                <div className="mt-5 flex gap-4">
                  <button
                    onClick={() => setEditingUser(user)}
                    disabled={isLoading}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 
                             disabled:opacity-50 transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={isLoading}
                    className="text-sm font-medium text-red-600 hover:text-red-800 
                             disabled:opacity-50 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {users.length === 0 && !isLoading && (
          <div className="mt-12 text-center text-gray-500">
            Chưa có người dùng nào. Hãy thêm người dùng mới!
          </div>
        )}
      </div>
    </main>
  );
}