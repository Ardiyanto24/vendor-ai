import React from 'react';
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { resetMockEvaluasiState } from '@/test/handlers/evaluasi';
import { resetMockDokumenState, seedMockDokumen } from '@/test/handlers/dokumen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: pushMock }),
  usePathname: () => '/evaluasi/baru',
}));

// jsdom's FormData doesn't interop cleanly with undici's fetch, so the
// multipart upload POST can't run through MSW in this environment — mock the
// upload call itself and drive the rest of the flow (polling) through the
// real GET status handler.
vi.mock('@/lib/api/evaluasi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/evaluasi')>();
  return { ...actual, uploadDokumen: vi.fn() };
});

// eslint-disable-next-line import/first
import { uploadDokumen } from '@/lib/api/evaluasi';
// eslint-disable-next-line import/first
import EvaluasiStepper from '../EvaluasiStepper';

const mockedUploadDokumen = vi.mocked(uploadDokumen);

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
  resetMockDokumenState();
  mockedUploadDokumen.mockReset();
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

  test('step 1: renders PreferenceInput textarea with counter, and it is optional', async () => {
    renderStepper();

    expect(
      screen.getByText('Preferensi atau Prioritas Perusahaan (opsional)')
    ).toBeInTheDocument();
    expect(screen.getByTestId('preferensi-counter')).toHaveTextContent('0/1000');

    // Step 1 can be submitted without touching the preference field.
    await goToStep2();
    expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
  });

  test('step 1: typing in PreferenceInput updates the character counter', async () => {
    renderStepper();

    await userEvent.type(screen.getByTestId('preferensi-input'), 'Utamakan vendor lokal');

    expect(screen.getByTestId('preferensi-counter')).toHaveTextContent('21/1000');
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
    await userEvent.type(screen.getByTestId('preferensi-input'), 'Vendor lokal saja');

    await userEvent.click(screen.getByRole('button', { name: /lanjut/i }));
    await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /kembali/i }));
    await waitFor(() => expect(screen.getByTestId('step-1-content')).toBeInTheDocument());

    expect(screen.getByDisplayValue('Pengadaan Server 2026')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software akuntansi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vendor lokal saja')).toBeInTheDocument();
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

  test('step 2: shows "Upload Dokumen Penawaran" button', async () => {
    renderStepper();
    await goToStep2();

    expect(screen.getByRole('button', { name: /Upload Dokumen Penawaran/i })).toBeInTheDocument();
  });

  test(
    'step 2: uploading a document shows loading then a pre-filled extracted card',
    async () => {
      seedMockDokumen('upload-test-1', 'new-eval-1', 'penawaran-vendor-a.pdf');
      mockedUploadDokumen.mockResolvedValueOnce({
        uploadId:        'upload-test-1',
        evaluasiId:      'new-eval-1',
        fileType:        'pdf',
        fileSizeBytes:   1234,
        statusEkstraksi: 'pending',
        createdAt:       new Date().toISOString(),
      });

      renderStepper();
      await goToStep2();

      const file = new File(['dummy content'], 'penawaran-vendor-a.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByTestId('dokumen-file-input') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByTestId('vendor-card-loading')).toBeInTheDocument();
      });
      expect(screen.getByText('penawaran-vendor-a.pdf')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByTestId('vendor-input-form')).toBeInTheDocument();
        },
        { timeout: 12_000 }
      );

      expect(screen.getByDisplayValue('PT Ekstraksi Otomatis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /konfirmasi/i })).toBeInTheDocument();
    },
    15_000
  );

  test(
    'step 2: extraction failure shows error mode with manual fallback',
    async () => {
      seedMockDokumen('upload-test-2', 'new-eval-1', 'penawaran-gagal.pdf', true);
      mockedUploadDokumen.mockResolvedValueOnce({
        uploadId:        'upload-test-2',
        evaluasiId:      'new-eval-1',
        fileType:        'pdf',
        fileSizeBytes:   1234,
        statusEkstraksi: 'pending',
        createdAt:       new Date().toISOString(),
      });

      renderStepper();
      await goToStep2();

      const file = new File(['dummy content'], 'penawaran-gagal.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByTestId('dokumen-file-input') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      await waitFor(
        () => {
          expect(screen.getByTestId('vendor-card-error')).toBeInTheDocument();
        },
        { timeout: 12_000 }
      );

      await userEvent.click(screen.getByTestId('btn-input-manual'));
      expect(screen.getByTestId('vendor-input-form')).toBeInTheDocument();
    },
    15_000
  );

  test('step 2: upload rejected by the server shows error mode with manual fallback', async () => {
    mockedUploadDokumen.mockRejectedValueOnce(
      new Error('Format file tidak didukung. Hanya PDF dan Excel (.xlsx, .xls) yang diizinkan')
    );

    renderStepper();
    await goToStep2();

    const file = new File(['dummy'], 'penawaran.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('dokumen-file-input') as HTMLInputElement;
    // The real <input accept> attribute would filter this out at the browser
    // level; disable that here to exercise the server-side rejection path.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByTestId('vendor-card-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/format file tidak didukung/i)).toBeInTheDocument();
  });
});
