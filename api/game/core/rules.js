// The game layer's numbers, in one place so they are easy to retune
// (docs/superpowers/specs/2026-11-05-game-layer-design.md).
//
// Pure and dependency-free: the api imports it, and so does the frontend as
// ../../../api/game/core/*, the way lib/coach-local.js reads api/coach/core.

// The day the game starts on this instance. Workouts before it earn nothing and do not count for
// the streak, so everyone starts at level 1 together. Set it to the go-live date before deploying.
export const LAUNCH = '2026-11-16';

// XP for one workout.
export const WORKOUT_XP = 100;
export const SET_XP = 5;
export const MAX_SETS_XP = 30;       // work sets counted per workout
export const PR_XP = 40;
export const MAX_PRS_XP = 5;         // PRs counted per workout
export const PLANNED_BONUS = 50;     // the session that was on the plan for the day
export const EXTRA_BONUS = 25;       // a session beyond the plan, the first one of a day only

// Light anti-abuse, for a group of friends.
export const DAY_CAP = 500;          // XP per day at most
export const BACKDATE_DAYS = 3;      // a workout first seen more than this many days after its day earns no XP

// The streak: weeks in a row with at least STREAK_MIN workouts, with freezes.
export const STREAK_MIN = 3;
export const FREE_PLANNED_PER_WEEK = 3; // without a plan, the first this many workouts of a week count as planned
export const FREEZE_EVERY = 4;
export const FREEZE_MAX = 2;
export const STREAK_BADGES = [4, 12, 26, 52, 104];

export const LB_KG = 0.45359237;

// Catalogue ids of the lifts the achievements name (the same ids lib/strength-level.js uses).
export const LIFTS = { bench: ['0025'], squat: ['0043', '3593'], deadlift: ['0032', '0117'] };

// getDay() indexes, as S.weekStart stores them.
export const MONDAY = 1;
export const SUNDAY = 0;
