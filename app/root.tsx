import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import * as Sentry from "@sentry/react-router";
import "./app.css";

// import syncfusion from "@syncfusion/ej2-base";
import { useEffect } from "react";
// const { registerLicense } = syncfusion;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

export function Layout({ children }: { children: React.ReactNode }) {
  // Move Syncfusion initialization to useEffect
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      // Dynamic import to avoid SSR issues
      import("@syncfusion/ej2-base")
        .then((syncfusionModule) => {
          // Syncfusion exports registerLicense as a named export
          // Try to access it directly from the module
          const registerLicense = syncfusionModule.registerLicense;

          if (registerLicense && typeof registerLicense === "function") {
            registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);
            console.log("Syncfusion license registered successfully");
          } else {
            console.error(
              "registerLicense function not found in @syncfusion/ej2-base module"
            );
            console.log("Available exports:", Object.keys(syncfusionModule));
          }
        })
        .catch((error) => {
          console.error("Failed to load Syncfusion:", error);
        });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    Sentry.captureException(error);
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
