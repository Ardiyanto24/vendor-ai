import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentStatusIcon, { AgentStatus } from '../AgentStatusIcon';

describe('AgentStatusIcon', () => {
  const statuses: { status: AgentStatus; testId: string; expectedColor: string }[] = [
    { status: 'idle', testId: 'status-icon-idle', expectedColor: 'text-gray-400' },
    { status: 'waiting', testId: 'status-icon-waiting', expectedColor: 'text-amber-500' },
    { status: 'running', testId: 'status-icon-running', expectedColor: 'text-blue-500' },
    { status: 'done', testId: 'status-icon-done', expectedColor: 'text-emerald-500' },
    { status: 'error', testId: 'status-icon-error', expectedColor: 'text-red-500' },
  ];

  statuses.forEach(({ status, testId, expectedColor }) => {
    test(`renders correct icon and color for status: ${status}`, () => {
      render(<AgentStatusIcon status={status} />);
      const icon = screen.getByTestId(testId);
      expect(icon).toBeInTheDocument();
      expect(icon.getAttribute('class')).toContain(expectedColor);
    });
  });

  test('applies spin animation only to running status', () => {
    // Test that running has animate-spin
    const { rerender } = render(<AgentStatusIcon status="running" />);
    let icon = screen.getByTestId('status-icon-running');
    expect(icon.getAttribute('class')).toContain('animate-spin');

    // Rerender with done status and ensure it doesn't spin
    rerender(<AgentStatusIcon status="done" />);
    icon = screen.getByTestId('status-icon-done');
    expect(icon.getAttribute('class')).not.toContain('animate-spin');
  });

  test('renders custom icon size', () => {
    render(<AgentStatusIcon status="done" size={32} />);
    const icon = screen.getByTestId('status-icon-done');
    expect(icon.getAttribute('width')).toBe('32');
    expect(icon.getAttribute('height')).toBe('32');
  });
});
