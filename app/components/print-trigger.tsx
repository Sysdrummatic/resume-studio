"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * PrintTrigger component
 * Triggers window.print() if ?print=true is present in the URL.
 */
export default function PrintTrigger() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("print") === "true") {
      // Small delay to ensure styles are applied
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return null;
}
