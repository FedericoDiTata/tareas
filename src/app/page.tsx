"use client";

import { App } from "@/components/App";
import { DatosProvider } from "@/lib/store";
import { SyncProvider } from "@/lib/sync";

export default function Page() {
  return (
    <DatosProvider>
      <SyncProvider>
        <div className="ambient" aria-hidden>
          <span className="aurora aurora-1" />
          <span className="aurora aurora-2" />
          <span className="aurora aurora-3" />
        </div>
        <div className="relative z-10">
          <App />
        </div>
      </SyncProvider>
    </DatosProvider>
  );
}
