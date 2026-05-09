export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `group inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-px hover:from-brand-500 hover:to-brand-500 hover:shadow-md hover:shadow-brand-600/30 active:translate-y-0 active:from-brand-600 active:to-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-white/80 disabled:shadow-none disabled:hover:translate-y-0 ${
                    disabled ? 'opacity-70' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
