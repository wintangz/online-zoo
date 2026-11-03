import { describe, expect, it } from 'vitest';
import { InteractionSystem, PANDA_FOREST_INTERACTIVE_OBJECTS } from '../src';

describe('InteractionSystem (US3 Proximity, Overlapping Disambiguation & Mixed Archetypes)', () => {
  it('registers at least 3 interactive objects covering both info_plaque and world_prop archetypes (FR-015, FR-018)', () => {
    const sys = new InteractionSystem();
    const all = sys.getAll();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.some((o) => o.archetype === 'info_plaque' && Boolean(o.infoCard))).toBe(true);
    expect(all.some((o) => o.archetype === 'world_prop' && Boolean(o.propReactionType))).toBe(
      true
    );
  });

  it('detects objects within interactionRadius and returns null when out of range (FR-016, SC-006)', () => {
    const sys = new InteractionSystem();
    const plaque = PANDA_FOREST_INTERACTIVE_OBJECTS[0];

    const nearEval = sys.evaluate(
      [plaque.position[0], 0, plaque.position[2] + 1.2],
      Math.PI
    );
    expect(nearEval.focusedObject?.id).toBe(plaque.id);

    const farEval = sys.evaluate([0, 0, 30], 0);
    expect(farEval.focusedObject).toBeNull();
  });

  it('disambiguates overlapping interactive objects by selecting the single closest/aligned target (FR-016)', () => {
    const sys = new InteractionSystem([
      {
        id: 'obj-front',
        title: 'Front Sign',
        promptAction: 'Read Front',
        archetype: 'info_plaque',
        position: [0, 0, 2.0],
        interactionRadius: 3.5,
        infoCard: { heading: 'Front', body: 'Body', facts: ['Fact 1'] }
      },
      {
        id: 'obj-back',
        title: 'Back Lantern',
        promptAction: 'Toggle Back',
        archetype: 'world_prop',
        position: [0, 0, -2.0],
        interactionRadius: 3.5,
        propReactionType: 'toggle_lantern'
      }
    ]);

    // Standing at origin facing +Z (yaw = 0) -> should select obj-front
    const evalFront = sys.evaluate([0, 0, 0], 0);
    expect(evalFront.focusedObject?.id).toBe('obj-front');

    // Standing at origin facing -Z (yaw = PI) -> should select obj-back
    const evalBack = sys.evaluate([0, 0, 0], Math.PI);
    expect(evalBack.focusedObject?.id).toBe('obj-back');

    // Trigger returns archetype payload
    const triggered = sys.trigger('obj-back');
    expect(triggered?.archetype).toBe('world_prop');
    expect(triggered?.descriptor.propReactionType).toBe('toggle_lantern');
  });
});

