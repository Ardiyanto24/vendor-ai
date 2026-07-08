import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseAgentProgress = vi.fn();

vi.mock('@/hooks/useAgentProgress', () => ({
  useAgentProgress: (evaluasiId: string) => mockUseAgentProgress(evaluasiId),
}));

// eslint-disable-next-line import/first
import AgentProgressPanel from '../AgentProgressPanel';

const AGENT_DEFS = [
  ['data_collector', 'Data Collector'],
  ['financial_analyzer', 'Financial Analyzer'],
  ['risk_assessor', 'Risk Assessor'],
  ['performance_scorer', 'Performance Scorer'],
  ['negotiation_assistant', 'Negotiation Assistant'],
  ['qualitative_analyzer', 'Qualitative Analyzer'],
  ['preference_matcher', 'Preference Matcher'],
] as const;

function buildAgents(overrides: Partial<Record<string, Partial<{ status: string; progress: number; pesanTerakhir: string | null; errorDetail: string | null }>>> = {}) {
  return AGENT_DEFS.map(([agentKey, label]) => ({
    agentKey,
    label,
    status: 'idle',
    progress: 0,
    pesanTerakhir: null,
    errorDetail: null,
    ...(overrides[agentKey] ?? {}),
  }));
}

describe('AgentProgressPanel', () => {
  beforeEach(() => {
    mockUseAgentProgress.mockReset();
  });

  test('renders all 7 agents with their human-readable labels', () => {
    mockUseAgentProgress.mockReturnValue({ agents: buildAgents(), isAllDone: false, error: null });

    render(<AgentProgressPanel evaluasiId="eval-1" />);

    AGENT_DEFS.forEach(([, label]) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test('shows a distinct "waiting" label for agents waiting on a dependency', () => {
    mockUseAgentProgress.mockReturnValue({
      agents: buildAgents({ performance_scorer: { status: 'waiting' } }),
      isAllDone: false,
      error: null,
    });

    render(<AgentProgressPanel evaluasiId="eval-1" />);

    expect(screen.getByTestId('agent-status-label-performance_scorer')).toHaveTextContent('Menunggu agent lain');
    expect(screen.getByTestId('agent-status-label-data_collector')).toHaveTextContent('Menunggu giliran');
  });

  test('shows pesan_terakhir for a running agent', () => {
    mockUseAgentProgress.mockReturnValue({
      agents: buildAgents({ data_collector: { status: 'running', progress: 40, pesanTerakhir: 'Mencari data vendor via Tavily...' } }),
      isAllDone: false,
      error: null,
    });

    render(<AgentProgressPanel evaluasiId="eval-1" />);

    expect(screen.getByTestId('agent-message-data_collector')).toHaveTextContent('Mencari data vendor via Tavily...');
  });

  test('shows error_detail as a non-blocking warning, not a fatal error', () => {
    mockUseAgentProgress.mockReturnValue({
      agents: buildAgents({ risk_assessor: { status: 'error', errorDetail: 'Tavily API timeout' } }),
      isAllDone: false,
      error: null,
    });

    render(<AgentProgressPanel evaluasiId="eval-1" />);

    expect(screen.getByTestId('agent-error-warning')).toBeInTheDocument();
    expect(screen.getByTestId('agent-message-risk_assessor')).toHaveTextContent('Tavily API timeout');
    // Panel itself still renders normally — no thrown error, no blocking modal.
    expect(screen.getByTestId('agent-progress-panel')).toBeInTheDocument();
  });

  test('shows a connection warning when the hook reports an error', () => {
    mockUseAgentProgress.mockReturnValue({
      agents: buildAgents(),
      isAllDone: false,
      error: 'Koneksi real-time terputus. Status agent mungkin tidak selalu terbaru.',
    });

    render(<AgentProgressPanel evaluasiId="eval-1" />);

    expect(screen.getByTestId('agent-progress-connection-warning')).toHaveTextContent('Koneksi real-time terputus');
  });

  test('calls onAllAgentsDone exactly once when isAllDone flips to true', () => {
    const onAllAgentsDone = vi.fn();
    mockUseAgentProgress.mockReturnValue({ agents: buildAgents(), isAllDone: false, error: null });

    const { rerender } = render(<AgentProgressPanel evaluasiId="eval-1" onAllAgentsDone={onAllAgentsDone} />);
    expect(onAllAgentsDone).not.toHaveBeenCalled();

    mockUseAgentProgress.mockReturnValue({
      agents: buildAgents(Object.fromEntries(AGENT_DEFS.map(([key]) => [key, { status: 'done', progress: 100 }]))),
      isAllDone: true,
      error: null,
    });
    rerender(<AgentProgressPanel evaluasiId="eval-1" onAllAgentsDone={onAllAgentsDone} />);
    expect(onAllAgentsDone).toHaveBeenCalledTimes(1);

    // A further re-render while still done must not call it again.
    rerender(<AgentProgressPanel evaluasiId="eval-1" onAllAgentsDone={onAllAgentsDone} />);
    expect(onAllAgentsDone).toHaveBeenCalledTimes(1);
  });
});
