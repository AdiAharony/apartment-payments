'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('account_id, used_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation || invitation.used_at) {
      setError('הזמנה לא תקפה או שכבר נוצלה')
      setLoading(false)
      return
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !authData.user) {
      setError('ההרשמה נכשלה. נסה שוב')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('נרשמת אך ההתחברות נכשלה. נסה להתחבר ידנית')
      setLoading(false)
      return
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authData.user.id, fullName, accountId: invitation.account_id }),
    })
    if (!res.ok) {
      setError('שגיאה ביצירת המשתמש. נסה שוב')
      setLoading(false)
      return
    }

    await supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">הצטרפות לדירה</h1>
        <p className="text-gray-500 mb-6 text-sm">צור חשבון כדי להצטרף לדירה</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input name="fullName" type="text" required className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input name="email" type="email" required className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input name="password" type="password" required minLength={6} className={inputClassName} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {loading ? 'מצטרף...' : 'הצטרף לדירה'}
          </button>
        </form>
      </div>
    </main>
  )
}
