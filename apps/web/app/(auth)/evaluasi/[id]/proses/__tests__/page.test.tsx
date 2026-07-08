import React from 'react';
import { describe, test, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'eval-processing-001' }),
  useRouter: () => ({ push: pushMock }),
}));

let capturedOnAllAgentsDone: (() => void) | undefined;

vi.mock('@/components/feature/AgentProgressPanel', () => ({
  __esModule: true,
  default: ({ onAllAgentsDone }: { evaluasiId: string; onAllAgentsDone?: () => void }) => {
    capturedOnAllAgentsDone = onAllAgentsDone;
    return <div data-testid="mock-agent-progress-panel" />;
  },
}));

// eslint-disable-next-line import/first
import ProsesEvaluasiPage from '../page';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProsesEvaluasiPage />
    </QueryClientProvider>
  );
}

describe('ProsesEvaluasiPage (P-04)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    resetMockEvaluasiState();
    pushMock.mockClear();
    capturedOnAllAgentsDone = undefined;
  });
  afterAll(() => server.close());

  test('renders evaluasi header info and the agent progress panel', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jasa Konsultansi IT Infrastructure')).toBeInTheDocument();
    });
    expect(screen.getByText('Jasa IT')).toBeInTheDocument();
    expect(screen.getByTestId('mock-agent-progress-panel')).toBeInTheDocument();
    expect(screen.getByText(/boleh meninggalkan halaman/i)).toBeInTheDocument();
  });

  test('redirects to /evaluasi/:id/hasil shortly after all agents are done', async () => {
    renderPage();

    await waitFor(() => expect(capturedOnAllAgentsDone).toBeDefined());

    capturedOnAllAgentsDone!();
    expect(pushMock).not.toHaveBeenCalled();

    await waitFor(
      () => expect(pushMock).toHaveBeenCalledWith('/evaluasi/eval-processing-001/hasil'),
      { timeout: 3000 }
    );
  });
});
