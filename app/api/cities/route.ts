import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&q=${encodeURIComponent(q)}&limit=100`
  const res = await fetch(url)
  const data = await res.json()
  const cities = data.result.records
    .map((r: { 'שם_ישוב': string }) => r['שם_ישוב'])
    .filter((name: string) => name.trim().startsWith(q.trim()))
  return NextResponse.json(cities)
}