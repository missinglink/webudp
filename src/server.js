import fs from 'node:fs'
import http from 'node:http'
import dgram from 'node:dgram'
import { Buffer } from 'node:buffer'
import { WebSocketServer } from 'ws'
import { Envelope, Message, ErrorMessage } from './protocol.js'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080
const HOST = process.env.HOST || '0.0.0.0'
const UDP_HOST = process.env.UDP_HOST
const MAX_SOCKETS_PER_CONNECTION = 2

const bundleFile = fs.readFileSync('./bundle.js')

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url === '/bundle.js') {
    res.writeHead(200, {'Content-Type': 'application/javascript'})
    res.write(bundleFile)
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'})
    res.write('Not Found')
  }
  res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn) => {
  // map of sockets per-connection, keyed by protocol & channel id
  const sockets = new Map()

  // log errors
  conn.on('error', console.error)

  // handle disconnects
  conn.on('close', () => {
    sockets.forEach((socket, channel) => {
      sockets.delete(channel)
      socket.close()
    })
  })

  conn.on('message', async (msg) => {
    try {
      const { channel, action, body } = Envelope.decode(Buffer.from(msg))
      if (action !== Message.action) throw new Error(`unsupported action ${action}`)
      const [data, rinfo] = Message.decode(body)
      const protocol = rinfo.family === 'IPv6' ? 'udp6' : 'udp4'
      const socketId = `${protocol}:${channel}`

      // lazy bind UDP socket
      if (!sockets.has(socketId)) {
        if (sockets.size >= MAX_SOCKETS_PER_CONNECTION) {
          const err = ErrorMessage.encode('exceeded max sockets per connection')
          conn.send(Envelope.encode(channel, ErrorMessage.action, err))
          return
        }

        // create a new UDP socket
        // disable DNS lookups
        const socket = dgram.createSocket({
          type: protocol,
          lookup: (address, _, cb) => cb(null, address, rinfo.family)
        })
        sockets.set(socketId, socket)
        const listening = new Promise(resolve => socket.on('listening', resolve))
        socket.bind(0, UDP_HOST)
        await listening

        // forward udp messages to conn
        socket.on('message', (msg, rinfo) => {
          const reply = Message.encode(Buffer.from(msg), rinfo)
          conn.send(Envelope.encode(channel, Message.action, reply))
        })
      }

      // send message to udp socket
      sockets.get(socketId).send(data, rinfo.port, rinfo.address)
    } catch (e) {
      console.error('Message Decoding Error', e)
    }
  })
})

wss.on('listening', () => console.log('listening', wss.address()))
server.listen(PORT, HOST)
