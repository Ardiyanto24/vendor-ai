import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HasilVendor, KriteriaItem } from 'types';
import VendorRankingTable from '../VendorRankingTable';

// Chart.js needs a real <canvas> 2D context, unavailable in jsdom — stub the
// chart so this test only exercises VendorRankingTable's own logic.
vi.mock('@/components/charts/CriteriaBarChart', () => ({
  default: () => <div data-testid="criteria-bar-chart-mock" />,
}));

const KRITERIA: KriteriaItem[] = [
  { key: 'harga_tco', label: 'Harga & TCO', bobot: 30, threshold_min: 60 },
  { key: 'kualitas', label: 'Kualitas', bobot: 70, threshold_min: 60 },
];

const VENDORS: HasilVendor[] = [
  {
    id: 'v1',
    hasil_evaluasi_id: 'h1',
    vendor_id: 'vendor-1',
    vendor_nama: 'Vendor Alpha',
    rank: 1,
    skor_total: 90,
    skor_per_kriteria: { harga_tco: 95, kualitas: 88 },
    catatan_per_kriteria: { harga_tco: 'Harga sangat kompetitif' },
    lolos_threshold: true,
    unique_offerings: null,
    profil_kualitatif: null,
    tingkat_kesesuaian_preferensi: null,
  },
  {
    id: 'v2',
    hasil_evaluasi_id: 'h1',
    vendor_id: 'vendor-2',
    vendor_nama: 'Vendor Beta',
    rank: 2,
    skor_total: 70,
    skor_per_kriteria: { harga_tco: 60, kualitas: 75 },
    catatan_per_kriteria: null,
    lolos_threshold: true,
    unique_offerings: null,
    profil_kualitatif: null,
    tingkat_kesesuaian_preferensi: null,
  },
];

describe('VendorRankingTable', () => {
  test('renders all vendors sorted by rank by default', () => {
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);
    const rows = screen.getAllByTestId(/^vendor-row-v/);
    expect(rows[0]).toHaveTextContent('Vendor Alpha');
    expect(rows[1]).toHaveTextContent('Vendor Beta');
  });

  test('expands a row on click to show ScoreBar breakdown and chart, collapses on second click', async () => {
    const user = userEvent.setup();
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);

    expect(screen.queryByTestId('vendor-row-expanded-v1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('vendor-row-v1'));
    expect(screen.getByTestId('vendor-row-expanded-v1')).toBeInTheDocument();
    expect(screen.getByTestId('criteria-bar-chart-mock')).toBeInTheDocument();
    expect(screen.getByText('Harga sangat kompetitif')).toBeInTheDocument();

    await user.click(screen.getByTestId('vendor-row-v1'));
    expect(screen.queryByTestId('vendor-row-expanded-v1')).not.toBeInTheDocument();
  });

  test('collapses previously expanded row when a different row is expanded', async () => {
    const user = userEvent.setup();
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);

    await user.click(screen.getByTestId('vendor-row-v1'));
    expect(screen.getByTestId('vendor-row-expanded-v1')).toBeInTheDocument();

    await user.click(screen.getByTestId('vendor-row-v2'));
    expect(screen.queryByTestId('vendor-row-expanded-v1')).not.toBeInTheDocument();
    expect(screen.getByTestId('vendor-row-expanded-v2')).toBeInTheDocument();
  });

  test('sorting by a criteria column toggles ascending/descending as local state (no API call)', async () => {
    const user = userEvent.setup();
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);

    // Default: rank asc -> Alpha (90) then Beta (70)
    let rows = screen.getAllByTestId(/^vendor-row-v/);
    expect(rows[0]).toHaveTextContent('Vendor Alpha');

    // Click "Skor Total" header once -> ascending by skor_total: Beta (70) then Alpha (90)
    await user.click(screen.getByTestId('sort-header-skor_total'));
    rows = screen.getAllByTestId(/^vendor-row-v/);
    expect(rows[0]).toHaveTextContent('Vendor Beta');
    expect(rows[1]).toHaveTextContent('Vendor Alpha');

    // Click again -> descending: Alpha (90) then Beta (70)
    await user.click(screen.getByTestId('sort-header-skor_total'));
    rows = screen.getAllByTestId(/^vendor-row-v/);
    expect(rows[0]).toHaveTextContent('Vendor Alpha');
    expect(rows[1]).toHaveTextContent('Vendor Beta');
  });

  test('sorting by vendor name column sorts alphabetically', async () => {
    const user = userEvent.setup();
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);

    await user.click(screen.getByTestId('sort-header-vendor_nama'));
    const rows = screen.getAllByTestId(/^vendor-row-v/);
    expect(rows[0]).toHaveTextContent('Vendor Alpha');
    expect(rows[1]).toHaveTextContent('Vendor Beta');
  });

  test('does not render preferensi column when no vendor has tingkat_kesesuaian_preferensi', () => {
    render(<VendorRankingTable vendors={VENDORS} konfigurasi={KRITERIA} />);
    expect(screen.queryByText('Preferensi')).not.toBeInTheDocument();
  });

  test('renders preferensi badge when present', () => {
    const withPreferensi: HasilVendor[] = [
      { ...VENDORS[0], tingkat_kesesuaian_preferensi: 'tinggi' },
      VENDORS[1],
    ];
    render(<VendorRankingTable vendors={withPreferensi} konfigurasi={KRITERIA} />);
    expect(screen.getByText('Preferensi')).toBeInTheDocument();
    expect(screen.getByText('Tinggi')).toBeInTheDocument();
  });
});
