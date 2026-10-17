import { supabase, comparePassword, signToken } from '../lib/auth.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { email, password } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  const normalized = String(email).trim().toLowerCase()

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, password, created_at')
      .eq('email', normalized)
      .maybeSingle()

    if (error) throw error

    if (!data || !(await comparePassword(password, data.password))) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = signToken(data)
    const { password: _pw, ...user } = data
    res.status(200).json({ token, user })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
}