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
// para que funcione el plugin de ChatGPT con GitHub
app.get('/search', async (req, res) => {
  const { q } = req.query

  const apiURL = `https://api.github.com/search/repositories?q=${q}`
  const apiResponse = await fetch(apiURL, {
    headers: {
      'User-Agent': 'ChatGPT Plugin v.1.0.0 - @midudev',
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!apiResponse.ok) {
    return res.sendStatus(apiResponse.status)
  }

  console.log('te quedan:', apiResponse.headers.get('X-RateLimit-Remaining'))

  const json = await apiResponse.json()

  const repos = json.items.map(item => ({
    name: item.name,
    description: item.description,
    stars: item.stargazers_count,
    url: item.html_url
  }))

  return res.json({ repos })

})

// 3. Iniciar el servidor
app.listen(PORT, () => {
  console.log('ChatGPT Plugin is listening on port', PORT)
})