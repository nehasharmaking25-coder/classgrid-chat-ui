import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '30d',
  })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function getToken(req) {
  const auth = req.headers.authorization || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

export async function getUserFromToken(req) {
  const token = getToken(req)
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('id', payload.sub)
    .single()
  if (error || !data) return null
  return data
}

export { supabase }