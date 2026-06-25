import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

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

// --- Gmail API helpers ---

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  return data.access_token
}

async function gmailGet(accessToken: string, path: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

async function gmailPost(accessToken: string, path: string, body: object) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function decodeBase64Url(data: string): Buffer {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64')
}

type GmailPart = {
  mimeType: string
  filename?: string
  body?: { data?: string; attachmentId?: string }
  parts?: GmailPart[]
}

function extractTextBody(part: GmailPart): string {
  if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
    if (part.body?.data) return decodeBase64Url(part.body.data).toString('utf-8')
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = extractTextBody(p)
      if (text) return text
    }
  }
  return ''
}

function findPdfAttachment(part: GmailPart): { attachmentId: string } | null {
  if (
    (part.mimeType === 'application/pdf' || part.filename?.toLowerCase().endsWith('.pdf')) &&
    part.body?.attachmentId
  ) {
    return { attachmentId: part.body.attachmentId }
  }
  if (part.parts) {
    for (const p of part.parts) {
      const found = findPdfAttachment(p)
      if (found) return found
    }
  }
  return null
}

// --- Parsers ---

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

async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PDFParser = ((await import('pdf2json')) as any).default ?? (await import('pdf2json'))
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', () => {
      resolve(parser.getRawTextContent())
    })
    parser.on('pdfParser_dataError', (err: { parserError: Error }) => {
      reject(err.parserError)
    })
    parser.parseBuffer(buffer)
  })
}

// --- Debug: extract raw text from first email of each type ---

async function debugAccount(accountId: string, refreshToken: string) {
  const accessToken = await getAccessToken(refreshToken)
  const senderQuery = Object.keys(SENDERS).map(s => `from:${s}`).join(' OR ')
  const searchResult = await gmailGet(accessToken, `/messages?q=${encodeURIComponent(senderQuery)}&maxResults=8`)
  const messages: { id: string }[] = searchResult.messages ?? []
  const seen = new Set<string>()
  const samples: Record<string, string> = {}

  for (const { id } of messages) {
    const msg = await gmailGet(accessToken, `/messages/${id}?format=full`)
    const fromHeader = (msg.payload?.headers ?? []).find((h: { name: string }) => h.name.toLowerCase() === 'from')?.value ?? ''
    const fromAddress = (fromHeader.match(/<(.+?)>/) ?? [])[1]?.toLowerCase() ?? fromHeader.toLowerCase()
    const type = SENDERS[fromAddress]
    if (!type || seen.has(type)) continue
    seen.add(type)

    if (type === 'water') {
      samples[type] = extractTextBody(msg.payload).slice(0, 500)
    } else if (type === 'electricity' || type === 'gas') {
      const pdf = findPdfAttachment(msg.payload)
      if (pdf) {
        const att = await gmailGet(accessToken, `/messages/${id}/attachments/${pdf.attachmentId}`)
        const buffer = decodeBase64Url(att.data)
        samples[type] = (await extractPdfText(buffer)).slice(0, 500)
      }
    } else {
      samples[type] = '(no text needed)'
    }
  }
  return { debug: true, accountId, samples }
}

// --- Main account processor ---

async function processAccount(accountId: string, refreshToken: string): Promise<{ processed: number; errors: string[] }> {
  const accessToken = await getAccessToken(refreshToken)
  const senderQuery = Object.keys(SENDERS).map(s => `from:${s}`).join(' OR ')

  const searchResult = await gmailGet(accessToken, `/messages?q=${encodeURIComponent(senderQuery)}&maxResults=40`)
  const messages: { id: string }[] = searchResult.messages ?? []

  let processed = 0
  const errors: string[] = []

  for (const { id } of messages) {
    try {
      const msg = await gmailGet(accessToken, `/messages/${id}?format=full`)
      const fromHeader = (msg.payload?.headers ?? []).find((h: { name: string }) => h.name.toLowerCase() === 'from')?.value ?? ''
      const fromAddress = (fromHeader.match(/<(.+?)>/) ?? [])[1]?.toLowerCase() ?? fromHeader.toLowerCase()
      const type = SENDERS[fromAddress]
      if (!type) continue

      // Dedup check
      let amount: number | null = null
      let due_date: string | null = null

      if (type === 'water') {
        const body = extractTextBody(msg.payload)
        ;({ amount, due_date } = parseWater(body))
      } else if (type === 'electricity' || type === 'gas') {
        const pdf = findPdfAttachment(msg.payload)
        if (pdf) {
          const attachmentData = await gmailGet(accessToken, `/messages/${id}/attachments/${pdf.attachmentId}`)
          const buffer = decodeBase64Url(attachmentData.data)
          const text = await extractPdfText(buffer)
          if (type === 'electricity') {
            ;({ amount, due_date } = parseElectricity(text))
          } else {
            ;({ amount, due_date } = parseGas(text))
          }
        }
      }
      // arnona: amount stays null

      // Skip duplicates
      const dupQuery = supabase
        .from('payments')
        .select('id')
        .eq('account_id', accountId)
        .eq('type', type)
      if (due_date) {
        dupQuery.eq('due_date', due_date)
      } else {
        dupQuery.is('due_date', null)
      }
      const { data: existing } = await dupQuery.maybeSingle()
      if (existing) continue

      const { error: insertError } = await supabase.from('payments').insert({
        account_id: accountId,
        type,
        amount,
        due_date,
        status: 'pending',
        source: 'email',
      })

      if (insertError) {
        errors.push(`insert ${id}: ${insertError.message} (${insertError.code})`)
        continue
      }

      // Mark as read
      await gmailPost(accessToken, `/messages/${id}/modify`, { removeLabelIds: ['UNREAD'] })

      processed++
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { processed, errors }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const debug = req.nextUrl.searchParams.get('debug') === '1'

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, gmail_refresh_token')
    .not('gmail_refresh_token', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Record<string, unknown> = {}

  for (const account of accounts ?? []) {
    try {
      results[account.id] = debug
        ? await debugAccount(account.id, account.gmail_refresh_token)
        : await processAccount(account.id, account.gmail_refresh_token)
    } catch (err) {
      results[account.id] = {
        processed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
