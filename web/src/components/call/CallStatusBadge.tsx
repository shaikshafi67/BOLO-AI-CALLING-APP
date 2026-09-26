import type { CallStatus } from '../../types';
import { Badge, type BadgeTone } from '../ui/Badge';

const map: Record<CallStatus, { tone: BadgeTone; label: string }> = {
  completed: { tone: 'success', label: 'Completed' },
  missed: { tone: 'warning', label: 'Missed' },
  declined: { tone: 'neutral', label: 'Declined' },
  failed: { tone: 'danger', label: 'Failed' },
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const { tone, label } = map[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
