import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { gameStore, type InputController, TouchInputAdapter } from '@online-zoo/game-core';

export interface TouchControlsOverlayProps {
  inputController: InputController;
}

export function isMobileOrTouchPrimaryPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePrimary =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none) and (any-pointer: coarse)').matches);
  const mobileUserAgent =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile|Touch/i.test(navigator.userAgent);
  return Boolean(coarsePrimary || mobileUserAgent);
}

export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = ({ inputController }) => {
  const phase = useStore(gameStore, (s) => s.phase);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const adapter = useMemo(() => new TouchInputAdapter(inputController), [inputController]);

  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRunToggled, setIsRunToggled] = useState(false);
  const [isTouchPlatform, setIsTouchPlatform] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updatePlatformDetection = () => {
      setIsTouchPlatform(isMobileOrTouchPrimaryPlatform());
    };
    updatePlatformDetection();
    window.addEventListener('resize', updatePlatformDetection);
    return () => {
      window.removeEventListener('resize', updatePlatformDetection);
    };
  }, []);

  // Listen for touch gestures on the window; if any touch event occurs on a touchscreen-capable device, activate touch mode
  useEffect(() => {
    if (phase !== 'playing' || typeof window === 'undefined') return;

    const isInsideInteractiveControl = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'button, input, select, [data-testid="virtual-joystick-pad"], [data-ui-interactive="true"]'
        )
      );
    };

    const onWindowTouchStart = (e: TouchEvent) => {
      inputController.addLookDelta(0, 0, 'touch');
      gameStore.getState().setActiveDevice('touch');
      if (isInsideInteractiveControl(e.target)) return;
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX >= window.innerWidth * 0.4) {
        if (e.touches.length === 1) {
          adapter.startCameraTouch(t.clientX, t.clientY);
        }
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (isInsideInteractiveControl(e.target)) return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (t && t.clientX >= window.innerWidth * 0.35) {
          adapter.moveCameraTouch(t.clientX, t.clientY);
        }
      } else if (e.touches.length >= 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (t0 && t1) {
          adapter.updatePinchZoom(t0, t1);
        }
      }
    };

    const onWindowTouchEnd = () => {
      adapter.endCameraTouch();
    };

    window.addEventListener('touchstart', onWindowTouchStart, { passive: true });
    window.addEventListener('touchmove', onWindowTouchMove, { passive: true });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onWindowTouchStart);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  }, [phase, adapter, inputController]);

  const showTouchControls = activeDevice === 'touch' || isTouchPlatform;

  if (phase !== 'playing' || !showTouchControls) {
    return null;
  }

  const maxRadius = 44;

  const updateJoystickFromClientXY = (clientX: number, clientY: number) => {
    const rect = joystickContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const kx = clampedDist * Math.cos(angle);
    const ky = clampedDist * Math.sin(angle);

    setKnobOffset({ x: kx, y: ky });
    adapter.updateJoystickFromDisplacement(kx, ky, maxRadius);
  };

  const handleJoystickRelease = () => {
    setKnobOffset({ x: 0, y: 0 });
    adapter.releaseJoystick();
  };

  const handleToggleRun = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const next = adapter.toggleRunButton();
    setIsRunToggled(next);
  };

  return (
    <div
      data-testid="touch-controls-overlay"
      className="pointer-events-none fixed inset-0 z-30 flex select-none flex-col justify-end p-5"
    >
      {/* Right-Half Touch-and-Drag Camera Orbit & Pinch Zoom Surface (pointer-events-none on desktop so mouse clicks reach the 3D canvas) */}
      <div
        data-testid="touch-camera-zone"
        className={`fixed right-0 top-16 h-[60vh] w-1/2 touch-none select-none ${
          activeDevice === 'touch' ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        onTouchStart={(e) => {
          const t0 = e.touches[0];
          if (e.touches.length === 1 && t0) {
            adapter.startCameraTouch(t0.clientX, t0.clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            const t0 = e.touches[0];
            if (t0) {
              adapter.moveCameraTouch(t0.clientX, t0.clientY);
            }
          } else if (e.touches.length >= 2) {
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            if (t0 && t1) {
              adapter.updatePinchZoom(t0, t1);
            }
          }
        }}
        onTouchEnd={() => adapter.endCameraTouch()}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') {
            adapter.startCameraTouch(e.clientX, e.clientY);
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch' && e.buttons > 0) {
            adapter.moveCameraTouch(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch') {
            adapter.endCameraTouch();
          }
        }}
      />

      {/* Bottom Controls Row: Virtual Joystick (Walk) on Left, Action Buttons on Right */}
      <div className="flex select-none items-end justify-between">
        {/* Virtual Joystick (FR-013: controls directional walking speed) */}
        <div
          ref={joystickContainerRef}
          data-testid="virtual-joystick-pad"
          data-ui-interactive="true"
          className="pointer-events-auto relative flex h-28 w-28 touch-none select-none items-center justify-center rounded-full border-2 border-white/35 bg-emerald-950/60 shadow-xl backdrop-blur-md"
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) updateJoystickFromClientXY(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) updateJoystickFromClientXY(t.clientX, t.clientY);
          }}
          onTouchEnd={handleJoystickRelease}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            updateJoystickFromClientXY(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) {
              updateJoystickFromClientXY(e.clientX, e.clientY);
            }
          }}
          onPointerUp={handleJoystickRelease}
          onPointerCancel={handleJoystickRelease}
        >
          <div
            data-testid="virtual-joystick-knob"
            className="pointer-events-none h-12 w-12 select-none rounded-full bg-emerald-400/90 shadow-md transition-transform duration-75"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`
            }}
          />
        </div>

        {/* Dedicated Touch Action Buttons (Run, Jump, Interact) */}
        <div className="pointer-events-auto flex select-none items-center gap-3">
          {focusedObject && (
            <button
              type="button"
              data-testid="touch-interact-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                adapter.triggerInteract();
              }}
              className="flex h-14 w-14 select-none items-center justify-center rounded-full border-2 border-amber-300 bg-amber-500/90 text-xs font-extrabold text-emerald-950 shadow-lg active:scale-95"
            >
              Use
            </button>
          )}

          <button
            type="button"
            data-testid="touch-run-btn"
            aria-pressed={isRunToggled}
            onClick={handleToggleRun}
            className={`flex h-14 w-14 select-none items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition active:scale-95 ${
              isRunToggled
                ? 'border-lime-300 bg-lime-400 text-emerald-950'
                : 'border-white/35 bg-emerald-950/75 text-white'
            }`}
          >
            Run
          </button>

          <button
            type="button"
            data-testid="touch-jump-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              adapter.triggerJump();
            }}
            className="flex h-16 w-16 select-none items-center justify-center rounded-full border-2 border-emerald-300/70 bg-emerald-500/85 text-xs font-extrabold text-emerald-950 shadow-lg active:scale-95"
          >
            Jump
          </button>
        </div>
      </div>
    </div>
  );
};
