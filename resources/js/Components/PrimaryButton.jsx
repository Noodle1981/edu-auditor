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
                `inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#FE8204] to-[#ff5e00] hover:from-[#ff5e00] hover:to-[#e04f00] px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition duration-200 shadow-md shadow-[#FE8204]/25 hover:shadow-lg active:scale-95 disabled:opacity-50 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

