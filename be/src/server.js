require("dotenv").config()

const express = require("express")
const cors = require("cors")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req,res)=>{
 res.send("API running")
})

app.get("/users", async (req,res)=>{
 const users = await prisma.user.findMany()
 res.json(users)
})

app.post("/users", async (req,res)=>{
 const {name,email} = req.body

 const user = await prisma.user.create({
  data:{name,email}
 })

 res.json(user)
})

const PORT = 5000

app.listen(PORT, ()=>{
 console.log("Server running on port",PORT)
})