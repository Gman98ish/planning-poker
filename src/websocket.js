import { TinyEmitter } from 'tiny-emitter'


const wsEvents = new TinyEmitter()

export let wsId = null

const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/ws`)

export const useWebSocket = (cb) => {
  if (ws.readyState != WebSocket.OPEN) {
    ws.addEventListener('open', () => cb(ws))
    return
  }

  cb(ws)
}

export const wsBroadcast = (event, data) => {
  ws.send(JSON.stringify({
    data,
    event,
    broadcast: true
  }))
}

export const wsSubscribe = (channel, cb) => {
  ws.send(JSON.stringify({
    event: 'subscribe',
    broadcast: false,
    data: { channel }
  }))

  wsEvents.on(channel, e => {
    console.log({ channel, data: e.data })
    cb(e)
  })
}

wsEvents.on('id-registered', payload => {
  console.log('Got me an id ' + payload.id)
  wsId = payload.id
})

ws.addEventListener('message', message => {
  const payload = JSON.parse(message.data)
  wsEvents.emit(payload.event, payload)
})
