export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 text-[#FE8204] shadow-sm focus:ring-[#FE8204] ' +
                className
            }
        />
    );
}

