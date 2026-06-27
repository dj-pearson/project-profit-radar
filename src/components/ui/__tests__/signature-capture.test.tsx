/**
 * US-108: signature capture pad
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignatureCapture } from '@/components/ui/signature-capture';

describe('SignatureCapture (US-108)', () => {
  it('renders a canvas drawing area and a Clear button', () => {
    render(<SignatureCapture onChange={() => {}} />);
    expect(screen.getByRole('img', { name: /signature drawing area/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('disables Clear when empty and enables it with a prefilled signature', () => {
    const { rerender } = render(<SignatureCapture onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();

    rerender(<SignatureCapture value="data:image/png;base64,AAAA" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /clear/i })).not.toBeDisabled();
  });

  it('emits null and disables Clear after clearing', () => {
    const onChange = vi.fn();
    render(<SignatureCapture value="data:image/png;base64,AAAA" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
  });
});
