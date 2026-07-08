import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreBar from '../ScoreBar';

describe('ScoreBar', () => {
  test('renders label and value correctly', () => {
    render(<ScoreBar value={75} label="Kualitas Teknis" />);
    expect(screen.getByText('Kualitas Teknis')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.queryByText(/Bobot/)).not.toBeInTheDocument();
  });

  test('renders weight if provided', () => {
    render(<ScoreBar value={75} label="Kualitas Teknis" weight={25} />);
    expect(screen.getByText('(Bobot: 25%)')).toBeInTheDocument();
  });

  test('clamps negative values to 0', () => {
    render(<ScoreBar value={-20} label="Kualitas Teknis" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.style.width).toBe('0%');
  });

  test('clamps overflow values to 100', () => {
    render(<ScoreBar value={150} label="Kualitas Teknis" />);
    expect(screen.getByText('100')).toBeInTheDocument();
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.style.width).toBe('100%');
  });

  test('applies red class for score < 40', () => {
    render(<ScoreBar value={39} label="Test" />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-red-500');
  });

  test('applies amber class for score between 40 and 60', () => {
    render(<ScoreBar value={40} label="Test" />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-amber-500');

    // Reset and render 60
    render(<ScoreBar value={60} label="Test 2" />);
    // Get all matching testids, get the second one since they are rendered in sequence
    const fills = screen.getAllByTestId('score-bar-fill');
    expect(fills[1].className).toContain('bg-amber-500');
  });

  test('applies blue class for score between 60 and 80', () => {
    render(<ScoreBar value={70} label="Test" />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-blue-500');
  });

  test('applies emerald class for score > 80', () => {
    render(<ScoreBar value={85} label="Test" />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-emerald-500');
  });
});
