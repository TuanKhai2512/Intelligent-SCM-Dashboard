import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from './MultiSelect';

const MAKES = [
  { value: 'Kia', label: 'Kia' },
  { value: 'Toyota', label: 'Toyota' },
];
const BUCKETS = [
  { value: 'FRESH', label: 'Fresh' },
  { value: 'AGING', label: 'Aging' },
];

function Two() {
  const [make, setMake] = useState<string[]>([]);
  const [bucket, setBucket] = useState<string[]>([]);
  return (
    <div>
      <MultiSelect label="Make" options={MAKES} value={make} onChange={setMake} />
      <MultiSelect label="Age bucket" options={BUCKETS} value={bucket} onChange={setBucket} />
      <p>Outside</p>
    </div>
  );
}

const trigger = (name: RegExp) => screen.getByRole('button', { name });

describe('MultiSelect', () => {
  it('is closed until its button is clicked', async () => {
    render(<Two />);
    expect(trigger(/^Make/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Toyota')).not.toBeInTheDocument();
    await userEvent.click(trigger(/^Make/));
    expect(trigger(/^Make/)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Make' })).toBeInTheDocument();
  });

  it('closes when another dropdown is opened, so only one is open', async () => {
    render(<Two />);
    await userEvent.click(trigger(/^Make/));
    await userEvent.click(trigger(/^Age bucket/));
    expect(screen.queryByRole('group', { name: 'Make' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Age bucket' })).toBeInTheDocument();
  });

  it('closes when another dropdown is opened by keyboard, so only one is open', async () => {
    render(<Two />);
    trigger(/^Make/).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('group', { name: 'Make' })).toBeInTheDocument();

    trigger(/^Age bucket/).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('group', { name: 'Make' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Age bucket' })).toBeInTheDocument();
  });

  it('closes on a click outside', async () => {
    render(<Two />);
    await userEvent.click(trigger(/^Make/));
    await userEvent.click(screen.getByText('Outside'));
    expect(screen.queryByRole('group', { name: 'Make' })).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to its button', async () => {
    render(<Two />);
    await userEvent.click(trigger(/^Make/));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Make' })).not.toBeInTheDocument();
    expect(trigger(/^Make/)).toHaveFocus();
  });

  it('stays open while ticking several options and shows the count', async () => {
    render(<Two />);
    await userEvent.click(trigger(/^Make/));
    await userEvent.click(screen.getByLabelText('Kia'));
    await userEvent.click(screen.getByLabelText('Toyota'));
    expect(screen.getByRole('group', { name: 'Make' })).toBeInTheDocument();
    expect(screen.getByLabelText('Kia')).toBeChecked();
    expect(screen.getByLabelText('Toyota')).toBeChecked();
    expect(trigger(/^Make/)).toHaveTextContent('2');
  });

  it('toggles closed when its own button is clicked again', async () => {
    const onChange = vi.fn();
    render(<MultiSelect label="Make" options={MAKES} value={[]} onChange={onChange} />);
    await userEvent.click(trigger(/^Make/));
    await userEvent.click(trigger(/^Make/));
    expect(screen.queryByRole('group', { name: 'Make' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
