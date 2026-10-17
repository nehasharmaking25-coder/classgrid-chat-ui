import { supabase, hashPassword, signToken } from '../lib/auth.mjs'

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

  const { name, email, password } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' })
    return
  }

  const normalized = String(email).trim().toLowerCase()

  try {
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()

    if (existing) {
      res.status(409).json({ error: 'This email is already registered. Please log in instead.' })
      return
    }

    const hashed = await hashPassword(password)
    const { data, error } = await supabase
      .from('app_users')
      .insert({ name: name || normalized.split('@')[0], email: normalized, password: hashed })
      .select('id, name, email, created_at')
      .single()

    if (error) {
      if (String(error.message).includes('duplicate')) {
        res.status(409).json({ error: 'This email is already registered. Please log in instead.' })
        return
      }
      throw error
    }

    const token = signToken(data)
    res.status(201).json({ token, user: data })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
}