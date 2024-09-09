import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { Envelope, ErrorMessage, Message } from './protocol.js'

/**
 * Return a nodejs compatible dgram Socket object.
 */
export class Socket extends EventEmitter {
  /** @type {null|WebSocket} */
  #ws = null

  /** @type {number} */
  #channel

  /** @type {string} */
  #family

  /** @type {Array} */
  #queue = []

  /** @type {Object} */
  #listeners = {}

  /**
   * Create a new Socket proxied via WebSocket.
   *
   * @param {number} channel
   * @param {string} family
   */
  constructor (channel, family = 'udp4') {
    super()
    this.#channel = channel
    this.#family = family

    // bound event listeners
    this.#listeners = {
      onWebsocketError: this.#onWebsocketError.bind(this),
      onWebsocketMessage: this.#onWebsocketMessage.bind(this),
      onWebsocketOpen: this.#drain.bind(this)
    }
  }

  /**
   * Attach a websocket
   * 
   * @param {WebSocket} ws
   */
  attach(ws) {
    console.error(`websocket attached: ${ws?.url || '??'}`)
    ws.addEventListener('error', this.#listeners.onWebsocketError)
    ws.addEventListener('message', this.#listeners.onWebsocketMessage)
    ws.addEventListener('open', this.#listeners.onWebsocketOpen)
    this.#ws = ws
    this.#drain()
  }

  /**
   * Detach a websocket
   * 
   * @param {WebSocket} ws
   */
  detach(ws) {
    console.error(`websocket detached: ${ws?.url || '??'}`)
    ws.removeEventListener('error', this.#listeners.onWebsocketError)
    ws.removeEventListener('message', this.#listeners.onWebsocketMessage)
    ws.removeEventListener('open', this.#listeners.onWebsocketOpen)
    this.#ws = null
  }

  /**
   * Websocket errors
   * 
   * @param {Event} ev
   */
  #onWebsocketError(ev) {
    console.error('websocket error', ev)
  }

  /**
   * Websocket messages
   * 
   * @param {MessageEvent} ev
   */
  #onWebsocketMessage(ev) {
    try {
      const { channel, action, body } = Envelope.decode(Buffer.from(ev.data))
      if (channel !== this.#channel) return
      if (action === Message.action) {
        return this.emit('message', ...Message.decode(body))
      }
      if (action === ErrorMessage.action) {
        return console.error('Gateway Error', ErrorMessage.decode(body))
      }
      throw new Error(`unsupported action ${action}`)
    } catch (e) {
      console.error('Message Decoding Error', e)
    }
  }

  /**
   * Broadcasts a datagram on the socket.
   *
   * @param {Buffer} data
   * @param {number} port
   * @param {string} address
   * @param {Function=} fn
   */
  send (data, port, address, fn) {
    // queue until connected/ready
    if (this.#ws?.readyState !== WebSocket.OPEN) {
      return this.#queue.push({ data, port, address, fn })
    }

    // send message
    if (!Buffer.isBuffer(data)) throw new Error('invalid message, expected Buffer')
    const msg = Message.encode(data, { address, port })
    this.#ws.send(Envelope.encode(this.#channel, Message.action, msg))
    
    // optional callback
    if (typeof fn === 'function') fn()
  }

  /**
   * Send any messages in the queue.
   * 
   * note: messages may be pushed back onto the queue 
   * if the ws is not in a ready state.
   */
  #drain () {
    const queue = this.#queue
    this.#queue = []

    for (let { data, port, address, fn } of queue) {
      this.send(data, port, address, fn)
    }
  }

  /**
   * Bind a socket to listen for incoming messages.
   * 
   * Accepts either zero arguments or a single argument of value 0.
   * 
   * note: this is all smoke & mirrors, the port is
   * actually lazy-bound on the first call to send().
   * 
   * @param {any} port
   */
  bind (port) {
    if (port) throw new Error('bind params unsupported')
    this.emit('listening')
  }

  /**
   * No-op method provived for compatibility.
   *
   * @returns {this}
   */
  unref () {
    return this
  }

  /**
   * No-op method provived for compatibility.
   *
   * Note: this method may not provided by the underlying EventEmitter lib.
   *
   * @returns {this}
   */
  setMaxListeners () {
    return this
  }

  /**
   * Returns an object containing the address information for a socket.
   *
   * Note: this method always returns a dummy address, it may be extended
   * in the future to provide address info returned by the proxy host.
   *
   * @returns {object}
   */
  address () {
    if (this.#family === 'udp6') {
      return {
        family: 'udp6',
        address: ':::',
        port: 0
      }
    }
    return {
      family: 'udp4',
      address: '0.0.0.0',
      port: 0
    }
  }
}