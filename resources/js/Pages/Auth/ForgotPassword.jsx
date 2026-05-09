import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="パスワード再設定" />

            <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">パスワード再設定</h1>
                <p className="mt-1 text-sm text-slate-500">
                    登録メールアドレスに再設定リンクを送信します
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="email" value="メールアドレス" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1.5"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <PrimaryButton className="w-full justify-center py-2.5" disabled={processing}>
                    {processing ? '送信中…' : '再設定リンクを送信'}
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
