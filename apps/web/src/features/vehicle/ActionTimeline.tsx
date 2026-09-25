import { ACTION_STATUS_LABELS, NOTE_EDIT_WINDOW_HOURS, NOTE_MAX_LENGTH, type ActionView } from '@ims/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, EmptyState, Textarea } from '../../components/ui';
import { api } from '../../lib/endpoints';
import { formatDate, formatMoney } from '../../lib/format';
import { invalidateInventory } from '../../lib/query';

export function canEditNote(action: ActionView, meId: string | undefined, now: Date): boolean {
  return (
    !!meId &&
    action.createdBy.id === meId &&
    now.getTime() - new Date(action.createdAt).getTime() <= NOTE_EDIT_WINDOW_HOURS * 3_600_000
  );
}

function NoteBlock({ action, editable }: { action: ActionView; editable: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(action.note ?? '');
  const save = useMutation({
    mutationFn: () => api.updateNote(action.id, text.trim()),
    onSuccess: async () => {
      setEditing(false);
      await invalidateInventory(qc);
    },
  });

  if (editing) {
    return (
      <div className="mt-1 space-y-1">
        <Textarea aria-label="Edit note" value={text} maxLength={NOTE_MAX_LENGTH} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save note</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
        {save.error && <p role="alert" className="text-xs text-red-600">{save.error.message}</p>}
      </div>
    );
  }
  return (
    <div className="mt-1 text-sm text-slate-700">
      {action.note && <p className="whitespace-pre-wrap">{action.note}</p>}
      {editable && (
        <button type="button" className="text-xs text-slate-500 underline" onClick={() => setEditing(true)}>
          Edit note
        </button>
      )}
    </div>
  );
}

export function ActionTimeline({
  actions,
  meId,
  timezone,
  currency,
  now = new Date(),
}: {
  actions: ActionView[];
  meId?: string;
  timezone: string;
  currency: string;
  now?: Date;
}) {
  if (actions.length === 0) return <EmptyState>No actions logged yet.</EmptyState>;
  return (
    <ol className="space-y-4 border-l border-slate-200 pl-4">
      {actions.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{ACTION_STATUS_LABELS[a.status]}</span>
            {a.newPrice !== null && <span>→ {formatMoney(a.newPrice, currency)}</span>}
            {a.targetDate && <Badge>Target {a.targetDate}</Badge>}
            {a.source === 'SUGGESTION' && <Badge tone="violet">Suggestion</Badge>}
            {a.bulkId && <Badge>Bulk</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            {formatDate(a.createdAt, timezone)} · {a.createdBy.fullName}
            {a.editedAt ? ' · note edited' : ''}
          </p>
          <NoteBlock action={a} editable={canEditNote(a, meId, now)} />
        </li>
      ))}
    </ol>
  );
}
