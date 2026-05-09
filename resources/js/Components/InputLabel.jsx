export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-xs font-semibold uppercase tracking-wide text-slate-500 ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
