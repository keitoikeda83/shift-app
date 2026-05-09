import { Head, Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

const FEATURES = [
    {
        title: 'シンプルな申請',
        body: 'カレンダーから日付をタップするだけ。一括選択にも対応し、まとめて希望を提出できます。',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        ),
    },
    {
        title: '直感的な確定フロー',
        body: '未確定 → 仮シフト → 確定 の3ステップで、月末の確定作業もワンクリックで完了します。',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        ),
    },
    {
        title: 'ゴミ箱で安心',
        body: '誤削除はゴミ箱から復元できます。月や従業員でフィルターして、必要なシフトをすぐに見つけられます。',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        ),
    },
];

export default function Welcome({ auth, laravelVersion, phpVersion }) {
    return (
        <>
            <Head title="麦源シフト" />

            <div className="relative min-h-screen overflow-hidden">
                {/* 装飾グラデーション */}
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px]">
                    <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-brand-300/30 blur-3xl"></div>
                    <div className="absolute -right-20 top-32 h-[380px] w-[380px] rounded-full bg-violet-300/30 blur-3xl"></div>
                </div>

                {/* ヘッダー */}
                <header className="relative">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                        <Link href="/" className="inline-flex items-center gap-2.5">
                            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-sm shadow-brand-600/20 ring-1 ring-white/40">
                                <img src="/images/麦源ロゴ_灰色.png" alt="麦源" className="h-7 w-7 object-contain brightness-[3] saturate-0" />
                            </span>
                            <span className="text-base font-semibold tracking-tight text-slate-900">麦源シフト</span>
                        </Link>
                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-slate-800 hover:shadow-md"
                                >
                                    ダッシュボードへ
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                                    >
                                        ログイン
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 transition hover:-translate-y-px hover:shadow-md"
                                    >
                                        新規登録
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* ヒーロー */}
                <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <section className="py-16 text-center sm:py-24">
                        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            シフト管理を、もっとスマートに
                        </div>
                        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            シフト管理を
                            <span className="block bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
                                もっとシンプルに。
                            </span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                            従業員も店長も迷わない、直感的なシフト管理アプリ。<br />
                            申請から確定、CSV出力までこれひとつで。
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:-translate-y-px hover:shadow-lg"
                                >
                                    ダッシュボードを開く
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:-translate-y-px hover:shadow-lg"
                                    >
                                        ログイン
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow-md"
                                    >
                                        新規アカウント作成
                                    </Link>
                                </>
                            )}
                        </div>
                    </section>

                    {/* 特徴 */}
                    <section className="grid gap-4 pb-16 sm:grid-cols-3 sm:pb-24">
                        {FEATURES.map((f, i) => (
                            <div
                                key={i}
                                className="group rounded-2xl bg-white/80 p-6 shadow-card ring-1 ring-slate-200/70 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-card-hover"
                            >
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm shadow-brand-600/20">
                                    {f.icon}
                                </div>
                                <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">{f.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
                            </div>
                        ))}
                    </section>
                </main>

                <footer className="border-t border-slate-200/70 bg-white/40 py-6 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} 麦源シフト
                </footer>
            </div>
        </>
    );
}
