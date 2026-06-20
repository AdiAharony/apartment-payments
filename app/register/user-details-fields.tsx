const inputClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export function UserDetailsFields() {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
        <input name="fullName" type="text" required className={inputClassName} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
        <input name="email" type="email" required className={inputClassName} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
        <input name="password" type="password" required minLength={6} className={inputClassName} />
      </div>
    </>
  )
}
