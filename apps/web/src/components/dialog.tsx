import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Button } from './ui';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children }: BaseProps & { description?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl focus:outline-none">
          <D.Title className="text-base font-semibold">{title}</D.Title>
          <D.Description className={description ? 'mt-1 text-sm text-slate-500' : 'sr-only'}>
            {description ?? title}
          </D.Description>
          <div className="mt-4">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Drawer({ open, onOpenChange, title, children }: BaseProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-slate-900/30" />
        <D.Content className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col bg-white shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            <D.Close asChild>
              <Button variant="ghost" size="sm">
                Close
              </Button>
            </D.Close>
          </div>
          <D.Description className="sr-only">{title}</D.Description>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
