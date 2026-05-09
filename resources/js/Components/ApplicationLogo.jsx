export default function ApplicationLogo({ className = '', ...props }) {
    return (
        <span className={`inline-flex flex-col items-center gap-3 ${className}`} {...props}>
            <span className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-card ring-1 ring-white/40">
                <img
                    src="/images/麦源ロゴ_灰色.png"
                    alt="麦源"
                    className="h-14 w-14 object-contain brightness-[3] saturate-0"
                />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-800">
                麦源シフト
            </span>
        </span>
    );
}
