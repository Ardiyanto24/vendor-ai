import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Vendor } from 'types';
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
