"use client";

import { App } from "@/components/App";
import { StoreProvider } from "@/lib/store";

export default function Page() {
  return (
    <StoreProvider>
      <div className="ambient" aria-hidden>
        <span className="aurora aurora-1" />
        <span className="aurora aurora-2" />
        <span className="aurora aurora-3" />
      </div>
      <div className="relative z-10">
        <App />
      </div>
    </StoreProvider>
  );
}
