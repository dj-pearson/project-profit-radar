import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { notFoundRoute } from '../index';

describe('catch-all 404 (US-383)', () => {
  it('tells crawlers not to index an unknown URL', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/no-such-page']}>
          <Routes>{notFoundRoute}</Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    });
  });
});
