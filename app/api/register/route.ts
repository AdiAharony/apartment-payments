import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, apartmentName, fullName } = await req.json()

  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .insert({ name: apartmentName })
    .select()
    .single()
  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 })

  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert({ id: userId, account_id: account.id, full_name: fullName })
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
