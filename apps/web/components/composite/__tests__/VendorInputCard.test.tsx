import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Vendor, HasilEkstraksi } from 'types';
import VendorInputCard from '../VendorInputCard';

const MOCK_VENDOR: Vendor = {
  id:                  'vendor-001',
  evaluasi_id:         'eval-001',
  nama_perusahaan:     'PT Teknologi Maju',
  kontak_atau_website: 'www.techmaju.com',
  harga_penawaran:     75_000_000,
  catatan:             'Vendor terpercaya',
  sumber_input:        'manual',
  created_at:          '2026-06-16T00:00:00Z',
  updated_at:          '2026-06-16T00:00:00Z',
  deleted_at:          null,
};

// ---------------------------------------------------------------------------
// Saved (view) mode — vendor !== null
// ---------------------------------------------------------------------------
describe('VendorInputCard — saved mode (vendor !== null)', () => {
  test('displays vendor name, website, and formatted price', () => {
    render(
      <VendorInputCard
        vendor={MOCK_VENDOR}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('PT Teknologi Maju')).toBeInTheDocument();
    expect(screen.getByText('www.techmaju.com')).toBeInTheDocument();
    // Price formatted as IDR
    expect(screen.getByText(/75\.000\.000/)).toBeInTheDocument();
  });

  test('displays catatan when present', () => {
    render(
      <VendorInputCard
        vendor={MOCK_VENDOR}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('Vendor terpercaya')).toBeInTheDocument();
  });

  test('calls onRemove when hapus button is clicked', async () => {
    const onRemove = vi.fn();
    render(
      <VendorInputCard
        vendor={MOCK_VENDOR}
        mode="manual"
        onRemove={onRemove}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /hapus vendor/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test('does not render the edit form in saved mode', () => {
    render(
      <VendorInputCard
        vendor={MOCK_VENDOR}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByTestId('vendor-input-form')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit (form) mode — vendor === null
// ---------------------------------------------------------------------------
describe('VendorInputCard — edit mode (vendor === null)', () => {
  test('renders the input form', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByTestId('vendor-input-form')).toBeInTheDocument();
  });

  test('shows validation error when saving with empty nama_perusahaan', async () => {
    const onSave = vi.fn();
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={vi.fn()}
        onSave={onSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /simpan/i }));

    await waitFor(() => {
      expect(screen.getByText('Nama perusahaan wajib diisi')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  test('shows validation error when harga_penawaran is empty', async () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await userEvent.type(screen.getByPlaceholderText(/PT\. Contoh Indonesia/i), 'PT Maju');
    await userEvent.click(screen.getByRole('button', { name: /simpan/i }));

    await waitFor(() => {
      expect(screen.getByText('Harga penawaran wajib diisi')).toBeInTheDocument();
    });
  });

  test('calls onSave with correct mapped payload when form is valid', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={vi.fn()}
        onSave={onSave}
      />
    );

    await userEvent.type(screen.getByPlaceholderText(/PT\. Contoh Indonesia/i), 'PT Maju Jaya');
    await userEvent.type(screen.getByPlaceholderText(/www\.contoh/i), 'www.majujaya.com');
    await userEvent.type(screen.getByPlaceholderText('50000000'), '80000000');
    await userEvent.type(screen.getByPlaceholderText(/Catatan tambahan/i), 'Vendor lokal');

    await userEvent.click(screen.getByRole('button', { name: /simpan/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          namaPerusahaan:    'PT Maju Jaya',
          kontakAtauWebsite: 'www.majujaya.com',
          hargaPenawaran:    80_000_000,
          catatan:           'Vendor lokal',
          sumberInput:       'manual',
        })
      );
    });
  });

  test('calls onRemove when Batal button is clicked', async () => {
    const onRemove = vi.fn();
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={onRemove}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test('fields are editable', async () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="manual"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const namaInput = screen.getByPlaceholderText(/PT\. Contoh Indonesia/i);
    await userEvent.type(namaInput, 'PT Test');
    expect(namaInput).toHaveValue('PT Test');
  });
});

// ---------------------------------------------------------------------------
// Mode loading — AI sedang mengekstrak dokumen
// ---------------------------------------------------------------------------
describe('VendorInputCard — mode loading', () => {
  test('renders skeleton and extraction message instead of the form', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="loading"
        fileName="penawaran-vendor-a.pdf"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('vendor-card-loading')).toBeInTheDocument();
    expect(screen.getByText(/AI sedang membaca dokumen/i)).toBeInTheDocument();
    expect(screen.getByText('penawaran-vendor-a.pdf')).toBeInTheDocument();
    expect(screen.queryByTestId('vendor-input-form')).not.toBeInTheDocument();
  });

  test('cancel button calls onRemove', async () => {
    const onRemove = vi.fn();
    render(
      <VendorInputCard vendor={null} mode="loading" onRemove={onRemove} onSave={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Mode extracted — hasil ekstraksi AI, pre-filled dan dapat diedit
// ---------------------------------------------------------------------------
const HIGH_CONFIDENCE_HASIL: HasilEkstraksi = {
  nama_perusahaan: { nilai: 'PT Ekstraksi Jaya', confidence: 0.92 },
  harga_penawaran: { nilai: 65_000_000, confidence: 0.92, mata_uang: 'IDR' },
  kontak: { nilai: 'kontak@ekstraksijaya.co.id', confidence: 0.9 },
  spesifikasi_ditawarkan: { nilai: ['Garansi 1 tahun'], confidence: 0.9 },
  masa_garansi: { nilai: '12 bulan', confidence: 0.9 },
  payment_terms: { nilai: 'Lunas di muka', confidence: 0.9 },
  catatan_ekstraksi: 'Dokumen jelas dan lengkap',
  confidence_overall: 0.92,
};

const LOW_CONFIDENCE_HASIL: HasilEkstraksi = {
  ...HIGH_CONFIDENCE_HASIL,
  confidence_overall: 0.35,
};

describe('VendorInputCard — mode extracted', () => {
  test('pre-fills the form with extraction results and allows editing', async () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={HIGH_CONFIDENCE_HASIL}
        confidenceScore={0.92}
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('PT Ekstraksi Jaya')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kontak@ekstraksijaya.co.id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('65000000')).toBeInTheDocument();

    const namaInput = screen.getByDisplayValue('PT Ekstraksi Jaya');
    await userEvent.clear(namaInput);
    await userEvent.type(namaInput, 'PT Ekstraksi Jaya Revisi');
    expect(namaInput).toHaveValue('PT Ekstraksi Jaya Revisi');
  });

  test('submit button reads "Konfirmasi" and saves with sumberInput extracted', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={HIGH_CONFIDENCE_HASIL}
        confidenceScore={0.92}
        onRemove={vi.fn()}
        onSave={onSave}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /konfirmasi/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          namaPerusahaan: 'PT Ekstraksi Jaya',
          sumberInput:    'extracted',
        })
      );
    });
  });

  test('shows low-confidence warning when confidence is below threshold', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={LOW_CONFIDENCE_HASIL}
        confidenceScore={0.35}
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('low-confidence-indicator')).toBeInTheDocument();
    expect(screen.getByText(/harap verifikasi hasil ini/i)).toBeInTheDocument();
  });

  test('does not show low-confidence warning when confidence is high', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={HIGH_CONFIDENCE_HASIL}
        confidenceScore={0.92}
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByTestId('low-confidence-indicator')).not.toBeInTheDocument();
  });

  test('shows RAG indexing indicator while indexing is in progress', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={HIGH_CONFIDENCE_HASIL}
        confidenceScore={0.92}
        indexingRagStatus="processing"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('rag-indexing-indicator')).toBeInTheDocument();
    expect(screen.getByText(/mengindeks dokumen untuk ai chat/i)).toBeInTheDocument();
  });

  test('shows indexed confirmation once RAG indexing is done', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="extracted"
        hasilEkstraksi={HIGH_CONFIDENCE_HASIL}
        confidenceScore={0.92}
        indexingRagStatus="done"
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/terindeks untuk ai chat/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mode error — ekstraksi gagal, fallback ke input manual
// ---------------------------------------------------------------------------
describe('VendorInputCard — mode error', () => {
  test('renders the error message and does not render the form', () => {
    render(
      <VendorInputCard
        vendor={null}
        mode="error"
        errorMessage="AI gagal mengekstrak data dari dokumen."
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('vendor-card-error')).toBeInTheDocument();
    expect(screen.getByText('AI gagal mengekstrak data dari dokumen.')).toBeInTheDocument();
    expect(screen.queryByTestId('vendor-input-form')).not.toBeInTheDocument();
  });

  test('"Input Manual" button calls onRetryManual as a fallback', async () => {
    const onRetryManual = vi.fn();
    render(
      <VendorInputCard
        vendor={null}
        mode="error"
        errorMessage="Gagal"
        onRetryManual={onRetryManual}
        onRemove={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTestId('btn-input-manual'));
    expect(onRetryManual).toHaveBeenCalledOnce();
  });

  test('hapus button calls onRemove', async () => {
    const onRemove = vi.fn();
    render(
      <VendorInputCard
        vendor={null}
        mode="error"
        errorMessage="Gagal"
        onRemove={onRemove}
        onSave={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /^hapus$/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
