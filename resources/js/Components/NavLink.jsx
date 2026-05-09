import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'relative inline-flex items-center px-1 pt-1 text-sm font-medium transition focus:outline-none ' +
                (active
                    ? 'text-slate-900 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-brand-500 after:to-violet-500 '
                    : 'text-slate-500 hover:text-slate-800 ') +
                className
            }
        >
            {children}
        </Link>
    );
}
