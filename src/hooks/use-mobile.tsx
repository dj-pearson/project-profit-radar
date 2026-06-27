import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize synchronously from the current viewport so the very first render
  // is already correct — otherwise consumers (e.g. the Dashboard mobile/desktop
  // branch) read `false` until the post-mount effect runs, causing a
  // desktop-to-mobile layout flash on first paint for mobile users.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : undefined
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
