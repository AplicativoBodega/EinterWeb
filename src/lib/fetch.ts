/**
 * API Client for BodegaEinter Backend
 * Base URL: http://localhost:3000 (configurable via VITE_API_BASE_URL)
 */

import { useState, useEffect } from 'react';

// Use relative path for API in development, absolute URL from env in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3000');

/**
 * Global fetchAPI function used throughout the application
 * Handles API requests with proper error handling and authentication
 */
export async function fetchAPI(path: string, options?: RequestInit): Promise<any> {
  // Convert /(api)/ prefix to /api/
  const normalizedPath = path.replace('/(api)/', '/api/');
  const url = `${API_BASE_URL}${normalizedPath}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Include cookies if needed
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    }

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', error.message);
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

/**
 * React hook for fetching data with loading and error states
 */
export function useFetch<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchAPI(url, options);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { data, loading, error };
}

// Make fetchAPI available globally for components that expect it
if (typeof window !== 'undefined') {
  (window as any).fetchAPI = fetchAPI;
}
