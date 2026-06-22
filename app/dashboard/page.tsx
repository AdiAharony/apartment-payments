'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
      setLoading(false)
    }

    loadDashboard()
  }, [router])

  async function handleGenerateInvite() {
    setGenerating(true)
    const { data, error } = await supabase
      .from('invitations')
      .insert({ account_id: accountId, created_by: userId })
      .select('token')
      .single()
    if (!error && data) {
      setInviteUrl(`http://localhost:3000/invite/${data.token}`)
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">שלום, {fullName}</h1>
        <p className="text-gray-500 mb-6 text-sm">{accountName}</p>

        <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
          אין תשלומים פעילים כרגע
        </div>

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
