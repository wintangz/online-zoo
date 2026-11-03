import type { InteractiveObjectDescriptor } from '../types';
import { PANDA_FOREST_INTERACTIVE_OBJECTS } from '../world/pandaForestLayout';

export interface InteractionEvaluationResult {
  focusedObject: InteractiveObjectDescriptor | null;
  distance: number | null;
}

export function validateInteractiveObjectDescriptor(descriptor: InteractiveObjectDescriptor): void {
  if (!descriptor.id || descriptor.id.trim().length === 0) {
    throw new Error('InteractiveObjectDescriptor.id must be a non-empty slug');
  }
  if (!descriptor.title || descriptor.title.length < 1 || descriptor.title.length > 60) {
    throw new Error('InteractiveObjectDescriptor.title must be 1-60 chars');
  }
  if (
    !descriptor.promptAction ||
    descriptor.promptAction.length < 1 ||
    descriptor.promptAction.length > 30
  ) {
    throw new Error('InteractiveObjectDescriptor.promptAction must be 1-30 chars');
  }
  if (descriptor.interactionRadius < 1.5 || descriptor.interactionRadius > 4.5) {
    throw new Error('InteractiveObjectDescriptor.interactionRadius must be in [1.5m, 4.5m]');
  }
  if (descriptor.archetype === 'info_plaque' && !descriptor.infoCard) {
    throw new Error('infoCard is required when archetype === "info_plaque"');
  }
  if (descriptor.archetype === 'world_prop' && !descriptor.propReactionType) {
    throw new Error('propReactionType is required when archetype === "world_prop"');
  }
}

export class InteractionSystem {
  private registry = new Map<string, InteractiveObjectDescriptor>();

  constructor(initialObjects: InteractiveObjectDescriptor[] = PANDA_FOREST_INTERACTIVE_OBJECTS) {
    for (const obj of initialObjects) {
      this.register(obj);
    }
  }

  public register(descriptor: InteractiveObjectDescriptor): void {
    validateInteractiveObjectDescriptor(descriptor);
    this.registry.set(descriptor.id, descriptor);
  }

  public unregister(id: string): void {
    this.registry.delete(id);
  }

  public getAll(): InteractiveObjectDescriptor[] {
    return Array.from(this.registry.values());
  }

  /**
   * Evaluates all registered interactive objects against avatarPosition and avatarFacingYaw.
   * When multiple objects are within interactionRadius, selects the single best candidate
   * prioritized by proximity and facing alignment (FR-016).
   */
  public evaluate(
    avatarPosition: [number, number, number],
    avatarFacingYaw: number
  ): InteractionEvaluationResult {
    let bestObject: InteractiveObjectDescriptor | null = null;
    let bestScore = Infinity;
    let bestDist: number | null = null;

    const forwardX = Math.sin(avatarFacingYaw);
    const forwardZ = Math.cos(avatarFacingYaw);

    for (const obj of this.registry.values()) {
      const dx = obj.position[0] - avatarPosition[0];
      const dz = obj.position[2] - avatarPosition[2];
      const dist = Math.hypot(dx, dz);

      if (dist <= obj.interactionRadius) {
        let alignmentPenalty = 0;
        if (dist > 0.001) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const dot = dirX * forwardX + dirZ * forwardZ; // in [-1, 1]
          // Objects in front of avatar get slightly lower (better) score when distances are similar
          alignmentPenalty = (1 - dot) * 0.35;
        }
        const score = dist + alignmentPenalty;
        if (score < bestScore) {
          bestScore = score;
          bestObject = obj;
          bestDist = dist;
        }
      }
    }

    return {
      focusedObject: bestObject,
      distance: bestDist
    };
  }

  public trigger(objectId: string): {
    descriptor: InteractiveObjectDescriptor;
    archetype: InteractiveObjectDescriptor['archetype'];
    timestamp: number;
  } | null {
    const descriptor = this.registry.get(objectId);
    if (!descriptor) return null;
    return {
      descriptor,
      archetype: descriptor.archetype,
      timestamp: Date.now()
    };
  }
}

