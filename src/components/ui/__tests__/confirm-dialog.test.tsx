import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import {
  ConfirmDialog,
  ConfirmDialogHost,
  confirmAction,
  useConfirm,
} from '@/components/ui/confirm-dialog';

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        if (await confirm({ title: 'Delete this estimate?', description: 'This cannot be undone.', destructive: true })) {
          onDelete();
        }
      }}
    >
      Delete estimate
    </button>
  );
}

describe('useConfirm + ConfirmDialogHost', () => {
  it('runs the action only after the user confirms', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <>
        <DeleteButton onDelete={onDelete} />
        <ConfirmDialogHost />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Delete estimate' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete this estimate?');
    expect(dialog).toHaveTextContent('This cannot be undone.');
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('resolves false on cancel and does not run the action', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <>
        <DeleteButton onDelete={onDelete} />
        <ConfirmDialogHost />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Delete estimate' }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('resolves false on Escape', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    let result: Promise<boolean> | undefined;
    act(() => {
      result = confirmAction({ title: 'Close this period?', confirmLabel: 'Close period' });
    });
    await screen.findByRole('alertdialog');
    expect(screen.getByRole('button', { name: 'Close period' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await expect(result).resolves.toBe(false);
  });

  it('confirmAction resolves true when the user confirms', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    let result: Promise<boolean> | undefined;
    act(() => {
      result = confirmAction({ title: 'Delete GPT model?', destructive: true });
    });
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await expect(result).resolves.toBe(true);
  });

  it('App mounts exactly one host, so confirmAction is not always false in the app', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(app.match(/<ConfirmDialogHost\s*\/>/g)).toHaveLength(1);
  });

  it('resolves false when no host is mounted, so nothing runs unconfirmed', async () => {
    await expect(confirmAction({ title: 'Delete?' })).resolves.toBe(false);
  });
});

describe('ConfirmDialog (controlled)', () => {
  it('awaits an async onConfirm before closing', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((r) => { finish = r; }));

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete vendor?" destructive onConfirm={onConfirm} />
      );
    }
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
