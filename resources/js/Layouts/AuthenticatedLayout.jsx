import ApplicationHeaderLogo from '@/Components/ApplicationHeaderLogo';
import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    const initial = user?.name ? user.name.charAt(0) : '?';

    return (
        <div className="min-h-screen">
            <nav className="glass sticky top-0 z-30 border-b border-slate-200/70">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center">
                            <Link href="/" className="rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400">
                                <ApplicationHeaderLogo />
                            </Link>
                        </div>

                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-semibold text-white">
                                            {initial}
                                        </span>
                                        <span className="max-w-[10rem] truncate">{user.name}</span>
                                        <svg
                                            className="h-4 w-4 text-slate-400"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                                        <div className="truncate text-xs text-slate-500">{user.email}</div>
                                    </div>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        プロフィール
                                    </Dropdown.Link>
                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    >
                                        ログアウト
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown((s) => !s)
                                }
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-500 transition hover:bg-white hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                aria-label="メニュー"
                            >
                                <svg
                                    className="h-5 w-5"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' border-t border-slate-200/70 sm:hidden'}>
                    <div className="space-y-3 px-4 pb-4 pt-3">
                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-semibold text-white">
                                {initial}
                            </span>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                                <div className="truncate text-xs text-slate-500">{user.email}</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>
                                プロフィール
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                                ログアウト
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="border-b border-slate-200/70 bg-white/40">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
