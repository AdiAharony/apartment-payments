'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

const PAYMENT_TYPES = [
  { value: 'arnona', label: 'ארנונה' },
  { value: 'water', label: 'מים' },
  { value: 'gas', label: 'גז' },
  { value: 'electricity', label: 'חשמל' },
]

export default function NewPaymentPage() {
  const router = useRouter()
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('account_id')
        .eq('id', session.user.id)
        .single()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      setAccountId(user.account_id)
      setLoading(false)
    }

    load()
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value)
    const due_date = (form.elements.namedItem('due_date') as HTMLInputElement).value || null
    const period_start = (form.elements.namedItem('period_start') as HTMLInputElement).value || null
    const period_end = (form.elements.namedItem('period_end') as HTMLInputElement).value || null

    const { error: insertError } = await supabase
      .from('payments')
      .insert({ account_id: accountId, type, amount, due_date, period_start, period_end, status: 'pending', source: 'manual' })

    if (insertError) {
      setError('שגיאה בשמירת התשלום. נסה שוב')
      setSubmitting(false)
      return
    }

    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md text-center">
          <p className="text-gray-500 text-sm">טוען...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">הוספת תשלום</h1>
        <p className="text-gray-500 mb-6 text-sm">הזנה ידנית של תשלום חדש</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג תשלום</label>
            <select name="type" required className={inputClassName}>
              {PAYMENT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סכום</label>
            <input name="amount" type="number" min="0" step="0.01" required className={inputClassName} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך לתשלום</label>
            <input name="due_date" type="date" className={inputClassName} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תחילת תקופה</label>
            <input name="period_start" type="date" className={inputClassName} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוף תקופה</label>
            <input name="period_end" type="date" className={inputClassName} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {submitting ? 'שומר...' : 'הוסף תשלום'}
          </button>
        </form>
      </div>
    </main>
  )
}
