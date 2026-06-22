'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

function getHebrewError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'פרטי התחברות שגויים'
  }
  if (lower.includes('email not confirmed')) {
    return 'יש לאמת את כתובת האימייל לפני ההתחברות'
  }
  if (lower.includes('too many requests')) {
    return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר'
  }
  return 'ההתחברות נכשלה. נסה שוב'
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(getHebrewError(authError.message))
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md relative">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">התחברות</h1>
        <p className="text-gray-500 mb-6 text-sm">היכנס לחשבון שלך</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input name="email" type="email" required className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input name="password" type="password" required className={inputClassName} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {loading ? 'מתחבר...' : 'התחברות'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-4">
          אין לך חשבון?{' '}
          <a href="/register" className="text-blue-600 hover:underline">הרשמה</a>
        </p>
      </div>
    </main>
  )
}
