import { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';

export default function LoginAndRegister() {
    const [isLogin, setIsLogin] = useState(true);

    const loginForm = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const registerForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            loginForm.reset('password');
            registerForm.reset('password', 'password_confirmation');
        };
    }, []);

    const submitLogin = (e) => {
        e.preventDefault();
        loginForm.post('/login');
    };

    const submitRegister = (e) => {
        e.preventDefault();
        registerForm.post('/register');
    };

    return (
        <GuestLayout>
            <Head title={isLogin ? "ログイン" : "新規アカウント作成"} />

            <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                    {isLogin ? 'おかえりなさい' : 'はじめまして'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isLogin ? 'アカウントにサインインしてください' : 'アカウントを作成してシフト管理を始めましょう'}
                </p>
            </div>

            {/* タブ切り替え（セグメント型） */}
            <div className="segmented mx-auto mb-6 grid w-full grid-cols-2">
                <button
                    type="button"
                    className={`segmented-item ${isLogin ? 'segmented-item-active' : 'hover:text-slate-900'}`}
                    onClick={() => setIsLogin(true)}
                >
                    ログイン
                </button>
                <button
                    type="button"
                    className={`segmented-item ${!isLogin ? 'segmented-item-active' : 'hover:text-slate-900'}`}
                    onClick={() => setIsLogin(false)}
                >
                    新規登録
                </button>
            </div>

            {isLogin ? (
                <form onSubmit={submitLogin} className="space-y-4 animate-fadeIn">
                    <div>
                        <InputLabel htmlFor="login_email" value="メールアドレス" />
                        <TextInput
                            id="login_email"
                            type="email"
                            name="email"
                            value={loginForm.data.email}
                            className="mt-1.5"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => loginForm.setData('email', e.target.value)}
                        />
                        <InputError message={loginForm.errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="login_password" value="パスワード" />
                        <TextInput
                            id="login_password"
                            type="password"
                            name="password"
                            value={loginForm.data.password}
                            className="mt-1.5"
                            autoComplete="current-password"
                            onChange={(e) => loginForm.setData('password', e.target.value)}
                        />
                        <InputError message={loginForm.errors.password} className="mt-2" />
                    </div>

                    <PrimaryButton className="mt-2 w-full justify-center py-2.5" disabled={loginForm.processing}>
                        {loginForm.processing ? '送信中…' : 'ログイン'}
                    </PrimaryButton>
                </form>
            ) : (
                <form onSubmit={submitRegister} className="space-y-4 animate-fadeIn">
                    <div>
                        <InputLabel htmlFor="register_name" value="お名前" />
                        <TextInput
                            id="register_name"
                            name="name"
                            value={registerForm.data.name}
                            className="mt-1.5"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => registerForm.setData('name', e.target.value)}
                            required
                        />
                        <InputError message={registerForm.errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="register_email" value="メールアドレス" />
                        <TextInput
                            id="register_email"
                            type="email"
                            name="email"
                            value={registerForm.data.email}
                            className="mt-1.5"
                            autoComplete="username"
                            onChange={(e) => registerForm.setData('email', e.target.value)}
                            required
                        />
                        <InputError message={registerForm.errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="register_password" value="パスワード" />
                        <TextInput
                            id="register_password"
                            type="password"
                            name="password"
                            value={registerForm.data.password}
                            className="mt-1.5"
                            autoComplete="new-password"
                            onChange={(e) => registerForm.setData('password', e.target.value)}
                            required
                        />
                        <InputError message={registerForm.errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="パスワード（確認用）" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={registerForm.data.password_confirmation}
                            className="mt-1.5"
                            autoComplete="new-password"
                            onChange={(e) => registerForm.setData('password_confirmation', e.target.value)}
                            required
                        />
                        <InputError message={registerForm.errors.password_confirmation} className="mt-2" />
                    </div>

                    <PrimaryButton className="mt-2 w-full justify-center py-2.5" disabled={registerForm.processing}>
                        {registerForm.processing ? '送信中…' : 'アカウントを作成する'}
                    </PrimaryButton>
                </form>
            )}
        </GuestLayout>
    );
}
