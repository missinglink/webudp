import { Socket } from './socket'

// expose dependencies
export { Buffer } from 'node:buffer'
export { EventEmitter } from 'node:events'

/**
 * Return a nodejs compatible dgram interface.
 */

/**
 * auto-incrementing channel id for multiplexing the connection.
 *
 * @type {number}
 * @returns {Socket}
 */
let channel = 0

const createSocket = (family = 'udp4') => {
  const socket = new Socket(++channel, family)
  connect(socket)
  return socket
}

/**
 * Handle host connections.
 */

/**
 * hosts list.
 *
 * @param {string[]} hosts
 */
const hosts = ['wss://webudp.fly.dev']

/**
 * provide custom hosts list.
 *
 * @param {string[]} list
 */
const setWebsocketHosts = (list = []) => {
  hosts.length = 0
  hosts.push(...list)
}

/**
 * Attempt to dial a host.
 * 
 * @param {string} host
 * @param {number} timeout
 * @returns Promise<WebSocket>
 */
function dial(host, timeout = 2000) {
  const ws = new WebSocket(host)
  ws.binaryType = 'arraybuffer'

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', () => reject(new Error(`connection failed: ${host}`)))
    setTimeout(reject, timeout)
  })
}

/**
 * Attempt to dial to a random host.
 * 
 * @param {Socket} socket 
 */
function connect(socket) {
  const rand = shuffle(hosts)
  const attemptConnection = (i = 0) => {
    if (i >= rand.length) throw new Error('failed to connect to host(s)')
    dial(rand[i])
      .then((ws) => socket.attach(ws))
      .catch(() => attemptConnection(i+1))
  }
  attemptConnection()
}

/**
 * Return a randomly shuffled copy of the hosts Array.
 * 
 * @param {Array} hosts 
 * @returns Array
 */
function shuffle(hosts) {
  return hosts.reduce((a,c,i,r,j)=>(j=Math.random()*(a.length-i)|0,[a[i],a[j]]=[a[j],a[i]],a),[...hosts])
}

export default { createSocket, setWebsocketHosts }