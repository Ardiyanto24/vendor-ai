import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendationCard from '../RecommendationCard';

describe('RecommendationCard', () => {
  test('renders vendor name, score, rank badge, and reasoning', () => {
    render(
      <RecommendationCard
        vendorNama="PT Sumber Makmur Sejahtera"
        rankBadge={1}
        skorTotal={88.5}
        reasoningSingkat="Unggul di harga dan kualitas dengan skor TOPSIS tertinggi."
      />
    );

    expect(screen.getByTestId('recommendation-card-vendor-nama')).toHaveTextContent('PT Sumber Makmur Sejahtera');
    expect(screen.getByTestId('recommendation-card-skor')).toHaveTextContent('88.5');
    expect(screen.getByTestId('recommendation-card-reasoning')).toHaveTextContent(
      'Unggul di harga dan kualitas dengan skor TOPSIS tertinggi.'
    );
    expect(screen.getByText('Rekomendasi Utama')).toBeInTheDocument();
  });

  test('formats score to one decimal place', () => {
    render(
      <RecommendationCard vendorNama="Vendor A" skorTotal={90} reasoningSingkat="Reasoning" />
    );
    expect(screen.getByTestId('recommendation-card-skor')).toHaveTextContent('90.0');
  });

  test('renders loading skeleton and hides content when isLoading is true', () => {
    render(
      <RecommendationCard vendorNama="Vendor A" skorTotal={90} reasoningSingkat="Reasoning" isLoading />
    );
    expect(screen.getByTestId('recommendation-card-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('recommendation-card-vendor-nama')).not.toBeInTheDocument();
  });
});
