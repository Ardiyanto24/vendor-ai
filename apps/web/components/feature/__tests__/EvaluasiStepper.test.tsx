import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: pushMock }),
  usePathname: () => '/evaluasi/baru',
}));

// eslint-disable-next-line import/first
import EvaluasiStepper from '../EvaluasiStepper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderStepper() {
  return render(<EvaluasiStepper />, { wrapper: Wrapper });
}

async function goToStep2() {
  await userEvent.type(
    screen.getByPlaceholderText(/Contoh: Pengadaan Laptop Kantor/i),
    'Pengadaan Server 2026'
  );
  await waitFor(() =>
    expect(screen.getByRole('option', { name: 'IT Hardware' })).toBeInTheDocument()
  );
  await userEvent.selectOptions(screen.getByRole('combobox'), 'it_hardware');
  await userEvent.type(
    screen.getByPlaceholderText(/Jelaskan kebutuhan pengadaan/i),
    'Server untuk data center'
  );
  await userEvent.type(screen.getByPlaceholderText('100000000'), '500000000');
  await userEvent.type(screen.getByTestId('deadline-input'), '2026-12-01');
  await userEvent.click(screen.getByRole('button', { name: /lanjut/i }));
  await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  pushMock.mockClear();
  resetMockEvaluasiState();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('EvaluasiStepper', () => {
  test('renders step indicator and step 1 content initially', () => {
    renderStepper();

    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    expect(screen.queryByTestId('step-2-content')).not.toBeInTheDocument();
  });

  test('step 1 circle is active (aria-current=step) on initial render', () => {
    renderStepper();

    expect(screen.getByTestId('step-circle-1')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('step-circle-2')).not.toHaveAttribute('aria-current');
  });

  test('shows validation errors when Lanjut is clicked without filling required fields', async () => {
    renderStepper();

    await userEvent.click(screen.getByRole('button', { name: /lanjut/i }));

    await waitFor(() => {
      expect(screen.getByText('Judul evaluasi wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Kategori wajib dipilih')).toBeInTheDocument();
      expect(screen.getByText('Deskripsi kebutuhan wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Budget maksimal wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Deadline wajib diisi')).toBeInTheDocument();
    });
  });

  test('cannot proceed to step 2 if only some required fields are filled', async () => {
    renderStepper();

    await userEvent.type(
      screen.getByPlaceholderText(/Contoh: Pengadaan Laptop Kantor/i),
      'Test Evaluasi'
    );
    await userEvent.click(screen.getByRole('button', { name: /lanjut/i }));

    await waitFor(() => {
      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    });
  });

  test('navigates to step 2 after filling all required fields and clicking Lanjut', async () => {
    renderStepper();
    await goToStep2();

    expect(screen.getByRole('heading', { name: 'Tambah Vendor' })).toBeInTheDocument();
  });

  test('step 1 data persists when user navigates back from step 2', async () => {
    renderStepper();

    await userEvent.type(
      screen.getByPlaceholderText(/Contoh: Pengadaan Laptop Kantor/i),
      'Pengadaan Server 2026'
    );
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'IT Software' })).toBeInTheDocument()
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'it_software');
    await userEvent.type(
      screen.getByPlaceholderText(/Jelaskan kebutuhan pengadaan/i),
      'Software akuntansi'
    );
    await userEvent.type(screen.getByPlaceholderText('100000000'), '200000000');
    await userEvent.type(screen.getByTestId('deadline-input'), '2026-10-01');

    await userEvent.click(screen.getByRole('button', { name: /lanjut/i }));
    await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /kembali/i }));
    await waitFor(() => expect(screen.getByTestId('step-1-content')).toBeInTheDocument());

    expect(screen.getByDisplayValue('Pengadaan Server 2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software akuntansi')).toBeInTheDocument();
  });

  test('step 2: shows "Tambah Vendor Manual" button', async () => {
    renderStepper();
    await goToStep2();

    expect(screen.getByRole('button', { name: /Tambah Vendor Manual/i })).toBeInTheDocument();
  });

  test('step 2: Lanjut button is disabled when fewer than 2 vendors are saved', async () => {
    renderStepper();
    await goToStep2();

    const lanjutBtn = screen.getByRole('button', { name: /^lanjut/i });
    expect(lanjutBtn).toBeDisabled();
  });

  test('step 2: clicking Tambah Vendor Manual shows a vendor input form', async () => {
    renderStepper();
    await goToStep2();

    await userEvent.click(screen.getByRole('button', { name: /Tambah Vendor Manual/i }));

    expect(screen.getByTestId('vendor-input-form')).toBeInTheDocument();
  });

  test('step indicator shows step 2 as active after moving to step 2', async () => {
    renderStepper();
    await goToStep2();

    expect(screen.getByTestId('step-circle-2')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('step-circle-1')).not.toHaveAttribute('aria-current');
  });

  test('step 2: clicking Batal on a pending form removes it', async () => {
    renderStepper();
    await goToStep2();

    await userEvent.click(screen.getByRole('button', { name: /Tambah Vendor Manual/i }));
    expect(screen.getByTestId('vendor-input-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(screen.queryByTestId('vendor-input-form')).not.toBeInTheDocument();
  });
});
