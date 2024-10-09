import { Analytics } from "@vercel/analytics/react";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Error handling for potential conflicts with browser extensions or third-party scripts
    const handleError = (event: ErrorEvent) => {
      console.error("Caught error:", event.error);
      // Prevent the error from breaking the application
      event.preventDefault();
    };

    // Handling uncaught promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Prevent the error from breaking the application
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Logging for debugging purposes
    console.log("Window ethereum object:", (window as any).ethereum);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
