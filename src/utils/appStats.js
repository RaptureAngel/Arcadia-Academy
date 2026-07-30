import { getLevel, getXpRequiredForNextLevel } from "./xp";

export function getLevelProgress(totalXp) {
  const level = getLevel(totalXp);
  const xpBeforeCurrentLevel = Array.from({ length: level - 1 }).reduce(
    (total, _item, index) => total + getXpRequiredForNextLevel(index + 1),
    0
  );
  const xpIntoLevel = Math.max(0, totalXp - xpBeforeCurrentLevel);
  const xpRequiredForNextLevel = getXpRequiredForNextLevel(level);
  const xpToNextLevel = Math.max(0, xpRequiredForNextLevel - xpIntoLevel);
  const progress = Math.min(xpIntoLevel / xpRequiredForNextLevel, 1);

  return {
    level,
    progress,
    xpToNextLevel,
  };
}
