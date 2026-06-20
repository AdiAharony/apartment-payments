'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [buildingNumber, setBuildingNumber] = useState('')
  const [apartmentNumber, setApartmentNumber] = useState('')

  function buildApartmentName() {
    let name = `${street} ${buildingNumber}`.trim()
    if (apartmentNumber) name += ` דירה ${apartmentNumber}`
    name += `, ${city}`
    return name
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!city || !street) {
      setError('יש לבחור עיר ורחוב')
      return
    }

    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const apartmentName = buildApartmentName()

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError || !authData.user) {
      setError(authError?.message ?? 'Registration failed')
      setLoading(false)
      return
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({ name: apartmentName })
      .select()
      .single()
    if (accountError || !account) {
      setError('Failed to create apartment account')
      setLoading(false)
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({ id: authData.user.id, account_id: account.id, full_name: fullName })
    if (userError) {
      setError('Failed to create user profile')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md relative">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">הרשמה</h1>
        <p className="text-gray-500 mb-6 text-sm">צור חשבון חדש לדירה שלך</p>

        <RegisterForm
          error={error}
          loading={loading}
          city={city}
          street={street}
          buildingNumber={buildingNumber}
          apartmentNumber={apartmentNumber}
          onCityChange={setCity}
          onStreetChange={setStreet}
          onBuildingNumberChange={setBuildingNumber}
          onApartmentNumberChange={setApartmentNumber}
          onSubmit={handleSubmit}
        />

        <p className="text-sm text-center text-gray-500 mt-4">
          כבר יש לך חשבון?{' '}
          <a href="/login" className="text-blue-600 hover:underline">התחברות</a>
        </p>
      </div>
    </main>
  )
}
