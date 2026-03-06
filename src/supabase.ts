// ─────────────────────────────────────────────────────────────────────────────
// supabase.ts — Soma's complete Supabase client
//
// Setup:
//   1. Create a project at supabase.com
//   2. Run SUPABASE_SETUP.sql in the SQL Editor
//   3. Create a .env file in your project root:
//        VITE_SUPABASE_URL=https://your-project.supabase.co
//        VITE_SUPABASE_ANON_KEY=your-anon-key
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// ── CLIENT ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "[Soma] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
    "Create a .env file in your project root:\n" +
    "  VITE_SUPABASE_URL=https://your-project.supabase.co\n" +
    "  VITE_SUPABASE_ANON_KEY=your-anon-key"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id:         string;
  name:       string;
  goal:       string;
  level:      string;
  days:       number;
  theme_id:   string;
  created_at: string;
  updated_at: string;
}

export interface BodyStat {
  id:        string;
  user_id:   string;
  weight:    number | null;
  height:    number | null;
  body_fat:  number | null;
  chest:     number | null;
  waist:     number | null;
  hips:      number | null;
  bicep:     number | null;
  thigh:     number | null;
  logged_at: string;
}

export interface WeightEntry {
  id:        string;
  user_id:   string;
  value:     number;
  label:     string;
  logged_at: string;
}

export interface WorkoutLog {
  id:            string;
  user_id:       string;
  workout_id:    number;
  workout_name:  string;
  duration_mins: number;
  calories:      number;
  completed_at:  string;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") console.error("[Soma] loadProfile:", error.message);
    return null;
  }
  return data as Profile;
}

export async function saveProfile(
  userId: string,
  profile: { name: string; goal: string; level: string; days: number; theme_id?: string }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("profiles").upsert(
    {
      id:       userId,
      name:     profile.name,
      goal:     profile.goal,
      level:    profile.level,
      days:     profile.days,
      theme_id: profile.theme_id ?? "terrain",
    },
    { onConflict: "id" }
  );
  if (error) console.error("[Soma] saveProfile:", error.message);
  return { error: error ? new Error(error.message) : null };
}

export async function saveTheme(userId: string, themeId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ theme_id: themeId })
    .eq("id", userId);
  if (error) console.error("[Soma] saveTheme:", error.message);
}

// ── BODY STATS ────────────────────────────────────────────────────────────────

export async function saveBodyStat(
  userId: string,
  stats: {
    weight?:   number | null;
    height?:   number | null;
    body_fat?: number | null;
    chest?:    number | null;
    waist?:    number | null;
    hips?:     number | null;
    bicep?:    number | null;
    thigh?:    number | null;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("body_stats").insert({
    user_id:  userId,
    weight:   stats.weight   ?? null,
    height:   stats.height   ?? null,
    body_fat: stats.body_fat ?? null,
    chest:    stats.chest    ?? null,
    waist:    stats.waist    ?? null,
    hips:     stats.hips     ?? null,
    bicep:    stats.bicep    ?? null,
    thigh:    stats.thigh    ?? null,
  });
  if (error) console.error("[Soma] saveBodyStat:", error.message);
  return { error: error ? new Error(error.message) : null };
}

export async function loadLatestBodyStat(userId: string): Promise<BodyStat | null> {
  const { data, error } = await supabase
    .from("body_stats")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== "PGRST116") console.error("[Soma] loadLatestBodyStat:", error.message);
    return null;
  }
  return data as BodyStat;
}

// ── WEIGHT LOG ────────────────────────────────────────────────────────────────

export async function loadWeightLog(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_log")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[Soma] loadWeightLog:", error.message);
    return [];
  }
  // Reverse so chart reads oldest → newest left to right
  return ((data as WeightEntry[]) || []).reverse();
}

export async function addWeightEntry(
  userId: string,
  value: number,
  label: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("weight_log").insert({ user_id: userId, value, label });
  if (error) console.error("[Soma] addWeightEntry:", error.message);
  return { error: error ? new Error(error.message) : null };
}

// ── WORKOUT HISTORY ───────────────────────────────────────────────────────────

export async function logWorkout(
  userId: string,
  workout: {
    workout_id:    number;
    workout_name:  string;
    duration_mins: number;
    calories:      number;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("workout_history").insert({
    user_id:       userId,
    workout_id:    workout.workout_id,
    workout_name:  workout.workout_name,
    duration_mins: workout.duration_mins,
    calories:      workout.calories,
  });
  if (error) console.error("[Soma] logWorkout:", error.message);
  return { error: error ? new Error(error.message) : null };
}

export async function loadWorkoutHistory(userId: string): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from("workout_history")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[Soma] loadWorkoutHistory:", error.message);
    return [];
  }
  return (data as WorkoutLog[]) || [];
}

export async function loadThisWeekWorkouts(userId: string): Promise<WorkoutLog[]> {
  // Monday 00:00:00 of the current week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("workout_history")
    .select("*")
    .eq("user_id", userId)
    .gte("completed_at", monday.toISOString())
    .order("completed_at", { ascending: true });

  if (error) {
    console.error("[Soma] loadThisWeekWorkouts:", error.message);
    return [];
  }
  return (data as WorkoutLog[]) || [];
}

// ── AI LOGIC (pure functions — no DB needed) ──────────────────────────────────

/**
 * Recovery score 0–100 based on recent workout volume and rest.
 *
 * Factors:
 *  - Already trained today → bigger deduction
 *  - Trained yesterday → moderate deduction
 *  - High calorie volume in last 3 days → small deduction
 *  - 2+ rest days recently → small bonus
 *  - No history at all → 88 (fresh start)
 * Floor: 40. Ceiling: 100.
 */
export function computeRecoveryScore(history: WorkoutLog[]): number {
  if (history.length === 0) return 88;

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const last7 = history.filter(w =>
    now.getTime() - new Date(w.completed_at).getTime() < 7 * msPerDay
  );
  const last3 = history.filter(w =>
    now.getTime() - new Date(w.completed_at).getTime() < 3 * msPerDay
  );
  const last2 = history.filter(w =>
    now.getTime() - new Date(w.completed_at).getTime() < 2 * msPerDay
  );

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const todayWorkouts = last7.filter(
    w => new Date(w.completed_at).toDateString() === now.toDateString()
  );
  const yesterdayWorkouts = last7.filter(
    w => new Date(w.completed_at).toDateString() === yesterday.toDateString()
  );

  let score = 100;
  score -= todayWorkouts.length * 14;
  score -= yesterdayWorkouts.length * 9;

  const last3Volume = last3.reduce((s, w) => s + (w.calories || 0), 0);
  if (last3Volume > 1200) score -= 12;
  else if (last3Volume > 800) score -= 6;

  if (last2.length === 0) score += 8; // 2+ rest days

  return Math.max(40, Math.min(100, Math.round(score)));
}

/**
 * Recommend the next workout ID based on history and goal.
 *
 * Strategy:
 *  1. If the user has done Powerbuilding before → advance in the 6-day sequence
 *  2. Goal "Endurance/Cardio" → HIIT or Morning Strength
 *  3. Goal "Lose Weight" → HIIT then Mobility
 *  4. Goal "Wellness/Recovery" → Mobility then Morning Strength
 *  5. Default: start Powerbuilding at Push A
 */
export function recommendWorkoutId(
  history: WorkoutLog[],
  goal: string
): number | null {
  if (history.length === 0) return 4; // Push A — first Powerbuilding workout

  const PB_SEQUENCE = [4, 5, 6, 7, 8, 9]; // Push A → Pull A → Legs A → Push B → Pull B → Legs B
  const lastId = history[0]?.workout_id;
  const hasDonePB = history.some(w => PB_SEQUENCE.includes(w.workout_id));

  if (hasDonePB) {
    const lastIdx = PB_SEQUENCE.indexOf(lastId);
    if (lastIdx !== -1) {
      return PB_SEQUENCE[(lastIdx + 1) % PB_SEQUENCE.length];
    }
  }

  const g = goal.toLowerCase();
  if (g.includes("endur") || g.includes("cardio")) {
    return lastId === 2 ? 1 : 2;
  }
  if (g.includes("lose") || g.includes("weight")) {
    return lastId === 2 ? 3 : 2;
  }
  if (g.includes("wellness") || g.includes("recovery")) {
    return lastId === 3 ? 1 : 3;
  }

  return lastId === 4 ? 5 : 4;
}
