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

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages }),
    })

    const data = await upstream.json()
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || 'AI request failed' })
      return
    }

    res.status(200).json({ reply: data.choices?.[0]?.message?.content ?? 'Sorry, I got no reply.' })
  } catch {
    res.status(502).json({ error: 'AI request failed' })
  }
}