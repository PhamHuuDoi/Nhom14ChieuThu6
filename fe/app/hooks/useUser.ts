"use client"

import { useEffect, useState } from "react"
import { User } from "../types/user"
import { getUsers } from "../services/userService"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return { users, loading }
}