import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'eval-selesai-001' }),
}));

// eslint-disable-next-line import/first
import HasilEvaluasiPage from '../page';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HasilEvaluasiPage />
    </QueryClientProvider>
  );
}

describe('HasilEvaluasiPage (P-05 placeholder)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvaluasiState();
  });
  afterAll(() => server.close());

  test('renders placeholder content and an active "Kirim ke Manager" button for a selesai evaluasi', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pengadaan ATK Semester II')).toBeInTheDocument();
    });
    expect(screen.getByText('Hasil evaluasi akan muncul di sini.')).toBeInTheDocument();

    const btn = screen.getByTestId('kirim-approval-btn');
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent('Kirim ke Manager untuk Approval');
  });

  test('clicking the button sends the evaluasi to approval and disables itself', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kirim-approval-btn')).not.toBeDisabled();
    });

    await userEvent.click(screen.getByTestId('kirim-approval-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('kirim-approval-btn')).toBeDisabled();
    });
    expect(screen.getByTestId('kirim-approval-btn')).toHaveTextContent('Sudah dikirim — menunggu persetujuan');
  });
});
