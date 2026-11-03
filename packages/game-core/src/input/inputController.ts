import type { InputDeviceMode, NormalizedInputSnapshot } from '../types';

export class InputController {
  private keys = new Set<string>();
  private virtualJoystickX = 0;
  private virtualJoystickZ = 0;
  private touchRunActive = false;
  private jumpQueued = false;
  private interactQueued = false;
  private menuQueued = false;
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private zoomDelta = 0;
  private activeDevice: InputDeviceMode = 'desktop';
  private cleanups: Array<() => void> = [];

  public setKeyState(code: string, pressed: boolean): void {
    this.activeDevice = 'desktop';
    if (pressed) {
      if (!this.keys.has(code)) {
        if (code === 'Space') this.jumpQueued = true;
        if (code === 'KeyE' || code === 'KeyF') this.interactQueued = true;
        if (code === 'Escape') this.menuQueued = true;
      }
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  public isCursorRevealHeld(): boolean {
    return this.keys.has('AltLeft') || this.keys.has('AltRight');
  }

  public triggerAction(
    action: 'jump' | 'interact' | 'menu',
    device?: InputDeviceMode
  ): void {
    if (device) {
      this.activeDevice = device;
    }
    if (action === 'jump') this.jumpQueued = true;
    if (action === 'interact') this.interactQueued = true;
    if (action === 'menu') this.menuQueued = true;
  }

  public addLookDelta(deltaX: number, deltaY: number, device: InputDeviceMode = 'desktop'): void {
    this.activeDevice = device;
    if (Number.isFinite(deltaX)) this.lookDeltaX += deltaX;
    if (Number.isFinite(deltaY)) this.lookDeltaY += deltaY;
  }

  public addZoomDelta(deltaZoom: number, device: InputDeviceMode = 'desktop'): void {
    this.activeDevice = device;
    if (Number.isFinite(deltaZoom)) this.zoomDelta += deltaZoom;
  }

  /**
   * Sets mobile virtual joystick vector.
   * Per clarification (FR-013), the virtual joystick controls movement direction at walking speed;
   * running on mobile is controlled exclusively by the dedicated Run touch button.
   */
  public setVirtualJoystick(x: number, z: number): void {
    this.activeDevice = 'touch';
    const rawX = Number.isFinite(x) ? x : 0;
    const rawZ = Number.isFinite(z) ? z : 0;
    const mag = Math.hypot(rawX, rawZ);
    if (mag > 1.0) {
      this.virtualJoystickX = rawX / mag;
      this.virtualJoystickZ = rawZ / mag;
    } else {
      this.virtualJoystickX = rawX;
      this.virtualJoystickZ = rawZ;
    }
  }

  public setTouchAction(
    action: 'run' | 'jump' | 'interact' | 'menu',
    active: boolean
  ): void {
    this.activeDevice = 'touch';
    switch (action) {
      case 'run':
        this.touchRunActive = active;
        break;
      case 'jump':
        if (active) this.jumpQueued = true;
        break;
      case 'interact':
        if (active) this.interactQueued = true;
        break;
      case 'menu':
        if (active) this.menuQueued = true;
        break;
    }
  }

  public isTouchRunActive(): boolean {
    return this.touchRunActive;
  }

  public toggleTouchRun(): boolean {
    this.activeDevice = 'touch';
    this.touchRunActive = !this.touchRunActive;
    return this.touchRunActive;
  }

  public consumeFrameSnapshot(): NormalizedInputSnapshot {
    let kbX = 0;
    let kbZ = 0;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbZ += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbZ -= 1;

    let moveX = kbX !== 0 || kbZ !== 0 ? kbX : this.virtualJoystickX;
    let moveZ = kbX !== 0 || kbZ !== 0 ? kbZ : this.virtualJoystickZ;

    // Normalize vector so sqrt(moveX^2 + moveZ^2) <= 1.0
    const len = Math.hypot(moveX, moveZ);
    if (len > 1.0) {
      moveX /= len;
      moveZ /= len;
    }

    const desktopShift = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const runHeld = desktopShift || this.touchRunActive;
    const cursorRevealHeld = this.keys.has('AltLeft') || this.keys.has('AltRight');

    // Keyboard camera orbit support (Q = orbit left, R = orbit right) for laptop/trackpad ergonomics
    let keyLookX = 0;
    if (this.keys.has('KeyQ')) keyLookX -= 0.035;
    if (this.keys.has('KeyR')) keyLookX += 0.035;

    const snapshot: NormalizedInputSnapshot = {
      moveX,
      moveZ,
      runHeld,
      jumpPressed: this.jumpPressedFlag(),
      interactPressed: this.interactPressedFlag(),
      menuPressed: this.menuPressedFlag(),
      cursorRevealHeld,
      lookDeltaX: this.lookDeltaX + keyLookX,
      lookDeltaY: this.lookDeltaY,
      zoomDelta: this.zoomDelta,
      activeDevice: this.activeDevice
    };

    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.zoomDelta = 0;

    return snapshot;
  }

  private jumpPressedFlag(): boolean {
    const v = this.jumpQueued;
    this.jumpQueued = false;
    return v;
  }

  private interactPressedFlag(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  private menuPressedFlag(): boolean {
    const v = this.menuQueued;
    this.menuQueued = false;
    return v;
  }

  public registerCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  public resetAll(): void {
    this.keys.clear();
    this.virtualJoystickX = 0;
    this.virtualJoystickZ = 0;
    this.touchRunActive = false;
    this.jumpQueued = false;
    this.interactQueued = false;
    this.menuQueued = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.zoomDelta = 0;
  }

  public dispose(): void {
    this.resetAll();
    while (this.cleanups.length > 0) {
      const fn = this.cleanups.pop();
      fn?.();
    }
  }
}

