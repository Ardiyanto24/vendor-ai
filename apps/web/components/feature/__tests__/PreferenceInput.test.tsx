import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreferenceInput from '../PreferenceInput';

describe('PreferenceInput', () => {
  test('renders label, placeholder, and counter at 0', () => {
    render(<PreferenceInput value="" onChange={vi.fn()} />);

    expect(screen.getByText('Preferensi atau Prioritas Perusahaan (opsional)')).toBeInTheDocument();
    expect(screen.getByTestId('preferensi-input')).toHaveAttribute(
      'placeholder',
      expect.stringContaining('Contoh:')
    );
    expect(screen.getByTestId('preferensi-counter')).toHaveTextContent('0/1000');
  });

  test('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<PreferenceInput value="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('preferensi-input'), {
      target: { value: 'Vendor lokal' },
    });

    expect(onChange).toHaveBeenCalledWith('Vendor lokal');
  });

  test('counter reflects current value length', () => {
    render(<PreferenceInput value={'a'.repeat(250)} onChange={vi.fn()} />);

    expect(screen.getByTestId('preferensi-counter')).toHaveTextContent('250/1000');
  });

  test('textarea has maxLength of 1000', () => {
    render(<PreferenceInput value="" onChange={vi.fn()} />);

    expect(screen.getByTestId('preferensi-input')).toHaveAttribute('maxlength', '1000');
  });

  test('is not marked required — field is optional', () => {
    render(<PreferenceInput value="" onChange={vi.fn()} />);

    expect(screen.getByTestId('preferensi-input')).not.toBeRequired();
  });
});
