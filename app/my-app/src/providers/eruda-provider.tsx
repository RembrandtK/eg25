"use client";

import { useEffect } from "react";

export function ErudaProvider({ children }: { children: React.ReactNode }) {
  // Disabled Eruda debug console to hide debug UI
  // useEffect(() => {
  //   // Dynamic import for client-side only
  //   import("eruda").then((eruda) => {
  //     eruda.default.init();
  //   });
  // }, []);

  return <>{children}</>;
}
