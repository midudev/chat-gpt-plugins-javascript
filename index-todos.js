import express, { json } from 'express'
import cors from 'cors'
import fs from 'node:fs/promises' // fs -> file system -> sistema de archivos (leer)
import path from 'node:path'
import crypto from 'node:crypto'

const PORT = process.env.PORT ?? 3000
const app = express()

app.use(cors(
  {
    methods: ['GET'],
    origin: [`https://localhost:${PORT}`, 'https://chat.openai.com']
  }
))
app.use(json())

app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`)
  next()
})

// 1. Preparar los endpoints para servir la información
// que necesita el Plugin de ChatGPT
app.get('/openapi.yaml', async (req, res, next) => {
  try {
    const filePath = path.join(process.cwd(), 'openapi.yaml')
    const yamlData = await fs.readFile(filePath, 'utf-8')
    res.setHeader('Content-Type', 'text/yaml')
    res.send(yamlData)
  } catch (e) {
    console.error(e.message)
    // esto no lo hagáis normalmente
    res.status(500).send({ error: 'Unable to fetch openapi.yaml manifest'})
  }
})

app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.sendFile(path.join(process.cwd(), '.well-known/ai-plugin.json'))
})

app.get('/logo.png', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'logo.png'))
})

// 2. Los endpoints de la API
// para que funcione el plugin de ChatGPT con los todos
let TODOS = [
  { id: crypto.randomUUID(), title: 'Ver el Twitch de midudev' },
  { id: crypto.randomUUID(), title: 'Enviar el proyecto Hackathon InfoJobs' },
  { id: crypto.randomUUID(), title: 'Crear plugin de ChatGPT' },
  { id: crypto.randomUUID(), title: 'Mejorar el rendimiento de la web' },
]

app.get('/todos', (req, res) => {
  res.json({ todos: TODOS })
})

app.post('/todos', (req, res) => {
  const { title } = req.body
  const newTodo = { id: crypto.randomUUID(), title }

  TODOS.push(newTodo) // lo podrías hacer en una base de datos

  res.json(newTodo)
})

app.get('/todos/:id', (req, res) => {
  const { id } = req.params
  const todo = TODOS.find(todo => todo.id === id)
  return res.json(todo)
})

app.put('/todos/:id', (req, res) => {
  const { id } = req.params
  const { title } = req.body

  let newTodo = null

  TODOS.forEach((todo, index) => {
    if (todo.id === id) {
      newTodo = { ...todo, title }
      TODOS[index] = newTodo
    }
  })

  return res.json(newTodo)
})

app.delete('/todos/:id', (req, res) => {
  const { id } = req.params

  TODOS = TODOS.filter(todo => todo.id !== id)

  return res.json({ ok: true })
})

// 3. Iniciar el servidor
app.listen(PORT, () => {
  console.log('ChatGPT Plugin is listening on port', PORT)
})