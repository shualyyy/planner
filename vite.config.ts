import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin, Connect } from 'vite'
import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

function grokProxyPlugin(): Plugin {
  // Load all env vars (including non-VITE_ ones) for server-side use
  const env = loadEnv('development', process.cwd(), '')

  return {
    name: 'grok-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/chat',
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'POST') {
            next()
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            const client = new OpenAI({
              apiKey: env.GROQ_API_KEY,
              baseURL: 'https://api.groq.com/openai/v1',
            })

            const completion = await client.chat.completions.create({
              model: 'llama-3.3-70b-versatile',
              messages: body.messages,
            })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(completion))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(err) }))
          }
        }
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), grokProxyPlugin()],
})
