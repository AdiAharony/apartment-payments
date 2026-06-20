'use client'

import { useState, useEffect, useRef } from 'react'

export function SearchableDropdown({
  label,
  placeholder,
  value,
  onChange,
  fetchOptions,
  disabled = false,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  fetchOptions: (query: string) => Promise<string[]>
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(val: string) {
    setQuery(val)
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => {
          const val = e.target.value
          setQuery(val)
          onChange('')
          if (timerRef.current) clearTimeout(timerRef.current)
          if (!val || val.length < 2) { setOptions([]); setOpen(false); return }
          timerRef.current = setTimeout(async () => {
            const results = await fetchOptions(val)
            setOptions(results)
            setOpen(results.length > 0)
          }, 300)
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {open && options.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          {options.map((opt, i) => (
            <li
              key={`${opt}-${i}`}
              onMouseDown={() => select(opt)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: '#111827' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {opt.trim()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}