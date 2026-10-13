import { describe, expect, it } from 'vitest';
import {
  CHECKLIST_TEMPLATES,
  checklistTemplateForTransport,
  makeChecklistTemplate,
} from '../lib/templates';

describe('transport checklist templates', () => {
  it.each([
    ['car', 'car'],
    ['train', 'train'],
    ['plane', 'plane'],
    ['bus', 'public'],
    ['mixed', 'public'],
  ] as const)('maps %s trips to the %s checklist', (mode, expected) => {
    expect(checklistTemplateForTransport(mode)).toBe(expected);
  });

  it('keeps the four transport templates distinct and applicable', () => {
    const lists = (['car', 'train', 'plane', 'public'] as const).map((key) =>
      makeChecklistTemplate(key),
    );
    expect(lists.every((items) => items.length > 0)).toBe(true);
    expect(new Set(lists.map((items) => items.map((item) => item.name).join('|'))).size).toBe(4);
    expect(lists[0].some((item) => item.name === 'ابزار و لاستیک زاپاس')).toBe(true);
    expect(lists[1].some((item) => item.name === 'بالش گردنی و چشم‌بند')).toBe(true);
    expect(lists[2].some((item) => item.name === 'کارت پرواز و اطلاعات چک‌این')).toBe(true);
    expect(lists[3].some((item) => item.name === 'کارت یا اپلیکیشن پرداخت کرایه')).toBe(true);
  });

  it('does not duplicate items when applying a template to an existing checklist', () => {
    const first = makeChecklistTemplate('plane');
    const second = makeChecklistTemplate('plane', first);
    expect(second).toHaveLength(0);
    expect(CHECKLIST_TEMPLATES.plane.items.length).toBeGreaterThan(0);
  });
});
