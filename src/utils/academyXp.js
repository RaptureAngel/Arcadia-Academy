// Academy session XP v0.1: simple, isolated, and easy to retune later.
// Sessions under a minute earn nothing; otherwise it's 1 XP per focused
// minute, capped so a single session can't dominate a day.
export const ACADEMY_SESSION_XP_MIN_SECONDS = 60;
export const ACADEMY_SESSION_XP_MAX = 120;

export function calculateAcademySessionXp(focusedSeconds) {
  const seconds = Number(focusedSeconds);

  if (!Number.isFinite(seconds) || seconds < ACADEMY_SESSION_XP_MIN_SECONDS) {
    return 0;
  }

  const minutes = Math.floor(seconds / 60);

  return Math.min(ACADEMY_SESSION_XP_MAX, minutes);
}
