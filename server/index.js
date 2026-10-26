import express from 'express'
import { existsSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const DATA_FILE = path.join(ROOT_DIR, 'data.json')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const PORT = Number(process.env.PORT) || 3000

const app = express()
app.use(express.json())

async function readQueue() {
  const contents = await readFile(DATA_FILE, 'utf8')
  return JSON.parse(contents)
}

async function writeQueue(entries) {
  const tempFile = `${DATA_FILE}.tmp`
  const contents = `${JSON.stringify(entries, null, 2)}\n`
  await writeFile(tempFile, contents, 'utf8')
  await rename(tempFile, DATA_FILE)
}

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function validateEntry(body = {}) {
  const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : ''
  const age = Number(body.age)
  const contactNumber = typeof body.contactNumber === 'string' ? body.contactNumber.trim() : ''
  const service = typeof body.service === 'string' ? body.service.trim() : ''
  const priority = body.priority === 'Priority' ? 'Priority' : 'Regular'

  if (!patientName) {
    return {error: 'Patient name is required.'}
  }

  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return {error: 'Age must be a whole number between 0 and 120.'}
  }

  if (!service) {
    return {error: 'Service is required.'}
  }

  if (contactNumber && !/^[0-9+\-\s()]{7,20}$/.test(contactNumber)) {
    return {error: 'Contact number must be 7 to 20 digits or symbols.'}
  }

  return {
    entry: {
      patientName,
      age,
      contactNumber,
      service,
      priority,
    },
  }
}

app.get('/api/queue', async (req, res, next) => {
  try {
    const entries = await readQueue()
    res.json(entries)
  } catch (error) {
    next(error)
  }
})

app.get('/api/queue/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)

    if (id === null) {
      return res.status(400).json({ error: 'Queue ID must be a positive whole number.' })
    }

    const entries = await readQueue()
    const entry = entries.find((item) => item.id === id)

    if (!entry) {
      return res.status(404).json({ error: 'Queue entry not found.' })
    }

    res.json(entry)
  } catch (error) {
    next(error)
  }
})

app.post('/api/queue', async (req, res, next) => {
  try {
    const result = validateEntry(req.body)

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    const entries = await readQueue()
    const nextId = entries.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1

    const entry = {
      id: nextId,
      ...result.entry,
      status: 'Waiting',
      createdAt: new Date().toISOString(),
    }

    entries.push(entry)
    await writeQueue(entries)

    res.status(201).location(`/api/queue/${entry.id}`).json(entry)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/queue/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)

    if (id === null) {
      return res.status(400).json({ error: 'Queue ID must be a positive whole number.' })
    }

    const entries = await readQueue()
    const index = entries.findIndex((item) => item.id === id)

    if (index === -1) {
      return res.status(404).json({ error: 'Queue entry not found.' })
    }

    const [deleted] = entries.splice(index, 1)
    await writeQueue(entries)

    res.json({ message: 'Queue entry deleted.', deleted })
  } catch (error) {
    next(error)
  }
})

app.use('/api', (req, res) => {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}.` })
})

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next()
    }

    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be a valid JSON.' })
  }

  console.error(error)
  res.status(500).json({ error: 'Something went wrong. Please Try Again.' })
})

app.listen(PORT, () => {
  console.log(`Clinic Queue API running at http://localhost:${PORT}`)
})
