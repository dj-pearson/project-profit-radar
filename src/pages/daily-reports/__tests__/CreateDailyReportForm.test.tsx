import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Canvas and tooltip plumbing are not what these tests are about.
vi.mock('@/components/ui/signature-capture', () => ({ SignatureCapture: () => null }));
vi.mock('@/components/help/HelpTooltip', () => ({ FormFieldHelp: () => null }));

import { CreateDailyReportForm } from '../CreateDailyReportForm';
import {
  dailyReportFormSchema,
  buildDailyReportInsert,
  EMPTY_DAILY_REPORT,
  type DailyReportFormValues,
} from '@/lib/validations/daily-reports';

function Harness({
  onSubmit,
  defaults = {},
}: {
  onSubmit: (v: DailyReportFormValues) => void;
  defaults?: Partial<DailyReportFormValues>;
}) {
  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportFormSchema),
    defaultValues: { ...EMPTY_DAILY_REPORT, ...defaults },
  });
  return (
    <CreateDailyReportForm
      form={form}
      onSubmit={onSubmit}
      onCancel={() => {}}
      projects={[{ id: 'proj-1', name: 'Smith Kitchen' }]}
      templates={[]}
      templatesError={null}
      onApplyTemplate={() => {}}
      onCreateTemplates={() => {}}
      onCopyFromYesterday={() => {}}
      copyingPrevious={false}
      onAutoFillWeather={() => {}}
      selectedPhotos={[]}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
    />
  );
}

describe('CreateDailyReportForm (US-268)', () => {
  it('blocks a report with no project and no work description', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create Report' }));

    expect(await screen.findByText('Select a project')).toBeInTheDocument();
    const work = screen.getByLabelText(/Work Performed/);
    const message = screen.getByText('Describe the work performed today');
    expect(work).toHaveAttribute('aria-invalid', 'true');
    expect(work.getAttribute('aria-describedby')).toContain(message.id);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('treats whitespace-only work as missing', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaults={{ project_id: 'proj-1' }} />);

    await user.type(screen.getByLabelText(/Work Performed/), '   ');
    await user.click(screen.getByRole('button', { name: 'Create Report' }));

    expect(await screen.findByText('Describe the work performed today')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a negative crew count', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaults={{ project_id: 'proj-1', work_performed: 'Framing' }} />);

    fireEvent.change(screen.getByLabelText(/Crew Count/), { target: { value: '-2' } });
    await user.click(screen.getByRole('button', { name: 'Create Report' }));

    expect(await screen.findByText('Crew count cannot be negative')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid input as the same daily_reports insert as before', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaults={{ project_id: 'proj-1' }} />);

    await user.type(screen.getByLabelText(/Work Performed/), 'Framed north wall');
    fireEvent.change(screen.getByLabelText(/Crew Count/), { target: { value: '4' } });
    await user.type(screen.getByLabelText(/Weather Conditions/), 'Sunny');
    await user.click(screen.getByRole('button', { name: 'Create Report' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as DailyReportFormValues;
    // The useState version sent { ...newReport, crew_count: Number(..), date,
    // photos: paths or null, signature: signature || null }.
    expect(buildDailyReportInsert(values, { date: '2026-09-23', photoPaths: [] })).toEqual({
      project_id: 'proj-1',
      work_performed: 'Framed north wall',
      crew_count: 4,
      weather_conditions: 'Sunny',
      materials_delivered: '',
      equipment_used: '',
      delays_issues: '',
      safety_incidents: '',
      signature: null,
      date: '2026-09-23',
      photos: null,
    });
  });

  it('keeps photo paths and a signature in the insert', () => {
    const row = buildDailyReportInsert(
      { ...EMPTY_DAILY_REPORT, project_id: 'p', work_performed: 'w', signature: 'data:image/png;base64,AA' },
      { date: '2026-09-23', photoPaths: ['p/daily/a.jpg'] },
    );
    expect(row.photos).toEqual(['p/daily/a.jpg']);
    expect(row.signature).toBe('data:image/png;base64,AA');
  });
});
