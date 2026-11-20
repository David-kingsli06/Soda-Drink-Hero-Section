export interface Stage {
  id: number;
  name: string;
  headline: string;
  subline: string;
  entryFrame: number;
  exitFrame: number;
  restFrame: number;
}

export const STAGES: readonly Stage[] = [
  {
    id: 1,
    name: "One Energy.",
    headline: "One Energy.",
    subline: "One can. Full power.",
    entryFrame: 191,
    exitFrame: 152,
    restFrame: 191,
  },
  {
    id: 2,
    name: "Break the seal.",
    headline: "Break the seal.",
    subline: "Pop it open and feel the rush.",
    entryFrame: 151,
    exitFrame: 56,
    restFrame: 56,
  },
  {
    id: 3,
    name: "Up close.",
    headline: "Up close.",
    subline: "Every detail built for the moment.",
    entryFrame: 55,
    exitFrame: 24,
    restFrame: 24,
  },
  {
    id: 4,
    name: "Charged.",
    headline: "Charged.",
    subline: "Full energy, ready to launch.",
    entryFrame: 23,
    exitFrame: 0,
    restFrame: 0,
  },
] as const;

export const TOTAL_STAGES = STAGES.length;
export const TOTAL_FRAMES = 192;
export const INITIAL_FRAME = 191;
