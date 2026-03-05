"use client"
import { useEffect, useState } from "react"

type User = {
  id: number
  name: string
  email: string
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-10">
          Danh sách người dùng
        </h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm p-5 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-3/5 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chưa có người dùng nào</p>
            <p className="text-gray-400 mt-2">Danh sách hiện đang trống</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 
                         p-5 hover:shadow-md hover:border-blue-100 
                         transition-all duration-200 group"
              >
                <div className="font-semibold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">
                  {user.name}
                </div>
                <div className="text-gray-600 mt-1 text-sm">
                  {user.email}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}