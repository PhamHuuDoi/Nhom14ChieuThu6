import { User } from "../types/user"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/users`)
  return res.json()
}

export async function createUser(data:{name:string,email:string}) {
  const res = await fetch(`${API_URL}/users`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function updateUser(id:number,data:{name:string,email:string}) {
  const res = await fetch(`${API_URL}/users/${id}`,{
    method:"PUT",
    headers:{ "Content-Type":"application/json"},
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteUser(id:number){
  await fetch(`${API_URL}/users/${id}`,{
    method:"DELETE"
  })
}