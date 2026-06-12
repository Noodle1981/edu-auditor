import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-2xl border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-[#FE8204] focus:ring-[#FE8204] focus:ring-1 transition-all duration-200 ' +
                className
            }
            ref={localRef}
        />
    );
});

