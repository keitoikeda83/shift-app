import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-base font-medium transition ${
                active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            } focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
