import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="パスワード確認" />

            <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">パスワード確認</h1>
                <p className="mt-1 text-sm text-slate-500">セキュリティのため、再度パスワードをご入力ください</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="password" value="パスワード" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1.5"
                        isFocused={true}
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <PrimaryButton className="w-full justify-center py-2.5" disabled={processing}>
                    {processing ? '送信中…' : '確認'}
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
