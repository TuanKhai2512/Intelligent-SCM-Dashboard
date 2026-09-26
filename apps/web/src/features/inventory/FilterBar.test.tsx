import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS } from './filters';
import { FilterBar } from './FilterBar';

const options = {
  makes: [
    { make: 'Kia', models: ['Seltos'] },
    { make: 'Toyota', models: ['Fortuner', 'Vios'] },
  ],
  year: { min: 2021, max: 2025 },
  price: { min: 400_000_000, max: 1_300_000_000 },
};

describe('FilterBar', () => {
  it('selects a make', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={EMPTY_FILTERS} options={options} onChange={onChange} onClear={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^Make/ }));
    await userEvent.click(screen.getByLabelText('Toyota'));
    expect(onChange).toHaveBeenCalledWith({ make: ['Toyota'], model: [] });
  });

  it('narrows models to the selected makes and drops models of removed makes', async () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, make: ['Toyota', 'Kia'], model: ['Vios', 'Seltos'] }}
        options={options}
        onChange={onChange}
        onClear={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Make/ }));
    await userEvent.click(screen.getByLabelText('Kia'));
    expect(onChange).toHaveBeenCalledWith({ make: ['Toyota'], model: ['Vios'] });
  });

  it('commits a price range in millions as full VND values', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={EMPTY_FILTERS} options={options} onChange={onChange} onClear={() => {}} />);
    const from = screen.getByLabelText('Price (M) from');
    fireEvent.change(from, { target: { value: '500' } });
    fireEvent.blur(from);
    expect(onChange).toHaveBeenCalledWith({ priceMin: 500_000_000, priceMax: undefined });
  });

  it('offers "No action" as a latest-action filter', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={EMPTY_FILTERS} options={options} onChange={onChange} onClear={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^Latest action/ }));
    await userEvent.click(screen.getByLabelText('No action'));
    expect(onChange).toHaveBeenCalledWith({ actionStatus: ['NONE'] });
  });
});
