import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// eslint-disable-next-line import/first
import ApprovalPage from '../page';

function renderApprovalPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalPage />
    </QueryClientProvider>
  );
}

describe('ApprovalPage', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    pushMock.mockClear();
    resetMockEvaluasiState();
  });
  afterAll(() => server.close());

  test('renders the page header and tabs', () => {
    renderApprovalPage();

    expect(screen.getByText('Approval')).toBeInTheDocument();
    expect(screen.getByTestId('tab-menunggu')).toBeInTheDocument();
    expect(screen.getByTestId('tab-diproses')).toBeInTheDocument();
  });

  test('tab "Menunggu Keputusan" shows evaluasi with status menunggu_approval', async () => {
    renderApprovalPage();

    await waitFor(() => {
      expect(screen.getByText('Pengadaan Jasa Security Audit')).toBeInTheDocument();
    });
    expect(screen.getByTestId('approval-card')).toBeInTheDocument();
  });

  test('reject button on the pending card is disabled until komentar is filled', async () => {
    renderApprovalPage();

    await waitFor(() => {
      expect(screen.getByTestId('approval-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('approval-reject-btn')).toBeDisabled();
  });

  test('after approving, the card disappears from "Menunggu Keputusan"', async () => {
    renderApprovalPage();

    await waitFor(() => {
      expect(screen.getByTestId('approval-card')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('approval-approve-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('approval-card')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Tidak ada evaluasi yang menunggu keputusan.')).toBeInTheDocument();
  });

  test('after approving, the evaluasi shows up in "Sudah Diproses"', async () => {
    renderApprovalPage();

    await waitFor(() => {
      expect(screen.getByTestId('approval-card')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('approval-approve-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('approval-card')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('tab-diproses'));

    await waitFor(() => {
      expect(screen.getByText('Pengadaan Jasa Security Audit')).toBeInTheDocument();
    });
  });

  test('rejecting without komentar cannot be submitted (button stays disabled)', async () => {
    renderApprovalPage();

    await waitFor(() => {
      expect(screen.getByTestId('approval-card')).toBeInTheDocument();
    });

    const rejectBtn = screen.getByTestId('approval-reject-btn');
    expect(rejectBtn).toBeDisabled();

    await userEvent.type(screen.getByTestId('approval-komentar-input'), 'Butuh revisi harga');
    expect(rejectBtn).not.toBeDisabled();

    await userEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('approval-card')).not.toBeInTheDocument();
    });
  });
});
