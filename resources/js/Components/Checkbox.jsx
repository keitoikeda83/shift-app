export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'h-4 w-4 rounded-md border-slate-300 text-brand-600 shadow-sm transition focus:ring-2 focus:ring-brand-400/40 focus:ring-offset-0 ' +
                className
            }
        />
    );
}
