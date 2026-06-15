import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';

// ---------------------------------------------------------------------------
// vi.hoisted — must run before vi.mock factories
// ---------------------------------------------------------------------------
const mockAuthState = vi.hoisted(() => ({
  role:        'staff' as string,
  accessToken: 'mock-token',
  nama:        'Test Staff',
  email:       'test@test.com',
}));

// ---------------------------------------------------------------------------
// Mocks — hoisted automatically before module imports
// ---------------------------------------------------------------------------
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: pushMock }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/stores/authStore', () => {
  const useAuthStore = Object.assign(
    (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState }
  );
  return { useAuthStore };
});

// ---------------------------------------------------------------------------
// Import page AFTER mocks are declared
// ---------------------------------------------------------------------------
// eslint-disable-next-line import/first
import DashboardPage from '../page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DashboardPage', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    pushMock.mockClear();
    mockAuthState.role = 'staff';
  });
  afterAll(() => server.close());

  test('renders the page header', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('stat cards show correct counts from mock API', async () => {
    renderDashboard();

    // mock data: draft=2, processing=1, selesai=3, menunggu_approval=1
    await waitFor(() => {
      const values = screen.getAllByTestId('stat-value').map(el => el.textContent);
      expect(values).toContain('2'); // draft
      expect(values).toContain('1'); // processing
      expect(values).toContain('3'); // selesai
      expect(values).toContain('1'); // menunggu_approval
    });
  });

  test('renders evaluasi rows from mock API', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByTestId('evaluasi-row').length).toBeGreaterThan(0);
    });
  });

  test('navigates to /evaluasi/:id/proses when processing row is clicked', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByTestId('evaluasi-row').length).toBeGreaterThan(0);
    });

    const processingTitle = await screen.findByText('Jasa Konsultansi IT Infrastructure');
    await userEvent.click(processingTitle);

    expect(pushMock).toHaveBeenCalledWith('/evaluasi/eval-processing-001/proses');
  });

  test('navigates to /evaluasi/:id/hasil when selesai row is clicked', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByTestId('evaluasi-row').length).toBeGreaterThan(0);
    });

    const selesaiTitle = await screen.findByText('Pengadaan ATK Semester II');
    await userEvent.click(selesaiTitle);

    expect(pushMock).toHaveBeenCalledWith('/evaluasi/eval-selesai-001/hasil');
  });

  test('navigates to /evaluasi/:id/hasil when menunggu_approval row is clicked', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByTestId('evaluasi-row').length).toBeGreaterThan(0);
    });

    const approvalTitle = await screen.findByText('Pengadaan Jasa Security Audit');
    await userEvent.click(approvalTitle);

    expect(pushMock).toHaveBeenCalledWith('/evaluasi/eval-approval-001/hasil');
  });

  test('manager sees "Perlu perhatian" badge on Menunggu Approval card', async () => {
    mockAuthState.role = 'manager';
    renderDashboard();

    // Wait for summary data (menunggu_approval = 1 from mock)
    await waitFor(() => {
      const values = screen.getAllByTestId('stat-value').map(el => el.textContent);
      expect(values).toContain('1'); // menunggu_approval count loaded
    });

    expect(screen.getByText('Perlu perhatian')).toBeInTheDocument();
  });
});
