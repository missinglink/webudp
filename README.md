Send UDP packets from the browser (proxied via WebSocket)

```js
import dgram from 'https://webudp.fly.dev/bundle.js'
import dnsPacket from 'https://esm.sh/dns-packet'

const dnsQuery = dnsPacket.encode({
  type: 'query',
  id: 1,
  flags: dnsPacket.RECURSION_DESIRED,
  questions: [{
    type: 'A',
    name: 'google.com'
  }]
})

const socket = dgram.createSocket('udp4')

socket.on('message', message => {
  console.error(dnsPacket.decode(message))
})

socket.send(dnsQuery, 53, '8.8.8.8')
//socket.send(query, 53, '2001:4860:4860::8888')
```

Dependencies are re-exported:

```js
import dgram, { Buffer, EventEmitter } from 'https://webudp.fly.dev/bundle.js'
```