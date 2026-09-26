import type { VehicleDetail } from '@ims/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '../../components/dialog';
import { Button, Field, Input } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { api } from '../../lib/endpoints';
import { invalidateInventory } from '../../lib/query';

export function CloseVehicleButton({ vehicle, kind, currency }: { vehicle: VehicleDetail; kind: 'sell' | 'wholesale'; currency: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(vehicle.listPrice));
  const valid = Number(price) > 0;
  const close = useMutation({
    mutationFn: () => api.closeVehicle(vehicle.id, kind, { salePrice: Number(price) }),
    onSuccess: async () => {
      setOpen(false);
      await invalidateInventory(qc);
    },
    // 409 means the vehicle was closed elsewhere: reconcile the stale detail/inventory.
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) await invalidateInventory(qc);
    },
  });
  const label = kind === 'sell' ? 'Mark as sold' : 'Mark as wholesaled';

  return (
    <>
      <Button variant={kind === 'sell' ? 'primary' : 'secondary'} onClick={() => setOpen(true)}>{label}</Button>
      <Modal open={open} onOpenChange={setOpen} title={kind === 'sell' ? 'Record sale' : 'Record auction sale'}
        description={`${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.vin}`}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) close.mutate(); }}>
          <Field label={`Sale price (${currency})`} htmlFor={`sale-price-${kind}`}>
            <Input id={`sale-price-${kind}`} type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          {close.error && <p role="alert" className="text-sm text-red-600">{close.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!valid || close.isPending}>Confirm</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
