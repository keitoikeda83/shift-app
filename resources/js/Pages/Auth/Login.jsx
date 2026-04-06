import { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';

export default function LoginAndRegister() {
    // ログイン画面か新規登録画面かを切り替えるステート
    const [isLogin, setIsLogin] = useState(true);

    // ログイン用のフォームデータ
    const loginForm = useForm({
        email: '',
        password: '',
        remember: false,
    });

    // 新規登録用のフォームデータ
    const registerForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    // クリーンアップ処理（パスワードをリセット）
    useEffect(() => {
        return () => {
            loginForm.reset('password');
            registerForm.reset('password', 'password_confirmation');
        };
    }, []);

    // ログイン処理の送信
    const submitLogin = (e) => {
        e.preventDefault();
        loginForm.post('/login');
    };

    // 新規登録処理の送信
    const submitRegister = (e) => {
        e.preventDefault();
        registerForm.post('/register');
    };

    return (
        <GuestLayout>
            <Head title={isLogin ? "ログイン" : "新規アカウント作成"} />

            <div className="">
                {/* タブ切り替えボタン */}
                <div className="flex justify-center space-x-8 mb-8 border-b pb-2">
                    <button
                        className={`text-lg font-bold pb-2 transition-colors ${
                            isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setIsLogin(true)}
                    >
                        ログイン
                    </button>
                    <button
                        className={`text-lg font-bold pb-2 transition-colors ${
                            !isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setIsLogin(false)}
                    >
                        新規登録
                    </button>
                </div>

                {isLogin ? (
                    /* ======== ログインフォーム ======== */
                    <form onSubmit={submitLogin} className="animate-fadeIn">
                        <div>
                            <InputLabel htmlFor="login_email" value="メールアドレス" />
                            <TextInput
                                id="login_email"
                                type="email"
                                name="email"
                                value={loginForm.data.email}
                                className="mt-1 block w-full"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => loginForm.setData('email', e.target.value)}
                            />
                            <InputError message={loginForm.errors.email} className="mt-2" />
                        </div>

                        <div className="mt-4">
                            <InputLabel htmlFor="login_password" value="パスワード" />
                            <TextInput
                                id="login_password"
                                type="password"
                                name="password"
                                value={loginForm.data.password}
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                onChange={(e) => loginForm.setData('password', e.target.value)}
                            />
                            <InputError message={loginForm.errors.password} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-end mt-6">
                            <PrimaryButton className="w-full justify-center" disabled={loginForm.processing}>
                                ログイン
                            </PrimaryButton>
                        </div>
                    </form>
                ) : (
                    /* ======== 新規アカウント作成フォーム ======== */
                    <form onSubmit={submitRegister} className="animate-fadeIn">
                        <div>
                            <InputLabel htmlFor="register_name" value="お名前" />
                            <TextInput
                                id="register_name"
                                name="name"
                                value={registerForm.data.name}
                                className="mt-1 block w-full"
                                autoComplete="name"
                                isFocused={true}
                                onChange={(e) => registerForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={registerForm.errors.name} className="mt-2" />
                        </div>

                        <div className="mt-4">
                            <InputLabel htmlFor="register_email" value="メールアドレス" />
                            <TextInput
                                id="register_email"
                                type="email"
                                name="email"
                                value={registerForm.data.email}
                                className="mt-1 block w-full"
                                autoComplete="username"
                                onChange={(e) => registerForm.setData('email', e.target.value)}
                                required
                            />
                            <InputError message={registerForm.errors.email} className="mt-2" />
                        </div>

                        <div className="mt-4">
                            <InputLabel htmlFor="register_password" value="パスワード" />
                            <TextInput
                                id="register_password"
                                type="password"
                                name="password"
                                value={registerForm.data.password}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                onChange={(e) => registerForm.setData('password', e.target.value)}
                                required
                            />
                            <InputError message={registerForm.errors.password} className="mt-2" />
                        </div>

                        <div className="mt-4">
                            <InputLabel htmlFor="password_confirmation" value="パスワード（確認用）" />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={registerForm.data.password_confirmation}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                onChange={(e) => registerForm.setData('password_confirmation', e.target.value)}
                                required
                            />
                            <InputError message={registerForm.errors.password_confirmation} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-end mt-6">
                            <PrimaryButton className="w-full justify-center" disabled={registerForm.processing}>
                                アカウントを作成する
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </div>
        </GuestLayout>
    );
}