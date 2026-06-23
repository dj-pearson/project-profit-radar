import { describe, it, expect } from 'vitest';
import {
  TASK_STAGES, normalizeTaskStage, statusValueForStage, groupTasksByStage, assigneeInitials,
} from '../taskBoard';

describe('normalizeTaskStage', () => {
  it('maps known statuses to stage keys', () => {
    expect(normalizeTaskStage('todo')).toBe('todo');
    expect(normalizeTaskStage('in_progress')).toBe('in_progress');
    expect(normalizeTaskStage('review')).toBe('review');
    expect(normalizeTaskStage('completed')).toBe('done');
    expect(normalizeTaskStage('done')).toBe('done');
  });
  it('buckets unknown/empty into todo', () => {
    expect(normalizeTaskStage('on_hold')).toBe('todo');
    expect(normalizeTaskStage(null)).toBe('todo');
    expect(normalizeTaskStage(undefined)).toBe('todo');
  });
});

describe('statusValueForStage', () => {
  it('returns the persisted status value per stage (Done -> completed)', () => {
    expect(statusValueForStage('todo')).toBe('todo');
    expect(statusValueForStage('in_progress')).toBe('in_progress');
    expect(statusValueForStage('review')).toBe('review');
    expect(statusValueForStage('done')).toBe('completed');
  });
  it('defaults unknown stage to todo', () => {
    expect(statusValueForStage('nope')).toBe('todo');
  });
});

describe('groupTasksByStage', () => {
  const tasks = [
    { id: '1', name: 'A', status: 'todo' },
    { id: '2', name: 'B', status: 'in_progress' },
    { id: '3', name: 'C', status: 'completed' },
    { id: '4', name: 'D', status: 'on_hold' }, // -> todo
    { id: '5', name: 'E', status: 'review' },
  ];
  it('returns all four stages in order', () => {
    expect(groupTasksByStage(tasks).map((c) => c.key)).toEqual(['todo', 'in_progress', 'review', 'done']);
  });
  it('counts tasks per stage, bucketing unknown into todo', () => {
    const cols = groupTasksByStage(tasks);
    expect(cols.find((c) => c.key === 'todo')!.count).toBe(2);
    expect(cols.find((c) => c.key === 'done')!.count).toBe(1);
    expect(cols.find((c) => c.key === 'review')!.count).toBe(1);
  });
});

describe('assigneeInitials', () => {
  it('builds initials from first + last name', () => {
    expect(assigneeInitials({ first_name: 'Jane', last_name: 'Doe' })).toBe('JD');
  });
  it('handles single name and null', () => {
    expect(assigneeInitials({ first_name: 'Cher' })).toBe('C');
    expect(assigneeInitials(null)).toBe('');
  });
});
