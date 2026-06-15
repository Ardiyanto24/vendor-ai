import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';
import { EvaluasiStatus } from 'types';

describe('StatusBadge', () => {
  const statuses: { status: EvaluasiStatus; expectedText: string; expectedClass: string }[] = [
    {
      status: 'draft',
      expectedText: 'Draft',
      expectedClass: 'bg-status-draft/10 text-status-draft',
    },
    {
      status: 'processing',
      expectedText: 'Processing',
      expectedClass: 'bg-status-processing/10 text-status-processing',
    },
    {
      status: 'selesai',
      expectedText: 'Selesai',
      expectedClass: 'bg-status-selesai/10 text-status-selesai',
    },
    {
      status: 'menunggu_approval',
      expectedText: 'Menunggu Approval',
      expectedClass: 'bg-status-menunggu-approval/10 text-status-menunggu-approval',
    },
    {
      status: 'approved',
      expectedText: 'Approved',
      expectedClass: 'bg-status-approved/10 text-status-approved',
    },
    {
      status: 'butuh_revisi',
      expectedText: 'Butuh Revisi',
      expectedClass: 'bg-status-butuh-revisi/10 text-status-butuh-revisi',
    },
  ];

  statuses.forEach(({ status, expectedText, expectedClass }) => {
    test(`renders correctly for status: ${status}`, () => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(expectedText);
      expect(badge).toBeInTheDocument();
      // Ensure the key custom tailwind classes exist in the element
      const classes = expectedClass.split(' ');
      classes.forEach((cls) => {
        expect(badge.className).toContain(cls);
      });
    });
  });

  test('renders with custom size sm', () => {
    render(<StatusBadge status="draft" size="sm" />);
    const badge = screen.getByText('Draft');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).not.toContain('text-sm');
  });

  test('renders with default size md', () => {
    render(<StatusBadge status="draft" />);
    const badge = screen.getByText('Draft');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).not.toContain('text-xs');
  });
});
