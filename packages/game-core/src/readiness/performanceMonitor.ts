import type { PerformanceTelemetrySnapshot, QualityTier } from '../types';

export interface PerformanceMonitorOptions {
  /** Number of frame samples to retain in rolling window (default: 60) */
  windowSize?: number;
  /** FPS threshold below which low-FPS streak increments (default: 28) */
  lowFpsThreshold?: number;
  /** Consecutive low-FPS evaluations required before stepping down quality (default: 3) */
  streakToDowngrade?: number;
}

/**
 * Tracks rolling frame times, computes FPS & p95 frame time, and recommends
 * adaptive graphics quality step-downs (`high`/`auto` -> `medium` -> `low`) when sustained
 * low frame rates occur (`FR-005`, `SC-002`).
 */
export class PerformanceMonitor {
  private readonly windowSize: number;
  private readonly lowFpsThreshold: number;
  private readonly streakToDowngrade: number;
  private samplesMs: number[] = [];
  private lowFpsStreak = 0;
  private autoDowngradedCount = 0;

  public constructor(options: PerformanceMonitorOptions = {}) {
    this.windowSize = Math.max(10, options.windowSize ?? 60);
    this.lowFpsThreshold = options.lowFpsThreshold ?? 28;
    this.streakToDowngrade = Math.max(1, options.streakToDowngrade ?? 3);
  }

  public recordFrame(
    dtSeconds: number,
    currentQuality: QualityTier,
    autoQualityAdjust: boolean
  ): {
    snapshot: PerformanceTelemetrySnapshot;
    recommendedQuality: QualityTier | null;
  } {
    const clampedDt = Math.max(
      0.001,
      Math.min(0.5, Number.isFinite(dtSeconds) ? dtSeconds : 1 / 60)
    );
    const frameMs = clampedDt * 1000;
    this.samplesMs.push(frameMs);
    if (this.samplesMs.length > this.windowSize) {
      this.samplesMs.shift();
    }

    const snapshot = this.getSnapshot();
    let recommendedQuality: QualityTier | null = null;

    if (this.samplesMs.length >= Math.min(15, this.windowSize)) {
      if (snapshot.fps < this.lowFpsThreshold) {
        this.lowFpsStreak += 1;
      } else {
        this.lowFpsStreak = 0;
      }

      if (
        autoQualityAdjust &&
        this.lowFpsStreak >= this.streakToDowngrade &&
        currentQuality !== 'low'
      ) {
        recommendedQuality =
          currentQuality === 'high' || currentQuality === 'auto' ? 'medium' : 'low';
        this.lowFpsStreak = 0;
        this.autoDowngradedCount += 1;
      }
    }

    return {
      snapshot: this.getSnapshot(),
      recommendedQuality
    };
  }

  public getSnapshot(): PerformanceTelemetrySnapshot {
    if (this.samplesMs.length === 0) {
      return {
        fps: 60,
        avgFrameTimeMs: 16.7,
        p95FrameTimeMs: 16.7,
        lowFpsStreak: this.lowFpsStreak,
        autoDowngradedCount: this.autoDowngradedCount
      };
    }

    const sumMs = this.samplesMs.reduce((acc, v) => acc + v, 0);
    const avgMs = sumMs / this.samplesMs.length;
    const sorted = [...this.samplesMs].sort((a, b) => a - b);
    const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const p95Ms = sorted[p95Idx] ?? avgMs;
    const fps = Math.max(1, Math.min(240, Math.round(1000 / Math.max(1, avgMs))));

    return {
      fps,
      avgFrameTimeMs: Number(avgMs.toFixed(1)),
      p95FrameTimeMs: Number(p95Ms.toFixed(1)),
      lowFpsStreak: this.lowFpsStreak,
      autoDowngradedCount: this.autoDowngradedCount
    };
  }

  public reset(): void {
    this.samplesMs = [];
    this.lowFpsStreak = 0;
    this.autoDowngradedCount = 0;
  }
}
