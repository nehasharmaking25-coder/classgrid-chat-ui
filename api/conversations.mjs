import { supabase, getUserFromToken } from './lib/auth.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const user = await getUserFromToken(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, model, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      res.status(200).json({ conversations: data })
      return
    }

    if (req.method === 'POST') {
      const { title, model } = req.body || {}
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: title || 'New chat', model })
        .select()
        .single()

      if (error) throw error
      res.status(201).json({ conversation: data })
      return
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {}
      if (!id) {
        res.status(400).json({ error: 'Missing id' })
        return
      }
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
