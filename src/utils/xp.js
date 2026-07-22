export const DEFAULT_TASK_XP_RULE = {
  maxXp: 300,
  partialXp: 150,
  fallbackXp: 25,
  fullXpSeconds: 60 * 60,
};

export const MAX_LEVEL = 1000;

export const TASK_XP_RULES = {
  Admin: {
    maxXp: 25,
    partialXp: 10,
    fallbackXp: 10,
    fullXpSeconds: 5 * 60,
  },
  Email: {
    maxXp: 25,
    partialXp: 10,
    fallbackXp: 10,
    fullXpSeconds: 5 * 60,
  },
  "Meeting / Call": {
    maxXp: 100,
    partialXp: 50,
    fallbackXp: 25,
    fullXpSeconds: 30 * 60,
  },
  "Meeting Follow-up": {
    maxXp: 50,
    partialXp: 25,
    fallbackXp: 10,
    fullXpSeconds: 10 * 60,
  },
  "Invoice / Finance Admin": {
    maxXp: 50,
    partialXp: 25,
    fallbackXp: 10,
    fullXpSeconds: 20 * 60,
  },
  Revisions: {
    maxXp: 45,
    partialXp: 22,
    fallbackXp: 12,
    fullXpSeconds: 45 * 60,
  },
  Research: {
    maxXp: 150,
    partialXp: 75,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
  "Data Gathering / Export": {
    maxXp: 175,
    partialXp: 90,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
  "Report Drafting / Compilation": {
    maxXp: 200,
    partialXp: 100,
    fallbackXp: 25,
    fullXpSeconds: 45 * 60,
  },
  "Report Review / Fact-Check": {
    maxXp: 150,
    partialXp: 75,
    fallbackXp: 25,
    fullXpSeconds: 45 * 60,
  },
  "Report Formatting / Finalisation": {
    maxXp: 100,
    partialXp: 50,
    fallbackXp: 25,
    fullXpSeconds: 30 * 60,
  },
  "Document Compilation / Finalisation": {
    maxXp: 55,
    partialXp: 28,
    fallbackXp: 15,
    fullXpSeconds: 45 * 60,
  },
  "Content Strategy": {
    maxXp: 300,
    partialXp: 150,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Campaign Planning": {
    maxXp: 300,
    partialXp: 150,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Article Draft": {
    maxXp: 300,
    partialXp: 150,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Article Edit": {
    maxXp: 75,
    partialXp: 35,
    fallbackXp: 25,
    fullXpSeconds: 10 * 60,
  },
  "FAQ Creation": {
    maxXp: 55,
    partialXp: 28,
    fallbackXp: 15,
    fullXpSeconds: 60 * 60,
  },
  "Poll Creation": {
    maxXp: 30,
    partialXp: 15,
    fallbackXp: 8,
    fullXpSeconds: 25 * 60,
  },
  "Blog / Web Copy": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  Proofreading: {
    maxXp: 50,
    partialXp: 25,
    fallbackXp: 10,
    fullXpSeconds: 10 * 60,
  },
  "Script / Video Copy": {
    maxXp: 100,
    partialXp: 50,
    fallbackXp: 25,
    fullXpSeconds: 20 * 60,
  },
  "ChatGPT Prompting / Output Generation": {
    maxXp: 35,
    partialXp: 18,
    fallbackXp: 10,
    fullXpSeconds: 30 * 60,
  },
  "Claude Prompting / Formatting": {
    maxXp: 35,
    partialXp: 18,
    fallbackXp: 10,
    fullXpSeconds: 30 * 60,
  },
  "Audio Recording": {
    maxXp: 100,
    partialXp: 50,
    fallbackXp: 25,
    fullXpSeconds: 30 * 60,
  },
  "Audio Editing": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Social Media Post Guide": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Post Uploading": {
    maxXp: 70,
    partialXp: 35,
    fallbackXp: 18,
    fullXpSeconds: 90 * 60,
  },
  "Canva Static Design": {
    maxXp: 150,
    partialXp: 75,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
  "Canva Carousel": {
    maxXp: 175,
    partialXp: 90,
    fallbackXp: 25,
    fullXpSeconds: 45 * 60,
  },
  "Canva Edits": {
    maxXp: 35,
    partialXp: 18,
    fallbackXp: 10,
    fullXpSeconds: 30 * 60,
  },
  "Canva Video / Reel": {
    maxXp: 300,
    partialXp: 150,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Presentation / Deck Design": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Website Copy Update": {
    maxXp: 175,
    partialXp: 90,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
  "Website Layout Update": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Blog Upload / Formatting": {
    maxXp: 100,
    partialXp: 50,
    fallbackXp: 25,
    fullXpSeconds: 30 * 60,
  },
  "SEO / GEO Optimisation": {
    maxXp: 250,
    partialXp: 125,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Proposal / Quote": {
    maxXp: 300,
    partialXp: 150,
    fallbackXp: 50,
    fullXpSeconds: 60 * 60,
  },
  "Coding / Web Production": {
    maxXp: 90,
    partialXp: 45,
    fallbackXp: 25,
    fullXpSeconds: 120 * 60,
  },
  "Creative Production": {
    maxXp: 80,
    partialXp: 40,
    fallbackXp: 25,
    fullXpSeconds: 90 * 60,
  },
  Writing: {
    maxXp: 75,
    partialXp: 35,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
  "Home Admin": {
    maxXp: 30,
    partialXp: 15,
    fallbackXp: 10,
    fullXpSeconds: 30 * 60,
  },
  "Learning / Skill Building": {
    maxXp: 175,
    partialXp: 90,
    fallbackXp: 25,
    fullXpSeconds: 60 * 60,
  },
};

export function getTaskXpRule(taskType) {
  return TASK_XP_RULES[taskType] || DEFAULT_TASK_XP_RULE;
}

export function getRegularTaskAwardXp(task) {
  const timerTotalSeconds = Math.max(
    0,
    Math.floor(Number(task.timerTotalSeconds) || 0)
  );
  const rule = getTaskXpRule(task.taskType);

  if (timerTotalSeconds === 0) {
    return rule.fallbackXp;
  }

  if (timerTotalSeconds < rule.fullXpSeconds) {
    return rule.partialXp;
  }

  return rule.maxXp;
}

export function formatFullXpTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.round(safeSeconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = minutes / 60;

  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}

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

export function getRank(todayXp) {
  if (todayXp >= 1500) return "Please Go Home";
  if (todayXp >= 1250) return "Please Touch Grass";
  if (todayXp >= 1000) return "HR Is Concerned";
  if (todayXp >= 800) return "Suspiciously Productive";
  if (todayXp >= 600) return "Department Asset";
  if (todayXp >= 400) return "Middle Management Future";
  if (todayXp >= 250) return "Paperwork Goblin";
  if (todayXp >= 100) return "Clocked In, Technically";
  if (todayXp > 0) return "Desk Slacker";
  return "Off the Clock";
}

const ACADEMY_RANKS = {
  "Off the Clock": "After Hours",
  "Desk Slacker": "Class Slacker",
  "Clocked In, Technically": "Present, Technically",
  "Paperwork Goblin": "Homework Goblin",
  "Middle Management Future": "Honour Roll Candidate",
  "Department Asset": "Top of the Class",
  "Suspiciously Productive": "Suspiciously Studious",
  "HR Is Concerned": "Faculty Is Concerned",
  "Please Touch Grass": "Please Go Outside",
  "Please Go Home": "Please Go Home",
};

export function getContextRank(todayXp, context) {
  const rank = getRank(todayXp);
  return context === "class" ? (ACADEMY_RANKS[rank] ?? rank) : rank;
}

export function getQuotaStatus(quotaPercent) {
  if (quotaPercent >= 200) return "Someone Stop Them";
  if (quotaPercent >= 150) return "Over Quota";
  if (quotaPercent >= 100) return "Quota Cleared";
  if (quotaPercent >= 50) return "Closing In";
  if (quotaPercent > 0) return "Behind Quota";
  return "No Output Logged";
}

export function getTaskXpRuleText(taskType) {
  const rule = getTaskXpRule(taskType);

  return `Max ${rule.maxXp} XP · full XP after ${formatFullXpTime(rule.fullXpSeconds)}`;
}

export function getTaskXpRuleDetailText(taskType) {
  const rule = getTaskXpRule(taskType);

  return `Partial ${rule.partialXp} XP · no-time fallback ${rule.fallbackXp} XP`;
}
