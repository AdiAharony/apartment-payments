import { SearchableDropdown } from '@/components/searchable-dropdown'

const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

async function fetchCities(query: string): Promise<string[]> {
  const res = await fetch(`/api/cities?q=${encodeURIComponent(query.trim())}`)
  return res.json()
}

async function fetchStreets(city: string, query: string): Promise<string[]> {
  const res = await fetch(
    `/api/streets?city=${encodeURIComponent(city.trim())}&q=${encodeURIComponent(query.trim())}`
  )
  return res.json()
}

type AddressFieldsProps = {
  city: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  onCityChange: (val: string) => void
  onStreetChange: (val: string) => void
  onBuildingNumberChange: (val: string) => void
  onApartmentNumberChange: (val: string) => void
}

export function AddressFields({
  city,
  street,
  buildingNumber,
  apartmentNumber,
  onCityChange,
  onStreetChange,
  onBuildingNumberChange,
  onApartmentNumberChange,
}: AddressFieldsProps) {
  return (
    <>
      <hr className="my-1" />
      <p className="text-xs text-gray-400 -mt-2">כתובת הדירה</p>

      <div className="relative">
        <SearchableDropdown
          label="עיר"
          placeholder="הקלד שם עיר..."
          value={city}
          onChange={val => {
            onCityChange(val)
            onStreetChange('')
          }}
          fetchOptions={fetchCities}
        />
      </div>

      <div className="relative">
        <SearchableDropdown
          label="רחוב"
          placeholder={city ? 'הקלד שם רחוב...' : 'בחר עיר קודם'}
          value={street}
          onChange={onStreetChange}
          fetchOptions={q => fetchStreets(city, q)}
          disabled={!city}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">מספר בית</label>
          <input
            type="number"
            required
            min={1}
            value={buildingNumber}
            onChange={e => onBuildingNumberChange(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">דירה (אופציונלי)</label>
          <input
            type="number"
            min={1}
            value={apartmentNumber}
            onChange={e => onApartmentNumberChange(e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>
    </>
  )
}
