import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Fetch Interceptor to append Authorization header to all api requests if sessionToken exists
const originalFetch = window.fetch;
const interceptedFetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input && typeof input === "object" && "url" in input) {
    url = (input as any).url;
  }

  if (
    url &&
    (url.startsWith("/api/") || url.includes("/api/")) &&
    !url.includes("/api/auth/login") &&
    !url.includes("/api/auth/register") &&
    !url.includes("/api/auth/verify-email")
  ) {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      init = init || {};
      if (!init.headers) {
        init.headers = {};
      }

      if (init.headers instanceof Headers) {
        if (!init.headers.has("Authorization")) {
          init.headers.set("Authorization", `Bearer ${token}`);
        }
      } else if (Array.isArray(init.headers)) {
        const hasAuth = init.headers.some(([key]) => key.toLowerCase() === "authorization");
        if (!hasAuth) {
          init.headers.push(["Authorization", `Bearer ${token}`]);
        }
      } else {
        const record = init.headers as Record<string, string>;
        const hasAuth = Object.keys(record).some(k => k.toLowerCase() === "authorization");
        if (!hasAuth) {
          record["Authorization"] = `Bearer ${token}`;
        }
      }
    }
  }

  return originalFetch(input, init);
};

try {
  Object.defineProperty(window, "fetch", {
    value: interceptedFetch,
    configurable: true,
    writable: true,
    enumerable: true,
  });
} catch (e) {
  console.error("Failed to intercept window.fetch via Object.defineProperty:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
