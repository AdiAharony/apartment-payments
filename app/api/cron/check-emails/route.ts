import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDERS: Record<string, string> = {
  'donotreply@onecity.org.il': 'arnona',
  'mast@outbox.co.il': 'water',
  'noreplys@dpd.iec.co.il': 'electricity',
  'invoice@amisragas.co.il': 'gas',
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data }).promise
  const pages = await Promise.all(
    Array.from({ length: doc.numPages }, (_, i) =>
      doc.getPage(i + 1).then(page => page.getTextContent())
    )
  )
  return pages
    .flatMap(content => content.items)
    .map(item => ('str' in item ? item.str ?? '' : ''))
    .join(' ')
}

function parseWater(body: string): { amount: number | null; due_date: string | null } {
  const amountMatch = body.match(/סה"כ לתשלום כולל מע"מ ([\d.]+) ₪/)
  const dueDateMatch = body.match(/תאריך אחרון לתשלום (\d{2}\.\d{2}\.\d{4})/)

  const amount = amountMatch ? parseFloat(amountMatch[1]) : null
  let due_date: string | null = null
  if (dueDateMatch) {
    const [day, month, year] = dueDateMatch[1].split('.')
    due_date = `${year}-${month}-${day}`
  }
  return { amount, due_date }
}

function parseElectricity(text: string): { amount: number | null; due_date: string | null } {
  const amountMatch = text.match(/([\d,]+\.?\d*)\s+סה"כ לתשלום/)
  const dueDateMatch = text.match(/יש לשלם חשבון זה עד\s*\.\s*(\d{2}\/\d{2}\/\d{4})/)

  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null
  let due_date: string | null = null
  if (dueDateMatch) {
    const [day, month, year] = dueDateMatch[1].split('/')
    due_date = `${year}-${month}-${day}`
  }
  return { amount, due_date }
}

function parseGas(text: string): { amount: number | null; due_date: string | null } {
  const amountMatch = text.match(/(\d+\.\d+)\s*יתרה/)
  const dueDateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*\d{6}/)

  const amount = amountMatch ? parseFloat(amountMatch[1]) : null
  let due_date: string | null = null
  if (dueDateMatch) {
    const [day, month, year] = dueDateMatch[1].split('/')
    due_date = `${year}-${month}-${day}`
  }
  return { amount, due_date }
}

async function processAccount(account: {
  id: string
  email_imap_host: string
  email_imap_port: number
  email_user: string
  email_password: string
}): Promise<{ processed: number; errors: string[] }> {
  const client = new ImapFlow({
    host: account.email_imap_host,
    port: account.email_imap_port,
    secure: true,
    auth: {
      user: account.email_user,
      pass: account.email_password,
    },
    logger: false,
    socketTimeout: 10000,
    connectionTimeout: 10000,
  })

  let processed = 0
  const errors: string[] = []

  await client.connect()

  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const senderAddresses = Object.keys(SENDERS)
      let allSeqs: number[] = []
      for (const sender of senderAddresses) {
        const result = await client.search({ from: sender })
        if (Array.isArray(result)) {
          // Only take the last 10 per sender to keep it fast
          allSeqs = allSeqs.concat(result.slice(-10))
        }
      }
      if (!allSeqs.length) return { processed, errors }
      const uniqueSeqs = [...new Set(allSeqs)]
      for await (const message of client.fetch(uniqueSeqs, { envelope: true, bodyStructure: true, source: true })) {
        const from = message.envelope?.from?.[0]?.address?.toLowerCase() ?? ''
        const type = SENDERS[from]
        if (!type) continue

        let amount: number | null = null
        let due_date: string | null = null

        try {
          if (type === 'arnona') {
            // No parseable amount
          } else if (type === 'water') {
            const body = message.source?.toString('utf-8') ?? ''
            ;({ amount, due_date } = parseWater(body))
          } else if (type === 'electricity' || type === 'gas') {
            // Find PDF attachment
            const parts = message.bodyStructure?.childNodes ?? []
            for (const part of parts) {
              if (part.type?.toLowerCase().includes('pdf') || part.disposition?.toLowerCase() === 'attachment') {
                const partData = await client.download(String(message.seq), part.part, { uid: false })
                const chunks: Buffer[] = []
                for await (const chunk of partData.content) {
                  chunks.push(chunk)
                }
                const pdfBuffer = Buffer.concat(chunks)
                const text = await extractPdfText(pdfBuffer)
                if (type === 'electricity') {
                  ;({ amount, due_date } = parseElectricity(text))
                } else {
                  ;({ amount, due_date } = parseGas(text))
                }
                break
              }
            }
          }

          // Skip if payment with same type+due_date already exists
          const dupQuery = supabase
            .from('payments')
            .select('id')
            .eq('account_id', account.id)
            .eq('type', type)
          if (due_date) {
            dupQuery.eq('due_date', due_date)
          } else {
            dupQuery.is('due_date', null)
          }
          const { data: existing } = await dupQuery.maybeSingle()
          if (existing) continue

          await supabase.from('payments').insert({
            account_id: account.id,
            type,
            amount,
            due_date,
            status: 'pending',
            source: 'email',
          })

          // Mark as read
          await client.messageFlagsAdd(String(message.seq), ['\\Seen'], { uid: false })
          processed++
        } catch (err) {
          errors.push(`${type}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return { processed, errors }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, email_imap_host, email_imap_port, email_user, email_password')
    .not('email_user', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Record<string, { processed: number; errors: string[] }> = {}

  for (const account of accounts ?? []) {
    try {
      results[account.id] = await processAccount(account)
    } catch (err) {
      results[account.id] = {
        processed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
