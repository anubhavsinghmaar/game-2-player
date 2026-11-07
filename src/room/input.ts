export const modes = ['quick', 'classic', 'blitz', 'sudden', 'risk', 'collab'] as const;
export type QuizMode = typeof modes[number];
export const difficulties = ['mixed', 'easy', 'medium', 'hard'] as const;
export type QuizDifficulty = typeof difficulties[number];

export function tidy(value: string, max: number) {
  // eslint-disable-next-line no-control-regex -- Strip control characters from nicknames and submitted text.
  return value.normalize('NFKC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, max);
}
