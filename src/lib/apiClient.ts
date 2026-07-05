/**
 * Unified API Client for OdyShareSync
 * Consolidates all authorization and context headers (Authorization, x-user-id, x-trip-id)
 * and guarantees a strong, typed ApiResponse<T> interface.
 */

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

class ApiClient {
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };

    // 1. Authorization Token
    const token = localStorage.getItem("sessionToken");
    if (token && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 2. Contextual headers
    const userId = localStorage.getItem("loggedInUserId");
    if (userId && !headers["x-user-id"]) {
      headers["x-user-id"] = userId;
    }

    const tripId = localStorage.getItem("activeTripId");
    if (tripId && !headers["x-trip-id"]) {
      headers["x-trip-id"] = tripId;
    }

    return headers;
  }

  async request<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const headers = this.getHeaders(options.headers as Record<string, string> || {});
    
    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
      body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body,
      });

      if (response.status === 401) {
        // Soft-handle session expiry
        console.warn("[apiClient] Session expired or unauthorized (401).");
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Fallback if server returned text or HTML
        const text = await response.text();
        return {
          success: false,
          error: {
            code: "INVALID_RESPONSE",
            message: text || `Server returned status code ${response.status}`,
          },
        };
      }

      const json = await response.json();
      return json as ApiResponse<T>;
    } catch (error: any) {
      console.error(`[apiClient] Request to ${url} failed:`, error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error.message || "Network request failed. Please check your connection.",
        },
      };
    }
  }

  get<T = any>(url: string, options: Omit<RequestOptions, 'body' | 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  post<T = any>(url: string, body?: any, options: Omit<RequestOptions, 'body' | 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "POST", body });
  }

  put<T = any>(url: string, body?: any, options: Omit<RequestOptions, 'body' | 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "PUT", body });
  }

  delete<T = any>(url: string, options: Omit<RequestOptions, 'body' | 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
