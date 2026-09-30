export interface ClearTier {
  lines: number;
  label: string;
  accent: string;
  power: number;
  shake: number;
  duration: number;
  particlesPerCell: number;
}

export const CLEAR_TIERS: readonly ClearTier[] = [
  {
    lines: 1,
    label: 'POP!',
    accent: '#78e6c2',
    power: 1,
    shake: 4,
    duration: 1.1,
    particlesPerCell: 9,
  },
  {
    lines: 2,
    label: 'DOUBLE TROUBLE!',
    accent: '#70caff',
    power: 2,
    shake: 7,
    duration: 1.3,
    particlesPerCell: 12,
  },
  {
    lines: 3,
    label: 'TRIPLE THREAT!',
    accent: '#a99cff',
    power: 3,
    shake: 11,
    duration: 1.5,
    particlesPerCell: 15,
  },
  {
    lines: 4,
    label: 'QUAD QUAKE!',
    accent: '#f49dcd',
    power: 4,
    shake: 16,
    duration: 1.8,
    particlesPerCell: 18,
  },
  {
    lines: 5,
    label: 'PENTACLYSM!',
    accent: '#ff987a',
    power: 5,
    shake: 22,
    duration: 2.1,
    particlesPerCell: 21,
  },
  {
    lines: 6,
    label: 'HEXAGEDDON!',
    accent: '#f1d58e',
    power: 6,
    shake: 29,
    duration: 2.4,
    particlesPerCell: 24,
  },
];

export function getClearTier(lines: number): ClearTier {
  const count = Number.isFinite(lines) ? Math.floor(lines) : 1;
  return CLEAR_TIERS[Math.min(CLEAR_TIERS.length, Math.max(1, count)) - 1];
}
