import { useState, useRef, useEffect } from 'react'
import { api, login, signup, logout, me, setToken, getToken } from './lib/auth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

function copyCode(code) {
  navigator.clipboard.writeText(code)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

// Expose copyCode to window for inline onclick
window.copyCode = copyCode

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

async function askAIStream(messages, model, onChunk) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  })
  if (!res.ok) throw new Error('AI request failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('')) {
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }
}

function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const friendlyError = (err) => {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return 'This email is already registered. Please log in instead.'
    }
    if (msg.includes('password')) {
      return 'Password must be at least 6 characters.'
    }
    if (msg.includes('invalid')) {
      return 'Invalid email or password.'
    }
    return err?.message || 'Something went wrong. Please try again.'
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { token, user } = await login(email, password)
        setToken(token)
        onAuth(user)
      } else {
        const { token, user } = await signup(name, email, password)
        setToken(token)
        onAuth(user)
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
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
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

function Sidebar({ conversations, activeId, onSelect, onNew, user, onLogout, onDelete }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="new-chat" onClick={onNew}>
          <span className="plus">+</span> New chat
        </button>
      </div>
      <div className="conv-list">
        {conversations.map((c) => (
          <div key={c.id} className={`conv-item-wrapper ${c.id === activeId ? 'active' : ''}`}>
            <button
              className={`conv-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="conv-icon">💬</span>
              <span className="conv-title">{c.title}</span>
            </button>
            <button
              className="delete-conv"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(c.id)
              }}
              title="Delete chat"
            >
              🗑️
            </button>
          </div>
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
  const [copied, setCopied] = useState(false)

  const withCopyButton = (content) => {
    return content.replace(
      /<pre><code>(.*?)<\/code><\/pre>/gs,
      (match, code) => {
        const displayCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<pre><button class="copy-btn" data-code="${code.replace(/`/g, '\`')}" onclick="copyCode(this.dataset.code)" title="Copy code">
            ${copied ? 'Copied!' : 'Copy'}
          </button><code>${displayCode}</code></pre>`
      }
    )
  }

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
          isUser ? (
            <div className="msg-text">{msg.text}</div>
          ) : (
            <div className="msg-text markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{withCopyButton(msg.text || '')}</ReactMarkdown>
            </div>
          )
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

function Composer({ onSend, busy }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  const submit = () => {
    const text = value.trim()
    if (!text || busy) return
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
      <button className="send" onClick={submit} disabled={!value.trim() || busy}>
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
  const [busy, setBusy] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const endRef = useRef(null)
  // Id of a chat we just created while sending: its messages are already on screen,
  // so we must not reload them from the server (that wiped the AI reply).
  const justCreatedRef = useRef(null)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (!getToken()) {
      setLoadingAuth(false)
      return
    }
    me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        logout()
        setUser(null)
      })
      .finally(() => setLoadingAuth(false))
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
    if (justCreatedRef.current === activeId) {
      justCreatedRef.current = null
      return
    }
    let cancelled = false
    api(`/api/messages?conversation_id=${activeId}`)
      .then(({ messages: list }) => {
        if (!cancelled) setMessages(list)
      })
      .catch((err) => console.error('Failed to load messages', err))
    return () => {
      cancelled = true
    }
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
    justCreatedRef.current = conversation.id
    setActiveId(conversation.id)
    return conversation.id
  }

  const send = async (text) => {
    if (busy) return
    setBusy(true)
    try {
      await sendInner(text)
    } finally {
      setBusy(false)
    }
  }

  const sendInner = async (text) => {
    const userMsg = { id: Date.now(), role: 'user', text }
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', loading: true }
    setMessages((m) => [...m, userMsg, loadingMsg])

    let convId = null
    try {
      convId = await ensureConversation(text)
    } catch (err) {
      console.error('Failed to create conversation', err)
      if (String(err.message).includes('Unauthorized')) {
        handleLogout()
        return
      }
    }

    if (convId) await saveMessage(convId, 'user', text)

    const history = [...messages, userMsg]
      .filter((m) => !m.loading && m.role && m.text != null)
      .map((m) => ({ role: m.role, content: m.text }))

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: history }),
      })

      if (!res.ok) throw new Error('AI request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingMsg.id ? { ...msg, loading: false } : msg,
        ),
      )

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === loadingMsg.id ? { ...msg, loading: false, text: fullText } : msg,
                  ),
                )
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      if (convId) await saveMessage(convId, 'assistant', fullText)
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

  const handleLogout = () => {
    logout()
    setConversations([])
    setActiveId(null)
    setMessages([])
    setUser(null)
  }

  const deleteChat = async (id) => {
    try {
      await api(`/api/conversations?id=${id}`, { method: 'DELETE' })
      setConversations((c) => c.filter((conv) => conv.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to delete conversation', err)
    }
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
        <AuthForm onAuth={(u) => setUser(u)} />
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
        onLogout={handleLogout}
        onDelete={deleteChat}
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
          <Composer onSend={send} busy={busy} />
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <p className="disclaimer">Powered by Groq — replies may vary.</p>
        </div>
      </main>
    </div>
  )
}
