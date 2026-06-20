import { UserDetailsFields } from './user-details-fields'
import { AddressFields } from './address-fields'

type RegisterFormProps = {
  error: string | null
  loading: boolean
  city: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  onCityChange: (val: string) => void
  onStreetChange: (val: string) => void
  onBuildingNumberChange: (val: string) => void
  onApartmentNumberChange: (val: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function RegisterForm({
  error,
  loading,
  city,
  street,
  buildingNumber,
  apartmentNumber,
  onCityChange,
  onStreetChange,
  onBuildingNumberChange,
  onApartmentNumberChange,
  onSubmit,
}: RegisterFormProps) {
  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <UserDetailsFields />

        <AddressFields
          city={city}
          street={street}
          buildingNumber={buildingNumber}
          apartmentNumber={apartmentNumber}
          onCityChange={onCityChange}
          onStreetChange={onStreetChange}
          onBuildingNumberChange={onBuildingNumberChange}
          onApartmentNumberChange={onApartmentNumberChange}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
        >
          {loading ? 'רושם...' : 'הרשמה'}
        </button>
      </form>
    </>
  )
}
