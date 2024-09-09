import path from 'node:path'
import resolve from '@rollup/plugin-node-resolve'
import commonJS from '@rollup/plugin-commonjs'
import alias from '@rollup/plugin-alias'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/dgram.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    alias({
      entries: [
        { find: 'node:buffer', replacement: path.resolve('./node_modules/buffer/index.js') },
        { find: 'node:events', replacement: path.resolve('./node_modules/eventemitter3/index.js') }
      ]
    }),
    commonJS(),
    resolve({
      preferBuiltins: false
    }),
    terser()
  ]
}
