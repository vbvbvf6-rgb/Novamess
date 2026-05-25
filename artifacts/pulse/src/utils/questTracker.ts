const PROGRESS_KEY = "pulse-quests-progress";
const DONE_KEY = "pulse-quests-done";
const RESET_KEY = "pulse-quests-reset";

export type QuestAction = "message_sent" | "call_made" | "reaction_added" | "gift_sent" | "contact_added";

const QUEST_ACTIONS: Record<string, QuestAction[]> = {
  q1: ["message_sent"],
  q2: ["call_made"],
  q3: ["reaction_added"],
  q4: ["gift_sent"],
  q5: ["contact_added"],
  q6: ["call_made"],
};

const QUEST_TOTALS: Record<string, number> = {
  q1: 5, q2: 1, q3: 3, q4: 1, q5: 3, q6: 5,
};

const DAILY_QUESTS = ["q1", "q2", "q3", "q4"];
const WEEKLY_QUESTS = ["q5", "q6"];

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().split("T")[0];
}

export function maybeResetQuests(): void {
  try {
    const stored: { day?: string; week?: string } = JSON.parse(
      localStorage.getItem(RESET_KEY) || "{}"
    );
    const todayKey = getTodayKey();
    const weekKey = getWeekKey();

    let progress: Record<string, number> = JSON.parse(
      localStorage.getItem(PROGRESS_KEY) || "{}"
    );
    const doneArr: string[] = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
    const done = new Set<string>(doneArr);

    let changed = false;

    if (stored.day !== todayKey) {
      DAILY_QUESTS.forEach(id => {
        delete progress[id];
        done.delete(id);
      });
      changed = true;
    }

    if (stored.week !== weekKey) {
      WEEKLY_QUESTS.forEach(id => {
        delete progress[id];
        done.delete(id);
      });
      changed = true;
    }

    if (changed) {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
      localStorage.setItem(RESET_KEY, JSON.stringify({ day: todayKey, week: weekKey }));
      window.dispatchEvent(new CustomEvent("pulse:quest-progress"));
    }
  } catch {}
}

export function trackQuestAction(action: QuestAction): void {
  try {
    maybeResetQuests();

    const progress: Record<string, number> = JSON.parse(
      localStorage.getItem(PROGRESS_KEY) || "{}"
    );
    const done = new Set<string>(
      JSON.parse(localStorage.getItem(DONE_KEY) || "[]")
    );

    let changed = false;

    for (const [questId, actions] of Object.entries(QUEST_ACTIONS)) {
      if (actions.includes(action) && !done.has(questId)) {
        const current = progress[questId] ?? 0;
        const total = QUEST_TOTALS[questId] ?? 1;
        if (current < total) {
          progress[questId] = current + 1;
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      window.dispatchEvent(new CustomEvent("pulse:quest-progress"));
    }
  } catch {}
}
