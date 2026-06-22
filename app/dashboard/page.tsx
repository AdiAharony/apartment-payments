'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [accountName, setAccountName] = useState('')

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

      setFullName(user.full_name)
      setAccountName(account.name)
      setLoading(false)
    }

    loadDashboard()
  }, [router])

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
