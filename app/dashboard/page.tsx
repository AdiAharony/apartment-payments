'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PAYMENT_LABELS: Record<string, string> = {
  arnona: 'ארנונה',
  water: 'מים',
  gas: 'גז',
  electricity: 'חשמל',
}

const PAYMENT_ICONS: Record<string, string> = {
  arnona: '🏛️',
  water: '💧',
  gas: '🔥',
  electricity: '⚡',
}

type Payment = {
  id: string
  type: string
  amount: number | null
  due_date: string | null
  status: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [userId, setUserId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [history, setHistory] = useState<Payment[]>([])
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState<string | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [savingAmount, setSavingAmount] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('full_name, account_id')
        .eq('id', session.user.id)
        .single()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', user.account_id)
        .single()

      if (accountError || !account) {
        router.replace('/login')
        return
      }

      setUserId(session.user.id)
      setAccountId(user.account_id)
      setFullName(user.full_name)
      setAccountName(account.name)

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, type, amount, due_date, status')
        .eq('account_id', user.account_id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })

      const { data: historyData } = await supabase
        .from('payments')
        .select('id, type, amount, due_date, status')
        .eq('account_id', user.account_id)
        .eq('status', 'paid')
        .order('due_date', { ascending: false })
        .limit(20)

      setPayments(paymentsData ?? [])
      setHistory(historyData ?? [])
      setLoading(false)
    }

    loadDashboard()
  }, [router])

  async function handleMarkPaid(paymentId: string) {
    setMarkingPaid(paymentId)
    await supabase
      .from('payments')
      .update({ status: 'paid', paid_by: userId, paid_at: new Date().toISOString() })
      .eq('id', paymentId)
    setPayments(prev => prev.filter(p => p.id !== paymentId))
    setMarkingPaid(null)
  }

  async function handleSaveAmount(paymentId: string) {
    const amount = parseFloat(amountInput)
    if (isNaN(amount)) return
    setSavingAmount(true)
    await supabase
      .from('payments')
      .update({ amount })
      .eq('id', paymentId)
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, amount } : p))
    setEditingAmount(null)
    setAmountInput('')
    setSavingAmount(false)
  }

  async function handleGenerateInvite() {
    setGenerating(true)
    const { data, error } = await supabase
      .from('invitations')
      .insert({ account_id: accountId, created_by: userId })
      .select('token')
      .single()
    if (!error && data) {
      setInviteUrl(`${window.location.origin}/invite/${data.token}`)
    }
    setGenerating(false)
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function formatDueDate(due_date: string | null) {
    if (!due_date) return null
    const d = new Date(due_date)
    return d.toLocaleDateString('he-IL')
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
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md relative">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">שלום, {fullName}</h1>
          <a
            href="/settings"
            className="border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            הגדרות
          </a>
        </div>
        <p className="text-gray-500 mb-6 text-sm">{accountName}</p>

        {/* Pending payments */}
        {payments.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
            אין תשלומים פעילים כרגע
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {payments.map(payment => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{PAYMENT_ICONS[payment.type] ?? '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {PAYMENT_LABELS[payment.type] ?? payment.type}
                      </p>
                      {payment.due_date && (
                        <p className="text-xs text-gray-500">לתשלום עד {formatDueDate(payment.due_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    {payment.amount != null ? (
                      <p className="text-sm font-semibold text-gray-900">
                        ₪{payment.amount.toLocaleString('he-IL')}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">סכום לא ידוע</p>
                    )}
                  </div>
                </div>

                {/* Enter amount inline */}
                {payment.amount == null && (
                  <div className="mt-3">
                    {editingAmount === payment.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountInput}
                          onChange={e => setAmountInput(e.target.value)}
                          placeholder="הזן סכום"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAmount(payment.id)}
                          disabled={savingAmount}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingAmount ? '...' : 'שמור'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingAmount(null); setAmountInput('') }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingAmount(payment.id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        הזן סכום
                      </button>
                    )}
                  </div>
                )}

                {/* Mark as paid */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(payment.id)}
                    disabled={markingPaid === payment.id}
                    className="w-full border border-gray-300 text-gray-700 rounded-lg py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {markingPaid === payment.id ? 'מעדכן...' : 'סמן כשולם'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">היסטוריית תשלומים</h2>
            <div className="flex flex-col gap-2">
              {history.map(payment => (
                <div key={payment.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span>{PAYMENT_ICONS[payment.type] ?? '📄'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{PAYMENT_LABELS[payment.type] ?? payment.type}</p>
                      {payment.due_date && (
                        <p className="text-xs text-gray-400">{formatDueDate(payment.due_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.amount != null && (
                      <span className="text-sm text-gray-600">₪{payment.amount.toLocaleString('he-IL')}</span>
                    )}
                    <span className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">שולם</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite */}
        <div className="border border-gray-200 rounded-lg p-4 mt-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">הזמנת דיירים</h2>
          <button
            type="button"
            onClick={handleGenerateInvite}
            disabled={generating}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'יוצר קישור...' : 'צור קישור הזמנה'}
          </button>
          {inviteUrl && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  dir="ltr"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  {copied ? 'הועתק!' : 'העתק'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 w-full border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
        >
          התנתקות
        </button>
      </div>
    </main>
  )
}
