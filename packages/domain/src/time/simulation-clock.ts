import type {
  IsoTimestamp,
  SimulationClock,
  SimulationMode,
} from "../models.ts";

export const FOUR_WEEK_SECONDS = 4 * 7 * 24 * 60 * 60;
export const SIMULATION_MODE_STEP_SECONDS: Readonly<
  Record<SimulationMode, number>
> = {
  real: 0,
  "demo-minute": 60,
  "demo-day": 24 * 60 * 60,
  "demo-cycle": FOUR_WEEK_SECONDS,
};

/** The deterministic amount advanced by one console step for a mode. */
export function simulationStepSeconds(mode: SimulationMode): number {
  return SIMULATION_MODE_STEP_SECONDS[mode];
}

/**
 * Advance a local simulation clock without sleeping or reading wall time. The
 * `real` mode intentionally remains unchanged; a production-style adapter
 * supplies its current instant through the ClockPort instead.
 */
export function advanceSimulationClock(
  clock: SimulationClock,
  steps = 1,
): SimulationClock {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new RangeError(
      "Simulation clock steps must be a non-negative integer",
    );
  }

  const seconds = simulationStepSeconds(clock.mode) * steps;
  return seconds === 0
    ? clock
    : { ...clock, now: addIsoSeconds(clock.now, seconds) };
}

/** Switch a local clock mode while preserving its deterministic instant. */
export function setSimulationMode(
  clock: SimulationClock,
  mode: SimulationMode,
): SimulationClock {
  return clock.mode === mode ? clock : { ...clock, mode };
}

/** Add whole seconds to an ISO timestamp in UTC. */
export function addIsoSeconds(
  timestamp: IsoTimestamp,
  seconds: number,
): IsoTimestamp {
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError(`Invalid ISO timestamp: ${timestamp}`);
  }

  return new Date(milliseconds + seconds * 1000).toISOString();
}
