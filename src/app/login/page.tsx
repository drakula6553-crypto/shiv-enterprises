import { redirect } from 'next/navigation';

/**
 * Login page is removed for now.
 * Redirect all requests directly to the main dashboard.
 */
export default function LoginPage() {
  redirect('/');
}
