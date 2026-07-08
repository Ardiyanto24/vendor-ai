import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AIReasoningPanel from '../AIReasoningPanel';

describe('AIReasoningPanel', () => {
  test('renders all three reasoning sections with their content', () => {
    render(
      <AIReasoningPanel
        reasoningUtama="Alasan utama vendor terpilih."
        kelemahanUtama="Kelemahan yang perlu diwaspadai."
        rekomendasiNegosiasi="Saran negosiasi selanjutnya."
      />
    );

    expect(screen.getByText('Mengapa vendor ini direkomendasikan')).toBeInTheDocument();
    expect(screen.getByTestId('ai-reasoning-section-utama')).toHaveTextContent('Alasan utama vendor terpilih.');

    expect(screen.getByText('Kelemahan yang perlu diwaspadai')).toBeInTheDocument();
    expect(screen.getByTestId('ai-reasoning-section-kelemahan')).toHaveTextContent('Kelemahan yang perlu diwaspadai.');

    expect(screen.getByText('Rekomendasi langkah negosiasi')).toBeInTheDocument();
    expect(screen.getByTestId('ai-reasoning-section-negosiasi')).toHaveTextContent('Saran negosiasi selanjutnya.');
  });
});
