// Root page: immediately redirect to the dashboard.
// The dashboard layout handles the auth guard and redirects to /login if needed.
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
