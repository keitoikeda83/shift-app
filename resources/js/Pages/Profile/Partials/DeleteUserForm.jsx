import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-5 ${className}`}>
            <header>
                <h2 className="text-base font-semibold tracking-tight text-rose-700">アカウントの削除</h2>
                <p className="mt-1 text-sm text-rose-700/80">
                    アカウントを削除すると、すべてのデータが完全に削除されます。削除する前に、保存しておきたいデータをダウンロードしてください。
                </p>
            </header>

            <DangerButton onClick={confirmUserDeletion}>アカウント削除</DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal} maxWidth="sm">
                <form onSubmit={deleteUser} className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">本当にアカウントを削除しますか？</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                確認のため、現在のパスワードを入力してください。
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <InputLabel htmlFor="password" value="パスワード" className="sr-only" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            isFocused
                            placeholder="パスワード"
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={closeModal}>キャンセル</SecondaryButton>
                        <DangerButton disabled={processing}>削除する</DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
