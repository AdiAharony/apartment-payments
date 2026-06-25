'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')

  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState(993)
  const [emailUser, setEmailUser] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

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

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('email_imap_host, email_imap_port, email_user, email_password')
        .eq('id', user.account_id)
        .single()

      if (accountError || !account) {
        router.replace('/login')
        return
      }

      setAccountId(user.account_id)
      setImapHost(account.email_imap_host ?? '')
      setImapPort(account.email_imap_port ?? 993)
      setEmailUser(account.email_user ?? '')
      setEmailPassword(account.email_password ?? '')
      setLoading(false)
    }

    load()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        email_imap_host: imapHost,
        email_imap_port: imapPort,
        email_user: emailUser,
        email_password: emailPassword,
      })
      .eq('id', accountId)

    if (updateError) {
      setError('שגיאה בשמירת ההגדרות. נסה שוב')
    } else {
      setSuccess(true)
    }
    setSaving(false)
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
            <p className="text-gray-500 text-sm mt-1">חיבור לחשבון אימייל לקבלת חשבונות</p>
          </div>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            חזרה
          </a>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">ההגדרות נשמרו בהצלחה</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שרת IMAP</label>
            <input
              type="text"
              value={imapHost}
              onChange={e => setImapHost(e.target.value)}
              placeholder="imap.gmail.com"
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">פורט</label>
            <input
              type="number"
              value={imapPort}
              onChange={e => setImapPort(Number(e.target.value))}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              value={emailUser}
              onChange={e => setEmailUser(e.target.value)}
              className={inputClassName}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמת אפליקציה</label>
            <input
              type="password"
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              className={inputClassName}
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </form>
      </div>
    </main>
  )
}
