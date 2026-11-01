import { createRandom } from '../../simulator/src/random.ts';

export interface Scenario {
  renderer: string;
  vehicles: number;
  intervalMs: number;
  repetition: number;
}

export interface Matrix {
  renderers: string[];
  vehicles: number[];
  intervalsMs: number[];
  repetitions: number;
}

/** All scenario combinations in a seeded random order, so that time effects do not follow one factor. */
export function buildRunOrder(matrix: Matrix, seed: number): Scenario[] {
  const scenarios: Scenario[] = [];
  for (const renderer of matrix.renderers) {
    for (const vehicles of matrix.vehicles) {
      for (const intervalMs of matrix.intervalsMs) {
        for (let repetition = 1; repetition <= matrix.repetitions; repetition++) {
          scenarios.push({ renderer, vehicles, intervalMs, repetition });
        }
      }
    }
  }

  const random = createRandom(seed);
  for (let i = scenarios.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [scenarios[i], scenarios[j]] = [scenarios[j]!, scenarios[i]!];
  }
  return scenarios;
}

export const scenarioFileName = (s: Scenario) =>
  `${s.renderer}-${s.vehicles}v-${s.intervalMs}ms-r${s.repetition}.json`;
