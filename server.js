import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express()
const server = createServer(app)

const wss = new WebSocketServer({noServer: true})
const connections = {}
let sessions = {}

const getListeners = (event, id = null) =>
  Object.values(connections).filter(conn => conn.listeners.includes(event) && conn.id != id)

const wsBroadcast = (event, data, id = null) => {
  getListeners(event, id).forEach(conn => {
    console.log(`Sending ${event} to ${conn.id}`)
    conn.ws.send(JSON.stringify({
      event,
      data,
    }))
  })
}

app.use("/api/*", express.json())


app.post('/api/new-session', (req, res) => {
  const session = {id: uuid(), gracePeriod: Date.now() + 30000, participants: [], estimates: {}, revealed: false}
  sessions[session.id] = session
  res.json(session)
})

app.get('/api/sessions/:id', (req, res) => {
  const session = sessions[req.params.id]
  if (!session) {
    return res.status(404).end()
  }

  if (session.revealed) {
    return res.json(session)
  }

  res.json({
    ...session,
    estimates: {}
  })
})

app.post(`/api/sessions/:id/join`, (req, res) => {
  const session = sessions[req.params.id]
  if (!session) {
    return res.status(404).end()
  }

  session.participants = session.participants.filter(p => p.id != req.body.id)

  const participant = {
    name: req.body.name,
    id: req.body.id
  }

  session.participants.push(participant)

  wsBroadcast(`sessions:${req.params.id}:joined`, participant, req.body.id)

  res.status(200).json(participant).end()
})

app.post('/api/sessions/:id/estimate', (req, res) => {
  const session = sessions[req.params.id]
  if (!session) {
    res.status(404).end()
  }

  wsBroadcast(`sessions:${req.params.id}:estimated`, {
    id: req.body.id
  }, req.body.id)

  session.estimates[req.body.id] = req.body.value
  res.status(200).end()
})


app.post('/api/sessions/:id/reveal', (req, res) => {
  const session = sessions[req.params.id]
  if (!session) {
    res.status(404).end()
  }
  
  sessions[req.params.id].revealed = true

  console.log({
    estimates: session.estimates,
    participants: session.participants,
    processedEstimates: session.participants.reduce((obj, p) => ({...obj, [p.id]: session.estimates[p.id]}), {})
  })

  wsBroadcast(`sessions:${req.params.id}:reveal`, {
    estimates: session.participants.reduce((obj, p) => ({...obj, [p.id]: session.estimates[p.id] || '?' }), {})
  })

  res.status(200).end()
})

app.post('/api/sessions/:id/reset', (req, res) => {
  const session = sessions[req.params.id]
  if (!session) {
    res.status(404).end()
  }
  
  sessions[req.params.id].revealed = false
  sessions[req.params.id].estimates = {}

  wsBroadcast(`sessions:${req.params.id}:reset`, {})

  res.status(200).end()
})

server.on("upgrade", (req, sock, head) => {
  wss.handleUpgrade(req, sock, head, ws => {
    const id = uuid()
    connections[id] = { listeners: [], ws, id }
    ws.send(JSON.stringify({
      event: 'id-registered',
      id: id,
    }))

    ws.addEventListener('close', event => {
      Object.values(sessions).filter(session => session.participants.filter(p => p.id == id).length > 0)
        .forEach(session => {
          delete connections[id]
          sessions[session.id].participants = session.participants.filter(p => p.id != id)
          wsBroadcast(`sessions:${session.id}:left`, { id })
        })
    })

    ws.addEventListener('message', event => {
      const payload = JSON.parse(event.data)
      if (payload.event == 'subscribe') {
        connections[id].listeners.push(payload.data.channel)
      } else if (payload.broadcast) {
        getListeners(payload.event, id).forEach(conn => {
          conn.ws.send(JSON.stringify({
            event: payload.event,
            data: payload.data
          }))
        })
      }
    })

  })
})

let manifest = {}
let template = fs.readFileSync(__dirname + '/public/index.html').toString()
if (process.env.APP_ENV == 'production') {
  manifest = fs.readFileSync(__dirname + '/public/manifest.json').toString()
  manifest = JSON.parse(manifest)
  template = template.replace(`<!--entry-point-->`, `<script src="/${manifest['src/main.js'].file}"></script>`)
  template = template.replace(`<!--css-->`, `<link rel="stylesheet" href="/${manifest['src/main.css'].file}"></script>`)
} else {
  console.log("dev")
  template = template.replace(`<!--entry-point-->`, '<script type="module" src="http://localhost:5173/src/main.js"></script>')
}

console.log(template)

app.get('/', (req, res) => {
  res.header('Content-Type', 'text/html').end(template)
})

app.get('/index.html', (req, res) => {
  res.header('Content-Type', 'text/html').end(template)
})

app.use(express.static('public'))

app.get('/*', async (req, res) => {
  res.header('Content-Type', 'text/html').end(template)
})


server.listen(process.env.PORT || 8765)