import React from 'react';
import { Circle, Hourglass, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export type AgentStatus = 'idle' | 'waiting' | 'running' | 'done' | 'error';

export interface AgentStatusIconProps {
  status: AgentStatus;
  size?: number;
}

export default function AgentStatusIcon({ status, size = 20 }: AgentStatusIconProps) {
  switch (status) {
    case 'idle':
      return (
        <Circle
          size={size}
          className="text-gray-400 dark:text-gray-600"
          data-testid="status-icon-idle"
        />
      );
    case 'waiting':
      return (
        <Hourglass
          size={size}
          className="text-amber-500"
          data-testid="status-icon-waiting"
        />
      );
    case 'running':
      return (
        <Loader2
          size={size}
          className="text-blue-500 animate-spin"
          data-testid="status-icon-running"
        />
      );
    case 'done':
      return (
        <CheckCircle2
          size={size}
          className="text-emerald-500"
          data-testid="status-icon-done"
        />
      );
    case 'error':
      return (
        <XCircle
          size={size}
          className="text-red-500"
          data-testid="status-icon-error"
        />
      );
    default:
      return null;
  }
}
