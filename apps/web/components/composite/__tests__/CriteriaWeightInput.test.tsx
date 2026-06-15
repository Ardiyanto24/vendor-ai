import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CriteriaWeightInput from '../CriteriaWeightInput';

const defaultProps = {
  label: 'Harga & TCO',
  bobot: 30,
  thresholdMin: 60,
  isInvalid: false,
  onChange: vi.fn(),
};

describe('CriteriaWeightInput', () => {
  test('renders label, bobot, and thresholdMin values', () => {
    render(<CriteriaWeightInput {...defaultProps} />);

    expect(screen.getByText('Harga & TCO')).toBeInTheDocument();
    expect(screen.getByLabelText('Bobot Harga & TCO')).toHaveValue(30);
    expect(screen.getByLabelText('Threshold minimum Harga & TCO')).toHaveValue(60);
  });

  test('does NOT show red border when isInvalid is false', () => {
    render(<CriteriaWeightInput {...defaultProps} isInvalid={false} />);

    const container = screen.getByTestId('criteria-weight-input');
    expect(container.className).not.toContain('border-red-500/60');
  });

  test('shows red border on container when isInvalid is true', () => {
    render(<CriteriaWeightInput {...defaultProps} isInvalid={true} />);

    const container = screen.getByTestId('criteria-weight-input');
    expect(container.className).toContain('border-red-500/60');
  });

  test('shows red border on bobot input when isInvalid is true', () => {
    render(<CriteriaWeightInput {...defaultProps} isInvalid={true} />);

    const bobotInput = screen.getByLabelText('Bobot Harga & TCO');
    expect(bobotInput.className).toContain('border-red-500/60');
  });

  test('calls onChange with updated bobot when bobot input changes', () => {
    const onChange = vi.fn();
    render(<CriteriaWeightInput {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Bobot Harga & TCO'), {
      target: { value: '40' },
    });

    expect(onChange).toHaveBeenCalledWith(40, 60);
  });

  test('calls onChange with updated thresholdMin when threshold input changes', () => {
    const onChange = vi.fn();
    render(<CriteriaWeightInput {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Threshold minimum Harga & TCO'), {
      target: { value: '70' },
    });

    expect(onChange).toHaveBeenCalledWith(30, 70);
  });
});
