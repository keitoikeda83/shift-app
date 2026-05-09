export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={'text-xs font-medium text-rose-600 ' + className}
        >
            {message}
        </p>
    ) : null;
}
