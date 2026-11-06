import { redirect } from 'next/navigation';

export default function TrackingPageRedirect() {
  redirect('/admin/tracking');
}
