import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') ?? ''
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&q=${encodeURIComponent(q)}&limit=50`
  const res = await fetch(url)
  const data = await res.json()
  const streets = data.result.records
    .filter((r: { 'שם_ישוב': string }) => r['שם_ישוב'].trim() === city.trim())
    .map((r: { 'שם_רחוב': string }) => r['שם_רחוב'].trim())
  return NextResponse.json(streets)
}