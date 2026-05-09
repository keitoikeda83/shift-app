import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
            <Link href="/" className="rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400">
                <ApplicationLogo />
            </Link>

            <div className="mt-8 w-full max-w-md overflow-hidden rounded-2xl bg-white px-6 py-8 shadow-card ring-1 ring-slate-200/70 sm:px-8">
                {children}
            </div>

            <p className="mt-6 text-xs text-slate-400">
                © {new Date().getFullYear()} 麦源シフト
            </p>
        </div>
    );
}
