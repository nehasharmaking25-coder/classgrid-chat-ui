import { useState, useRef, useEffect } from 'react'
import './App.css'

const FAKE_CONVERSATIONS = [
  { id: 1, title: 'Explain React hooks' },
  { id: 2, title: 'Plan my study week' },
  { id: 3, title: 'Write a birthday wish' },
  { id: 4, title: 'Summarize a PDF' },
  { id: 5, title: 'Debug my code' },
  { id: 6, title: 'Ideas for a project' },
]

const FAKE_MESSAGES = [
  { id: 1, role: 'user', text: 'Can you explain React hooks in simple words?' },
  {
    id: 2,
    role: 'assistant',
    text: 'Sure! Hooks are functions that let you use React features (like state) inside function components. The most common ones are `useState` for values that change, and `useEffect` for running code after render.',
  },
  { id: 3, role: 'user', text: 'Give me a tiny example.' },
  {
    id: 4,
    role: 'assistant',
    text: 'Here you go:\n\n```js\nimport { useState } from "react"\n\nfunction Counter() {\n  const [count, setCount] = useState(0)\n  return <button onClick={() => setCount(count + 1)}>{count}</button>\n}\n```\n\nEvery click adds 1 to the count.',
  },
]

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a cover letter',
  'Plan a 3-day trip',
  'Help me debug an error',
]

// Groq API (OpenAI-compatible). Key is set as a Vercel env var (VITE_GROQ_API_KEY).
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (best)' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (fast)' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
  { id: 'allam-2-7b', label: 'Allam 2 7B' },
]

async function askAI(messages, model) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages }),
  })
  if (!res.ok) throw new Error('AI request failed')
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? 'Sorry, I got no reply.'
}

function Sidebar({ conversations, activeId, onSelect, onNew }) {
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
          <span className="avatar">N</span>
          <span className="user-name">Neha</span>
        </div>
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
      <select
        id="model-select"
        value={model}
        onChange={(e) => onChange(e.target.value)}
      >
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
  const [conversations, setConversations] = useState(FAKE_CONVERSATIONS)
  const [activeId, setActiveId] = useState(1)
  const [messages, setMessages] = useState(FAKE_MESSAGES)
  const [model, setModel] = useState(MODELS[0].id)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const userMsg = { id: Date.now(), role: 'user', text }
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', loading: true }
    setMessages((m) => [...m, userMsg, loadingMsg])

    // Build the conversation history for context.
    const history = [...messages, userMsg]
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, content: m.text }))

    try {
      const reply = await askAI(history, model)
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingMsg.id
            ? { ...msg, loading: false, text: reply }
            : msg,
        ),
      )
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingMsg.id
            ? {
                ...msg,
                loading: false,
                text: 'Sorry, I could not reach the AI right now. Please try again.',
              }
            : msg,
        ),
      )
    }
  }

  const newChat = () => {
    const id = Date.now()
    setConversations((c) => [{ id, title: 'New chat' }, ...c])
    setActiveId(id)
    setMessages([])
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
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
