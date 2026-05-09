import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">プロフィール</h2>
                    <p className="mt-0.5 text-xs text-slate-500">アカウント情報・パスワードの管理</p>
                </div>
            }
        >
            <Head title="プロフィール" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/70 sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/70 sm:p-8">
                        <UpdatePasswordForm />
                    </div>

                    <div className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-6 shadow-card sm:p-8">
                        <DeleteUserForm />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
