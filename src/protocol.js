import { Buffer } from 'node:buffer'

export class Envelope {
  static encode (channel, action = '', data) {
    return Buffer.concat([
      u16Buffer(channel),
      Buffer.from(action),
      Buffer.from([0x0]),
      data
    ])
  }

  static decode (buf) {
    const channel = buf.readUint16BE(0)
    const o = buf.indexOf(0x0, 2)
    const action = buf.subarray(2, o).toString()
    return {
      channel,
      action,
      body: buf.subarray(o + 1)
    }
  }
}

export class RemoteInfo {
  static encode (rinfo) {
    const family = (rinfo?.address || '').includes(':') ? 'IPv6' : 'IPv4'
    return Buffer.concat([
      Buffer.from([family === 'IPv6' ? 0x6 : 0x4]),
      Buffer.from(rinfo?.address || ''),
      Buffer.from([0x0]),
      u16Buffer(rinfo?.port || 0)
    ])
  }

  static decode (buf) {
    return this.decodeWithByteLength(buf).rinfo
  }

  static decodeWithByteLength (buf) {
    const protocol = buf.readUint8(0)
    const o = buf.indexOf(0x0, 1)
    const address = buf.subarray(1, o).toString()
    const port = buf.readUint16BE(o + 1)
    const rinfo = {
      family: `IPv${protocol}`,
      address,
      port
    }
    return { rinfo, byteLength: o + 3 }
  }
}

export class Message {
  static action = 'M'

  static encode (data, rinfo) {
    return Buffer.concat([RemoteInfo.encode(rinfo), data])
  }

  static decode (buf) {
    const { rinfo, byteLength } = RemoteInfo.decodeWithByteLength(buf)
    return [buf.subarray(byteLength), rinfo]
  }
}

export class ErrorMessage {
  static action = 'E'

  static encode (text) {
    return Buffer.from(text)
  }

  static decode (buf) {
    return buf.toString()
  }
}

function u16Buffer (i) {
  const buf = new Buffer(2)
  buf.writeUint16BE(i)
  return buf
}
