"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function AppProviders({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 30, // 30 minutes - data stays fresh longer
            gcTime: 1000 * 60 * 60,    // 1 hour - keep data in cache
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
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
        // If called without `new`, log stack and recover by returning a new instance
        const calledWithNew = (new.target !== undefined) || (this instanceof WrappedImage);
        if (!calledWithNew) {
          // Log clear warning with stack for debugging
          // eslint-disable-next-line no-console
          console.warn('[Dev] Image was called as a function instead of with `new`. Recovering by using `new Image()`.', new Error().stack);
          return new OriginalImage(...arguments);
        }
        return new OriginalImage(...arguments);
      }
      WrappedImage.prototype = OriginalImage.prototype;
      // preserve some static properties if present
      Object.getOwnPropertyNames(OriginalImage).forEach((k) => {
        try { WrappedImage[k] = OriginalImage[k]; } catch (e) {}
      });
      window.Image = WrappedImage;
    }
  } catch (e) {
    // ignore; this helper is best-effort for dev only
  }
}
