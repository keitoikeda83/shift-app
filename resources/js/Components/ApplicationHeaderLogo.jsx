export default function ApplicationHeaderLogo({ className = '', ...props }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`} {...props}>
            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-sm shadow-brand-600/20 ring-1 ring-white/40">
                <img
                    src="/images/麦源ロゴ_灰色.png"
                    alt="麦源"
                    className="h-7 w-7 object-contain brightness-[3] saturate-0"
                />
            </span>
            <span className="hidden text-base font-semibold tracking-tight text-slate-800 sm:block">
                麦源シフト
            </span>
        </span>
    );
}
