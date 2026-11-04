import { gameStore } from '../state/gameStore';
import type { InputController } from './inputController';

export interface DesktopInputBindingOptions {
  targetElement: HTMLElement | null;
  mouseRadiansPerPixel?: number;
  zoomMetersPerWheelTick?: number;
  maxMousePixelSpike?: number;
}

function isInteractiveUiElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('button, input, select, textarea, a, label, [data-ui-interactive="true"]')
  );
}

function blurFocusedUiElement(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    active !== document.documentElement
  ) {
    active.blur();
  }
}

/**
 * Attaches desktop keyboard, non-trapping LMB/RMB mouse-drag camera orbit (plus Pointer Lock
 * when explicitly active), wheel zoom, Alt cursor mode indicator (ignoring key auto-repeat),
 * DOM text-selection/drag suppression, and window blur/resize reset handlers.
 */
export function attachDesktopInputBindings(
  controller: InputController,
  options: DesktopInputBindingOptions
): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const mouseScale = options.mouseRadiansPerPixel ?? 0.0042;
  const wheelScale = options.zoomMetersPerWheelTick ?? 0.0025;
  const maxPixelDelta = options.maxMousePixelSpike ?? 80;

  let isMouseDragging = false;
  let lastMouseX: number | null = null;
  let lastMouseY: number | null = null;

  const isPlaying = () => {
    const state = gameStore.getState();
    return (
      state.phase === 'playing' &&
      state.activePlaqueModal === null &&
      !state.identity.draft.isOpen
    );
  };

  const isTargetPointerLocked = () => {
    const el = options.targetElement;
    return Boolean(el && document.pointerLockElement === el);
  };

  const exitLockIfActive = () => {
    if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (e.repeat) return;
      e.preventDefault();
      blurFocusedUiElement();
      controller.setKeyState('Escape', true);
      const st = gameStore.getState();
      if (st.identity.draft.isOpen) {
        st.cancelAvatarCustomizer();
        controller.resetAll();
      } else if (st.activePlaqueModal) {
        st.closePlaqueModal();
        controller.resetAll();
      } else if (st.phase === 'playing') {
        isMouseDragging = false;
        exitLockIfActive();
        controller.resetAll();
        st.setPhase('paused');
        st.setCursorState(false, true);
      } else if (st.phase === 'paused') {
        st.setPhase('playing');
        st.setCursorState(false, false);
      }
      return;
    }

    // Holding Alt pauses camera orbit and marks cursor unlocked (ignore key auto-repeat!)
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      e.preventDefault();
      if (e.repeat) return;
      isMouseDragging = false;
      controller.setKeyState(e.code, true);
      exitLockIfActive();
      gameStore.getState().setCursorState(false, true);
      return;
    }

    if (!isPlaying()) return;

    if (
      [
        'Space',
        'Enter',
        'Tab',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyE',
        'KeyF'
      ].includes(e.code)
    ) {
      // Prevent Space/Enter from activating a previously clicked HUD button or scrolling
      if (!isInteractiveUiElement(e.target) || e.code === 'Space') {
        e.preventDefault();
        blurFocusedUiElement();
      }
    }

    if (e.repeat && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyF')) {
      return;
    }

    controller.setKeyState(e.code, true);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    controller.setKeyState(e.code, false);

    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      e.preventDefault();
      if (isPlaying()) {
        gameStore.getState().setCursorState(isTargetPointerLocked(), false);
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    if (isInteractiveUiElement(e.target)) {
      return;
    }

    // Prevent browser native text selection and drag-and-drop initiation on canvas clicks
    if (options.targetElement && options.targetElement.contains(e.target as Node)) {
      e.preventDefault();
    }
    blurFocusedUiElement();

    if (!isPlaying()) return;

    // Start non-trapping LMB/RMB camera drag orbit (never call requestPointerLock on single click
    // so <canvas> never hijacks pointer events from HUD buttons in Chrome)
    if (e.button === 0 || e.button === 2) {
      isMouseDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      if (!controller.isCursorRevealHeld()) {
        gameStore.getState().setCursorState(isTargetPointerLocked(), false);
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isPlaying()) {
      isMouseDragging = false;
      return;
    }

    const st = gameStore.getState();
    if (st.isCursorRevealed || controller.isCursorRevealHeld()) {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      return;
    }

    const isLocked = isTargetPointerLocked();
    const hasButtons = (e.buttons & 1) === 1 || (e.buttons & 2) === 2;
    if (!hasButtons) {
      isMouseDragging = false;
    }
    const isDragging = isMouseDragging || hasButtons;

    if (isLocked || isDragging) {
      let rawDX = 0;
      let rawDY = 0;

      if (!isLocked && lastMouseX !== null && lastMouseY !== null) {
        rawDX = e.clientX - lastMouseX;
        rawDY = e.clientY - lastMouseY;
      }
      if (rawDX === 0 && rawDY === 0) {
        rawDX = typeof e.movementX === 'number' ? e.movementX : 0;
        rawDY = typeof e.movementY === 'number' ? e.movementY : 0;
      }

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      // Clamp per-event pixel spikes
      const clampedDX = Math.max(-maxPixelDelta, Math.min(maxPixelDelta, rawDX));
      const clampedDY = Math.max(-maxPixelDelta, Math.min(maxPixelDelta, rawDY));

      if (clampedDX !== 0 || clampedDY !== 0) {
        controller.addLookDelta(clampedDX * mouseScale, clampedDY * mouseScale, 'desktop');
      }
    } else {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  };

  const onMouseUp = () => {
    isMouseDragging = false;
    lastMouseX = null;
    lastMouseY = null;
  };

  const onWheel = (e: WheelEvent) => {
    if (!isPlaying()) return;
    controller.addZoomDelta(e.deltaY * wheelScale, 'desktop');
  };

  const onPointerLockChange = () => {
    const locked = isTargetPointerLocked();
    const st = gameStore.getState();
    st.setCursorState(locked, st.isCursorRevealed);
  };

  const onSelectOrDragStart = (e: Event) => {
    if (isInteractiveUiElement(e.target)) return;
    e.preventDefault();
  };

  const onContextMenu = (e: MouseEvent) => {
    if (isInteractiveUiElement(e.target)) return;
    e.preventDefault();
  };

  const onBlurOrVisibility = () => {
    if (document.hidden || !document.hasFocus()) {
      isMouseDragging = false;
      lastMouseX = null;
      lastMouseY = null;
      controller.resetAll();
      const st = gameStore.getState();
      st.setLocomotionState('Idle');
      if (st.phase === 'playing' && !st.activePlaqueModal) {
        st.setCursorState(false, false);
      }
    }
  };

  const onResize = () => {
    isMouseDragging = false;
    lastMouseX = null;
    lastMouseY = null;
    controller.resetAll();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', onBlurOrVisibility);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onBlurOrVisibility);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('selectstart', onSelectOrDragStart);
  document.addEventListener('dragstart', onSelectOrDragStart);
  options.targetElement?.addEventListener('contextmenu', onContextMenu);

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('blur', onBlurOrVisibility);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onBlurOrVisibility);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('selectstart', onSelectOrDragStart);
    document.removeEventListener('dragstart', onSelectOrDragStart);
    options.targetElement?.removeEventListener('contextmenu', onContextMenu);
    exitLockIfActive();
  };

  controller.registerCleanup(cleanup);
  return cleanup;
}
