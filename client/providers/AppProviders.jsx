"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useAuthStore } from "../store/authStore";

export default function AppProviders({ children }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
           
            staleTime: 0,

            // Keep data in memory for 5 minutes after component unmounts
            gcTime: 1000 * 60 * 5,

            // Refetch when user switches back to this tab (covers missed socket events)
            refetchOnWindowFocus: true,

            // Refetch automatically when internet reconnects
            refetchOnReconnect: true,

            // Retry failed requests once before showing error
            retry: 1,

            refetchInterval: 1000 * 30,

            refetchIntervalInBackground: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}


// Development helper: detect incorrect calls to Image() (without `new`) which crash hydration
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const OriginalImage = window.Image;
    if (OriginalImage && typeof OriginalImage === 'function') {
      function WrappedImage() {
        const calledWithNew = (new.target !== undefined) || (this instanceof WrappedImage);
        if (!calledWithNew) {
          console.warn('[Dev] Image was called as a function instead of with `new`. Recovering by using `new Image()`.', new Error().stack);
          return new OriginalImage(...arguments);
        }
        return new OriginalImage(...arguments);
      }
      WrappedImage.prototype = OriginalImage.prototype;
      Object.getOwnPropertyNames(OriginalImage).forEach((k) => {
        try { WrappedImage[k] = OriginalImage[k]; } catch (e) {}
      });
      window.Image = WrappedImage;
    }
  } catch (e) {}
}
