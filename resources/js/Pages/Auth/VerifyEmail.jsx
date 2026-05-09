import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="メール認証" />

            <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">メール認証</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    ご登録ありがとうございます。<br />
                    メールに記載されたリンクから認証を完了してください。
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    新しい認証リンクを送信しました
                </div>
            )}

            <form onSubmit={submit} className="space-y-3">
                <PrimaryButton className="w-full justify-center py-2.5" disabled={processing}>
                    {processing ? '送信中…' : '認証メールを再送信'}
                </PrimaryButton>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="block w-full text-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                    ログアウト
                </Link>
            </form>
        </GuestLayout>
    );
}
