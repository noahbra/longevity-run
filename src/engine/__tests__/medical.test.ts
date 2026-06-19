import { describe, it, expect } from 'vitest';
import type { RecoveryInputs, UserState } from '../../types';
import { seedState } from '../../state/seed';
import { resolveDirective } from '../governors';
import { selectToday } from '../selectToday';
import { applyDailyLog } from '../transitions';

// §7: the `diffuseSoreness` input is wired ONLY to a reminder. It must NEVER
// alter training load or any directive.
describe('medical guardrail — diffuseSoreness cannot change any prescription (§7)', () => {
  const base: UserState = {
    ...seedState('2026-06-12'),
    inDeload: false,
    deloadStartDate: null,
    nextIndex: 0,
    lastSessionDate: '2026-06-18',
  };

  const recovery = (s: 'normal' | 'up'): RecoveryInputs => ({
    achilles: 'same', back: 'same', sleepQuality: 'good', energy: 'good', diffuseSoreness: s,
  });

  it('resolveDirective is identical regardless of diffuseSoreness', () => {
    expect(resolveDirective(recovery('up'))).toEqual(resolveDirective(recovery('normal')));
  });

  it('selectToday plan is identical regardless of diffuseSoreness', () => {
    const normal = selectToday(base, recovery('normal'), '2026-06-19');
    const up = selectToday(base, recovery('up'), '2026-06-19');
    expect(up.plan).toEqual(normal.plan);
    expect(up.resolved.directive).toEqual(normal.resolved.directive);
  });

  it('logging diffuseSoreness only touches its own trend, no governor input', () => {
    const after = applyDailyLog(base, {
      date: '2026-06-19', achilles: 'same', back: 'same', diffuseSoreness: 'up',
      diet: {} as never,
    });
    // The directive-feeding trends are untouched by the soreness log.
    expect(after.trends.achilles).toEqual([...base.trends.achilles, 'same']);
    expect(after.trends.back).toEqual([...base.trends.back, 'same']);
    expect(after.trends.diffuseSoreness).toEqual([...base.trends.diffuseSoreness, 'up']);
    // And the resulting plan is still identical to the soreness='normal' world.
    const planAfter = selectToday({ ...after }, recovery('up'), '2026-06-20');
    const planControl = selectToday(
      applyDailyLog(base, { date: '2026-06-19', achilles: 'same', back: 'same', diffuseSoreness: 'normal', diet: {} as never }),
      recovery('normal'),
      '2026-06-20',
    );
    expect(planAfter.plan).toEqual(planControl.plan);
  });
});
