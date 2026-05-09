import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">プロフィール情報</h2>
                <p className="mt-1 text-sm text-slate-500">
                    アカウントのプロフィール情報とメールアドレスを更新します
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="お名前" />
                    <TextInput
                        id="name"
                        className="mt-1.5"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="メールアドレス" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1.5"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-inset ring-amber-200">
                        <p className="text-amber-800">
                            メールアドレスが未認証です。
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="font-semibold text-amber-900 underline-offset-2 hover:underline"
                            >
                                認証メールを再送信
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <p className="mt-2 text-emerald-700">
                                新しい認証リンクを送信しました
                            </p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-1">
                    <PrimaryButton disabled={processing}>保存</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-x-1"
                        enterTo="opacity-100 translate-x-0"
                        leave="transition ease-in duration-150"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            保存しました
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
