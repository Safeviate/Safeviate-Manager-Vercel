import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_LANDSCAPE_HEIGHT = 600

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px), (orientation: landscape) and (max-height: ${MOBILE_LANDSCAPE_HEIGHT}px)`
    )
    const onChange = () => {
      setIsMobile(
        window.innerWidth < MOBILE_BREAKPOINT ||
        (window.matchMedia("(orientation: landscape)").matches && window.innerHeight <= MOBILE_LANDSCAPE_HEIGHT)
      )
    }
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
