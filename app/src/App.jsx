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
        <div className="msg-text">{msg.text}</div>
      </div>
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
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text) => {
    const userMsg = { id: Date.now(), role: 'user', text }
    const reply = {
      id: Date.now() + 1,
      role: 'assistant',
      text: 'This is a demo reply — the real app would call an AI API here. (Fake data only.)',
    }
    setMessages((m) => [...m, userMsg, reply])
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
          <Composer onSend={send} />
          <p className="disclaimer">Demo UI with fake data — no real API calls.</p>
        </div>
      </main>
    </div>
  )
}
