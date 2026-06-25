'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

const PROVIDERS = [
  {
    id: 'gmail',
    label: 'Gmail',
    host: 'imap.gmail.com',
    port: 993,
    passwordGuide: 'Gmail דורש סיסמת אפליקציה (לא הסיסמה הרגילה שלך). ניתן להדביק עם רווחים — המערכת תסיר אותם אוטומטית.',
    passwordSteps: [
      'היכנס לחשבון Google שלך',
      'עבור לאבטחה ← סיסמאות לאפליקציות',
      'צור סיסמה חדשה עבור "דואר"',
      'הדבק את הקוד בן 16 התווים שמתקבל',
    ],
    passwordLink: 'https://myaccount.google.com/apppasswords',
    passwordLinkLabel: 'פתח הגדרות אבטחה של Google',
  },
  {
    id: 'outlook',
    label: 'Outlook / Hotmail',
    host: 'imap-mail.outlook.com',
    port: 993,
    passwordGuide: 'השתמש בסיסמה הרגילה שלך, או אם יש לך אימות דו-שלבי — צור סיסמת אפליקציה.',
    passwordSteps: [
      'היכנס לחשבון Microsoft שלך',
      'עבור לאבטחה ← אפשרויות אבטחה מתקדמות',
      'תחת "סיסמאות לאפליקציות" צור סיסמה חדשה',
    ],
    passwordLink: 'https://account.microsoft.com/security',
    passwordLinkLabel: 'פתח הגדרות אבטחה של Microsoft',
  },
  {
    id: 'yahoo',
    label: 'Yahoo',
    host: 'imap.mail.yahoo.com',
    port: 993,
    passwordGuide: 'Yahoo דורש סיסמת אפליקציה.',
    passwordSteps: [
      'היכנס לחשבון Yahoo שלך',
      'עבור לאבטחת חשבון',
      'לחץ על "צור סיסמת אפליקציה"',
    ],
    passwordLink: 'https://login.yahoo.com/account/security',
    passwordLinkLabel: 'פתח הגדרות אבטחה של Yahoo',
  },
  {
    id: 'icloud',
    label: 'iCloud',
    host: 'imap.mail.me.com',
    port: 993,
    passwordGuide: 'iCloud דורש סיסמת אפליקציה.',
    passwordSteps: [
      'היכנס לחשבון Apple שלך ב-appleid.apple.com',
      'תחת "כניסה ואבטחה" לחץ על "סיסמאות לאפליקציות"',
      'לחץ על + ליצירת סיסמה חדשה',
    ],
    passwordLink: 'https://appleid.apple.com',
    passwordLinkLabel: 'פתח Apple ID',
  },
  {
    id: 'walla',
    label: 'Walla',
    host: 'imap.walla.co.il',
    port: 993,
    passwordGuide: 'השתמש בסיסמה הרגילה של חשבון Walla שלך.',
    passwordSteps: [],
    passwordLink: null,
    passwordLinkLabel: null,
  },
  {
    id: 'custom',
    label: 'אחר',
    host: '',
    port: 993,
    passwordGuide: 'השתמש בסיסמה הרגילה שלך, או בסיסמת אפליקציה אם הספק דורש זאת.',
    passwordSteps: [],
    passwordLink: null,
    passwordLinkLabel: null,
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState('gmail')
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState(993)
  const [emailUser, setEmailUser] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const provider = PROVIDERS.find(p => p.id === selectedProvider) ?? PROVIDERS[0]

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: user, error: userError } = await supabase
        .from('users').select('account_id').eq('id', session.user.id).single()
      if (userError || !user) { router.replace('/login'); return }

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('email_imap_host, email_imap_port, email_user, email_password')
        .eq('id', user.account_id).single()
      if (accountError || !account) { router.replace('/login'); return }

      setAccountId(user.account_id)

      if (account.email_imap_host) {
        const matched = PROVIDERS.find(p => p.host === account.email_imap_host)
        setSelectedProvider(matched?.id ?? 'custom')
        setImapHost(account.email_imap_host)
      }
      setImapPort(account.email_imap_port ?? 993)
      setEmailUser(account.email_user ?? '')
      setEmailPassword(account.email_password ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  function handleProviderChange(id: string) {
    setSelectedProvider(id)
    const p = PROVIDERS.find(pr => pr.id === id)
    if (p && p.id !== 'custom') {
      setImapHost(p.host)
      setImapPort(p.port)
    }
    setShowGuide(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ email_imap_host: imapHost, email_imap_port: imapPort, email_user: emailUser.trim(), email_password: emailPassword.replace(/\s/g, '') })
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
            <p className="text-gray-500 text-sm mt-1">חיבור לחשבון אימייל לקבלת חשבונות</p>
          </div>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">חזרה</a>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">ההגדרות נשמרו בהצלחה</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Provider selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ספק דואר</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedProvider === p.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* IMAP host — editable only for custom */}
          {selectedProvider === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שרת IMAP</label>
                <input type="text" value={imapHost} onChange={e => setImapHost(e.target.value)}
                  placeholder="imap.example.com" className={inputClassName} dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">פורט</label>
                <input type="number" value={imapPort} onChange={e => setImapPort(Number(e.target.value))}
                  className={inputClassName} dir="ltr" />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input type="email" value={emailUser} onChange={e => setEmailUser(e.target.value)}
              className={inputClassName} dir="ltr" />
          </div>

          {/* Password + guide */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">סיסמה</label>
              <button
                type="button"
                onClick={() => setShowGuide(g => !g)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showGuide ? 'הסתר הוראות' : 'איך מקבלים סיסמה?'}
              </button>
            </div>

            {showGuide && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2 text-sm text-gray-700">
                <p className="font-medium mb-2">{provider.passwordGuide}</p>
                {provider.passwordSteps.length > 0 && (
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    {provider.passwordSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
                {provider.passwordLink && (
                  <a
                    href={provider.passwordLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-blue-600 hover:underline text-xs"
                  >
                    {provider.passwordLinkLabel} ←
                  </a>
                )}
              </div>
            )}

            <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
              className={inputClassName} dir="ltr" />
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
