import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AccessibleModal } from '../AccessibleModal';

// Unmocked hooks: this file covers the real close behaviour. A document-level
// mousedown listener used to call onClose for every click inside the dialog.

const backdropOf = () => screen.getByRole('dialog').previousElementSibling as HTMLElement;

function Harness({ onClose, disableClickOutside }: { onClose: () => void; disableClickOutside?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <AccessibleModal isOpen onClose={onClose} title="Edit" disableClickOutside={disableClickOutside}>
      <label htmlFor="name">Name</label>
      <input id="name" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button">Inside</button>
    </AccessibleModal>
  );
}

describe('AccessibleModal close behaviour', () => {
  it('stays open for clicks and typing inside the dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    await user.type(screen.getByLabelText('Name'), 'abc');
    await user.click(screen.getByText('Edit'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('abc');
  });

  it('closes on a click on the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(backdropOf());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a press starts inside and ends on the backdrop, or the reverse', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const input = screen.getByLabelText('Name');
    await user.pointer([{ keys: '[MouseLeft>]', target: input }, { target: backdropOf() }, { keys: '[/MouseLeft]' }]);
    await user.pointer([{ keys: '[MouseLeft>]', target: backdropOf() }, { target: input }, { keys: '[/MouseLeft]' }]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores backdrop clicks when disableClickOutside is set', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} disableClickOutside />);
    await user.click(backdropOf());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
