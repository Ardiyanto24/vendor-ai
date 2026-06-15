import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EvaluasiRow from '../EvaluasiRow';
import type { EvaluasiRowData } from '../EvaluasiRow';

const baseEvaluasi: EvaluasiRowData = {
  id:        'eval-001',
  judul:     'Pengadaan Laptop Kantor',
  kategori:  'it_hardware',
  status:    'draft',
  createdAt: '2026-06-10T08:00:00Z',
};

describe('EvaluasiRow', () => {
  test('renders judul and kategori label', () => {
    render(<EvaluasiRow evaluasi={baseEvaluasi} />);

    expect(screen.getByText('Pengadaan Laptop Kantor')).toBeInTheDocument();
    expect(screen.getByText('IT Hardware')).toBeInTheDocument();
  });

  test('renders StatusBadge with correct status label', () => {
    render(<EvaluasiRow evaluasi={baseEvaluasi} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  test('renders StatusBadge for processing status', () => {
    render(<EvaluasiRow evaluasi={{ ...baseEvaluasi, status: 'processing' }} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  test('renders StatusBadge for menunggu_approval status', () => {
    render(<EvaluasiRow evaluasi={{ ...baseEvaluasi, status: 'menunggu_approval' }} />);
    expect(screen.getByText('Menunggu Approval')).toBeInTheDocument();
  });

  test('renders jumlahVendor when provided', () => {
    render(<EvaluasiRow evaluasi={{ ...baseEvaluasi, jumlahVendor: 4 }} />);
    expect(screen.getByText('4 vendor')).toBeInTheDocument();
  });

  test('does not render vendor count when jumlahVendor is undefined', () => {
    render(<EvaluasiRow evaluasi={baseEvaluasi} />);
    expect(screen.queryByText(/vendor/i)).not.toBeInTheDocument();
  });

  test('renders vendorTerpilih when provided', () => {
    render(<EvaluasiRow evaluasi={{ ...baseEvaluasi, vendorTerpilih: 'PT Maju Jaya' }} />);
    expect(screen.getByText('Dipilih: PT Maju Jaya')).toBeInTheDocument();
  });

  test('calls onClick when clicked and handler is provided', () => {
    const onClick = vi.fn();
    render(<EvaluasiRow evaluasi={baseEvaluasi} onClick={onClick} />);

    fireEvent.click(screen.getByRole('row'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('does not show chevron when onClick is not provided', () => {
    const { container } = render(<EvaluasiRow evaluasi={baseEvaluasi} />);
    // chevron is lucide SVG — it won't be rendered when onClick is absent
    const row = screen.getByRole('row');
    expect(row.className).not.toContain('cursor-pointer');
  });

  test('row has cursor-pointer class when onClick is provided', () => {
    render(<EvaluasiRow evaluasi={baseEvaluasi} onClick={vi.fn()} />);
    expect(screen.getByRole('row').className).toContain('cursor-pointer');
  });
});
