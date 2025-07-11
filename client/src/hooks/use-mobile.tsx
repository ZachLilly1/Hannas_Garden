import { useState, useEffect } from "react";

export function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window exists (for SSR)
    if (typeof window !== "undefined") {
      const checkIfMobile = () => {
        setIsMobile(window.innerWidth < breakpoint);
      };
      
      // Initial check
      checkIfMobile();
      
      // Add event listener
      window.addEventListener("resize", checkIfMobile);
      
      // Clean up
      return () => window.removeEventListener("resize", checkIfMobile);
    }
  }, [breakpoint]);

  return isMobile;
}

export default useMobile;
