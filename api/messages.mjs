import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function getToken(req) {
  const auth = req.headers.authorization || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

async function getUser(token) {
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function ownsConversation(userId, conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single()
  return !error && !!data
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const user = await getUser(getToken(req))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    if (req.method === 'GET') {
      const { conversation_id } = req.query || {}
      if (!conversation_id) {
        res.status(400).json({ error: 'Missing conversation_id' })
        return
      }
      if (!(await ownsConversation(user.id, conversation_id))) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      const { data, error } = await supabase
        .from('messages')
        .select('id, role, text, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      res.status(200).json({ messages: data })
      return
    }

    if (req.method === 'POST') {
      const { conversation_id, role, text } = req.body || {}
      if (!conversation_id || !role || text == null) {
        res.status(400).json({ error: 'Missing fields' })
        return
      }
      if (!(await ownsConversation(user.id, conversation_id))) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id, role, text })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id)

      res.status(201).json({ message: data })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
