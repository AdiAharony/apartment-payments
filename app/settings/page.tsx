'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState('gmail')
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState(993)
  const [emailUser, setEmailUser] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const provider = PROVIDERS.find(p => p.id === selectedProvider) ?? PROVIDERS[0]

  useEffect(() => {
    if (searchParams.get('gmail') === 'connected') setSuccess(true)
    if (searchParams.get('error') === 'no_refresh_token') setError('לא התקבל טוקן מ-Google. נסה שוב.')
    if (searchParams.get('error') === 'missing_params') setError('שגיאה בחיבור ל-Google. נסה שוב.')
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: user, error: userError } = await supabase
        .from('users').select('account_id').eq('id', session.user.id).single()
      if (userError || !user) { router.replace('/login'); return }

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('email_imap_host, email_imap_port, email_user, email_password, gmail_refresh_token')
        .eq('id', user.account_id).single()
      if (accountError || !account) { router.replace('/login'); return }

      setAccountId(user.account_id)
      setGmailConnected(!!account.gmail_refresh_token)

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

          {/* Gmail OAuth — shown instead of email/password for Gmail */}
          {selectedProvider === 'gmail' ? (
            <div className="border border-gray-200 rounded-lg p-4">
              {gmailConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm font-medium text-gray-700">Gmail מחובר</span>
                  </div>
                  <a
                    href={`/api/auth/gmail?account_id=${accountId}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    חבר חשבון אחר
                  </a>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    חבר את חשבון Gmail שלך כדי שהמערכת תוכל לקרוא חשבונות אוטומטית.
                  </p>
                  <a
                    href={`/api/auth/gmail?account_id=${accountId}`}
                    className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    התחבר עם Google
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

          {selectedProvider !== 'gmail' && (
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
            >
              {saving ? 'שומר...' : 'שמור הגדרות'}
            </button>
          )}
        </form>
      </div>
    </main>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
