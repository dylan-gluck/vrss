import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import type { ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";

/**
 * Custom render function that wraps components with all necessary providers
 *
 * Providers included:
 * - QueryClientProvider (TanStack Query for server state)
 * - BrowserRouter (React Router for navigation)
 * - Zustand stores are accessed via hooks, no provider needed
 *
 * Usage:
 * ```tsx
 * import { renderWithProviders } from '@/test/utils/render';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   // ... assertions
 * });
 * ```
 */

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Create a new QueryClient for each test to ensure isolation
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Number.POSITIVE_INFINITY, // Don't garbage collect during tests
        staleTime: Number.POSITIVE_INFINITY, // Don't refetch during tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides all necessary context providers
 */
function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Re-export everything from React Testing Library
 */
export * from "@testing-library/react";
export { renderWithProviders as render };
