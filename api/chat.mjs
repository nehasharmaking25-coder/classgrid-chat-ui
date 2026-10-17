// Vercel serverless function — keeps the Groq key on the server only.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.GROQ_API_KEY
  if (!key) {
    res.status(500).json({ error: 'Server key not configured' })
    return
  }

  const { model, messages } = req.body || {}
  if (!model || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Missing model or messages' })
    return
  }

  const groqUrl = 'https://api.groq.com/openai/v1/chat/completions'

  const body = {
    model,
    messages,
    stream: true,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)

  try {
    const response = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      console.error('Groq error:', response.status, text)
      res.status(response.status).json({ error: text || 'Groq request failed' })
      return
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // Groq sends lines like "data: {json}". We read them, pull out only the
    // new words, and send plain text to the browser.
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false

    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // last line may be cut in half: keep it for the next read

      for (const raw of lines) {
        const line = raw.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          finished = true
          break
        }
        try {
          const content = JSON.parse(data).choices?.[0]?.delta?.content
          if (content) res.write(content)
        } catch {
          // skip a broken line
        }
      }
    }

    res.end()
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Streaming error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming failed' })
    } else {
      res.end()
    }
  }
}

// Optional: non-streaming version for backwards compatibility
export async function askAI(model, messages) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('Server key not configured')

  const groqUrl = 'https://api.groq.com/openai/v1/chat/completions'

  const response = await fetch(groqUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: false }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Groq request failed')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Redeploy trigger: this comment change starts a new Vercel build.
