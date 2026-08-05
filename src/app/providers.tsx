"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures one QueryClient per browser session rather than one
  // shared across server requests (important under the App Router).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 1000, // 15s — file listings change frequently
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "14px" },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
