export const MAX_LEVEL = 1000;

export function getLevel(totalXp) {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (
    level < MAX_LEVEL &&
    remainingXp >= getXpRequiredForNextLevel(level)
  ) {
    remainingXp -= getXpRequiredForNextLevel(level);
    level += 1;
  }

  return level;
}

export function getXpRequiredForNextLevel(level) {
  return 100 + level * level * 50;
}
