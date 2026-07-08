import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';

const mockParams = vi.hoisted(() => ({ id: 'eval-selesai-001' }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: mockParams.id }),
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

describe('HasilEvaluasiPage (P-05)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvaluasiState();
    mockParams.id = 'eval-selesai-001';
  });
  afterAll(() => server.close());

  test('renders Bagian 1, 2, 3, 6 for an evaluasi with hasil ready', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pengadaan ATK Semester II')).toBeInTheDocument();
    });

    // Bagian 1 — narasi pengantar generik (tanpa preferensi)
    expect(screen.getByTestId('hasil-narasi-pengantar')).toHaveTextContent(
      'Hasil evaluasi berdasarkan metrik terukur TOPSIS.'
    );

    // Bagian 2 — RecommendationCard untuk vendor rank 1
    expect(screen.getByTestId('recommendation-card-vendor-nama')).toHaveTextContent('PT Sumber Makmur Sejahtera');
    expect(screen.getByTestId('recommendation-card-skor')).toHaveTextContent('88.5');

    // Bagian 3 — VendorRankingTable dengan 3 vendor terurut
    expect(screen.getByTestId('vendor-ranking-table')).toBeInTheDocument();
    const rows = screen.getAllByTestId(/^vendor-row-hasil-vendor-atk-/);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('PT Sumber Makmur Sejahtera');
    expect(rows[2]).toHaveTextContent('Toko Jaya Stationery');

    // Bagian 6 — AIReasoningPanel
    expect(screen.getByTestId('ai-reasoning-panel')).toBeInTheDocument();
    expect(screen.getByTestId('ai-reasoning-section-negosiasi')).toHaveTextContent(
      'Negosiasikan lead time untuk pesanan besar'
    );

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

  test('shows a "belum tersedia" placeholder when hasil_evaluasi does not exist yet', async () => {
    mockParams.id = 'eval-processing-001';
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jasa Konsultansi IT Infrastructure')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('hasil-belum-tersedia')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vendor-ranking-table')).not.toBeInTheDocument();
  });
});
