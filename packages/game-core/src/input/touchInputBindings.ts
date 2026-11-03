import type { InputController } from './inputController';

export interface TouchLookConfig {
  touchRadiansPerPixel?: number;
  pinchMetersPerPixel?: number;
}

/**
 * Helper adapter for mobile touch controls:
 * - Virtual Joystick (controls walking direction only; magnitude clamped <= 1.0)
 * - Dedicated Run button (hold or toggle to switch to Running speed)
 * - Touch-and-drag camera rotation + two-finger pinch zoom
 */
export class TouchInputAdapter {
  private controller: InputController;
  private lookScale: number;
  private pinchScale: number;
  private lastTouchPos: { x: number; y: number } | null = null;
  private lastPinchDist: number | null = null;

  constructor(controller: InputController, config: TouchLookConfig = {}) {
    this.controller = controller;
    this.lookScale = config.touchRadiansPerPixel ?? 0.0055;
    this.pinchScale = config.pinchMetersPerPixel ?? 0.025;
  }

  public updateJoystickFromDisplacement(dxPixels: number, dyPixels: number, maxRadiusPixels = 50): void {
    const r = Math.max(1, maxRadiusPixels);
    const normX = dxPixels / r;
    const normZ = dyPixels / r;
    this.controller.setVirtualJoystick(normX, normZ);
  }

  public releaseJoystick(): void {
    this.controller.setVirtualJoystick(0, 0);
  }

  public setRunButton(active: boolean): void {
    this.controller.setTouchAction('run', active);
  }

  public toggleRunButton(): boolean {
    return this.controller.toggleTouchRun();
  }

  public triggerJump(): void {
    this.controller.setTouchAction('jump', true);
  }

  public triggerInteract(): void {
    this.controller.setTouchAction('interact', true);
  }

  public triggerMenu(): void {
    this.controller.setTouchAction('menu', true);
  }

  public startCameraTouch(clientX: number, clientY: number): void {
    this.lastTouchPos = { x: clientX, y: clientY };
  }

  public moveCameraTouch(clientX: number, clientY: number): void {
    if (!this.lastTouchPos) {
      this.lastTouchPos = { x: clientX, y: clientY };
      return;
    }
    const dx = clientX - this.lastTouchPos.x;
    const dy = clientY - this.lastTouchPos.y;
    this.lastTouchPos = { x: clientX, y: clientY };
    this.controller.addLookDelta(dx * this.lookScale, dy * this.lookScale, 'touch');
  }

  public endCameraTouch(): void {
    this.lastTouchPos = null;
    this.lastPinchDist = null;
  }

  public updatePinchZoom(
    touch1: { clientX: number; clientY: number },
    touch2: { clientX: number; clientY: number }
  ): void {
    const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
    if (this.lastPinchDist !== null) {
      const deltaPixels = this.lastPinchDist - dist;
      this.controller.addZoomDelta(deltaPixels * this.pinchScale, 'touch');
    }
    this.lastPinchDist = dist;
  }
}

