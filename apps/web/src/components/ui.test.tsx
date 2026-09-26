import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cn, Input, Select } from './ui';

describe('cn', () => {
  it('lets later Tailwind classes override conflicting earlier ones', () => {
    expect(cn('w-full h-9', 'w-20')).toBe('h-9 w-20');
    const hidden = false;
    expect(cn('px-2', hidden && 'hidden', 'py-1')).toBe('px-2 py-1');
  });
});

describe('form controls', () => {
  it('use the width passed in instead of the default full width', () => {
    render(
      <>
        <Input aria-label="narrow" className="w-20" />
        <Input aria-label="default" />
        <Select aria-label="size" className="w-20" />
      </>,
    );
    expect(screen.getByLabelText('narrow')).toHaveClass('w-20');
    expect(screen.getByLabelText('narrow')).not.toHaveClass('w-full');
    expect(screen.getByLabelText('default')).toHaveClass('w-full');
    expect(screen.getByLabelText('size')).not.toHaveClass('w-full');
  });
});
