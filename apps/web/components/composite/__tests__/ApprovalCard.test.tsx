import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// eslint-disable-next-line import/first
import ApprovalCard from '../ApprovalCard';

const baseEvaluasi = {
  id:               'eval-1',
  judul:            'Pengadaan Laptop Kantor 2026',
  namaStaff:        'Budi Santoso',
  tanggalPengajuan: '2026-06-20T08:00:00Z',
  budgetMax:        100_000_000,
  rekomendasiVendor: 'PT Maju Jaya',
  skor:             0.874,
};

describe('ApprovalCard', () => {
  test('renders judul, pengaju, rekomendasi, skor, and budget', () => {
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByText('Pengadaan Laptop Kantor 2026')).toBeInTheDocument();
    expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument();
    expect(screen.getByText('0.87')).toBeInTheDocument();
  });

  test('falls back gracefully when rekomendasi/skor/namaStaff are not yet available', () => {
    render(
      <ApprovalCard
        evaluasi={{ id: 'eval-2', judul: 'Evaluasi Tanpa Hasil', tanggalPengajuan: '2026-06-20T08:00:00Z', budgetMax: 5_000_000 }}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('Belum tersedia')).toBeInTheDocument();
    expect(screen.getByText(/Diajukan oleh —/)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('reject button is disabled when komentar is empty', () => {
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByTestId('approval-reject-btn')).toBeDisabled();
  });

  test('reject button becomes enabled once komentar is filled', () => {
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    fireEvent.change(screen.getByTestId('approval-komentar-input'), {
      target: { value: 'Harga terlalu tinggi' },
    });

    expect(screen.getByTestId('approval-reject-btn')).not.toBeDisabled();
  });

  test('approve button is enabled without komentar and calls onApprove', () => {
    const onApprove = vi.fn();
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={onApprove} onReject={vi.fn()} />
    );

    const approveBtn = screen.getByTestId('approval-approve-btn');
    expect(approveBtn).not.toBeDisabled();

    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledOnce();
  });

  test('clicking Tolak calls onReject with the komentar text', () => {
    const onReject = vi.fn();
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={vi.fn()} onReject={onReject} />
    );

    fireEvent.change(screen.getByTestId('approval-komentar-input'), {
      target: { value: 'Harga terlalu tinggi' },
    });
    fireEvent.click(screen.getByTestId('approval-reject-btn'));

    expect(onReject).toHaveBeenCalledWith('Harga terlalu tinggi');
  });

  test('both approve and reject buttons are disabled while isSubmitting', () => {
    render(
      <ApprovalCard evaluasi={baseEvaluasi} isSubmitting onApprove={vi.fn()} onReject={vi.fn()} />
    );

    expect(screen.getByTestId('approval-approve-btn')).toBeDisabled();
    expect(screen.getByTestId('approval-reject-btn')).toBeDisabled();
  });

  test('clicking "Lihat Detail Lengkap" navigates to /evaluasi/:id/hasil', () => {
    render(
      <ApprovalCard evaluasi={baseEvaluasi} onApprove={vi.fn()} onReject={vi.fn()} />
    );

    fireEvent.click(screen.getByText('Lihat Detail Lengkap'));
    expect(pushMock).toHaveBeenCalledWith('/evaluasi/eval-1/hasil');
  });
});
