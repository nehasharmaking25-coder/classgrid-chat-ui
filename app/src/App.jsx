import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a cover letter',
  'Plan a 3-day trip',
  'Help me debug an error',
]

const API_URL = '/api/chat'

const MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (best)' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (fast)' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
  { id: 'allam-2-7b', label: 'Allam 2 7B' },
]

function token() {
  const s = supabase.auth.getSession()
  return s.then(({ data }) => data.session?.access_token)
}

async function api(path, options = {}) {
  const t = await token()
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function askAI(messages, model) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  })
  if (!res.ok) throw new Error('AI request failed')
  const data = await res.json()
  return data.reply ?? 'Sorry, I got no reply.'
}

function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const friendlyError = (err) => {
    const msg = (err?.message || '').toLowerCase()
    if (err?.status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a few minutes and try again.'
    }
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return 'This email is already registered. Please log in instead.'
    }
    if (msg.includes('password')) {
      return 'Password must be at least 6 characters.'
    }
    if (msg.includes('invalid') && msg.includes('email')) {
      return 'Please enter a valid email address.'
    }
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return 'Your email is not confirmed yet. Check your inbox for the confirmation link, then log in.'
    }
    return 'Something went wrong. Please try again.'
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onAuth()
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (err) throw err
        if (!data.session) {
          setError('Account created. Please check your email to confirm it, then log in.')
          setMode('login')
        } else {
          onAuth()
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <p className="auth-toggle">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
      </p>
      <button
        type="button"
        className="auth-switch"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Create an account' : 'Log in instead'}
      </button>
    </div>
  )
}

function Sidebar({ conversations, activeId, onSelect, onNew, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="new-chat" onClick={onNew}>
          <span className="plus">+</span> New chat
        </button>
      </div>
      <div className="conv-list">
        {conversations.map((c) => (
          <button
            key={c.id}
            className={`conv-item ${c.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <span className="conv-icon">💬</span>
            <span className="conv-title">{c.title}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="user-chip">
          <span className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
          <span className="user-name">{user?.email || 'User'}</span>
        </div>
        <button className="logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg-row ${isUser ? 'user' : 'assistant'}`}>
      <div className="msg-avatar">{isUser ? 'N' : '✦'}</div>
      <div className="msg-body">
        <div className="msg-name">{isUser ? 'You' : 'Classgrid AI'}</div>
        {msg.loading ? (
          <div className="msg-text typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        ) : (
          <div className="msg-text">{msg.text}</div>
        )}
      </div>
    </div>
  )
}

function ModelPicker({ model, onChange }) {
  return (
    <div className="model-picker">
      <label htmlFor="model-select">Model</label>
      <select id="model-select" value={model} onChange={(e) => onChange(e.target.value)}>
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Composer({ onSend }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  const submit = () => {
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue('')
    ref.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer">
      <textarea
        ref={ref}
        rows={1}
        placeholder="Message Classgrid AI"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button className="send" onClick={submit} disabled={!value.trim()}>
        ↑
      </button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [model, setModel] = useState(MODELS[0].id)
  const endRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setLoadingAuth(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    api('/api/conversations')
      .then(({ conversations: list }) => {
        setConversations(list)
        if (list.length > 0 && !activeId) {
          setActiveId(list[0].id)
        }
      })
      .catch((err) => console.error('Failed to load conversations', err))
  }, [user])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    api(`/api/messages?conversation_id=${activeId}`)
      .then(({ messages: list }) => setMessages(list))
      .catch((err) => console.error('Failed to load messages', err))
  }, [activeId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveMessage = async (conversationId, role, text) => {
    try {
      await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversationId, role, text }),
      })
    } catch (err) {
      console.error('Failed to save message', err)
    }
  }

  const ensureConversation = async (text) => {
    if (activeId) return activeId
    const title = text.slice(0, 40) + (text.length > 40 ? '...' : '')
    const { conversation } = await api('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, model }),
    })
    setConversations((c) => [conversation, ...c])
    setActiveId(conversation.id)
    return conversation.id
  }

  const send = async (text) => {
    const convId = await ensureConversation(text)

    const userMsg = { id: Date.now(), role: 'user', text }
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', loading: true }
    setMessages((m) => [...m, userMsg, loadingMsg])

    await saveMessage(convId, 'user', text)

    const history = [...messages, userMsg]
      .filter((m) => !m.loading && m.role && m.text != null)
      .map((m) => ({ role: m.role, content: m.text }))

    try {
      const reply = await askAI(history, model)
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingMsg.id ? { ...msg, loading: false, text: reply } : msg,
        ),
      )
      await saveMessage(convId, 'assistant', reply)
    } catch {
      const errorText = 'Sorry, I could not reach the AI right now. Please try again.'
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingMsg.id ? { ...msg, loading: false, text: errorText } : msg,
        ),
      )
    }
  }

  const newChat = () => {
    setActiveId(null)
    setMessages([])
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setConversations([])
    setActiveId(null)
    setMessages([])
  }

  if (loadingAuth) {
    return (
      <div className="app center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app center">
        <AuthForm onAuth={() => supabase.auth.getSession().then(({ data }) => setUser(data.session?.user))} />
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        user={user}
        onLogout={logout}
      />
      <main className="chat">
        <div className="chat-scroll">
          {messages.length === 0 ? (
            <div className="empty">
              <h1>How can I help you today?</h1>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <Message key={m.id} msg={m} />)
          )}
          <div ref={endRef} />
        </div>
        <div className="composer-wrap">
          <ModelPicker model={model} onChange={setModel} />
          <Composer onSend={send} />
          <p className="disclaimer">Powered by Groq — replies may vary.</p>
        </div>
      </main>
    </div>
  )
}
