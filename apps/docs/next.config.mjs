import withSearch from './src/markdoc/search.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
}

export default withSearch(nextConfig)
