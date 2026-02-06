import {useRef, useCallback} from 'react'

export function useThrottle<T extends (...args: never[]) => void>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const lastRan = useRef(0)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    return useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now()
            const handler = () => {
                if (now - lastRan.current >= delay) {
                    callback(...args)
                    lastRan.current = now
                } else {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current)
                    }
                    timeoutRef.current = setTimeout(
                        () => {
                            callback(...args)
                            lastRan.current = Date.now()
                        },
                        delay - (now - lastRan.current)
                    )
                }
            }

            handler()
        },
        [callback, delay]
    )
}
