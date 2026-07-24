/**
 * Relative calendar helpers (Monday-start week) — mirrors mobile sectioning.
 */

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + offset);
  return day;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function atLocalTime(day, hours, minutes = 0) {
  const d = startOfDay(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** First remaining day in this Mon–Sun week after today (or null). */
function pickThisWeekDay(now = new Date()) {
  const today = startOfDay(now);
  const weekEnd = addDays(startOfWeek(today), 7);
  const candidate = addDays(today, 1);
  if (candidate.getTime() < weekEnd.getTime()) {
    return candidate;
  }
  return null;
}

function pickNextWeekDay(now = new Date()) {
  const weekStart = startOfWeek(startOfDay(now));
  // Wednesday of next week
  return addDays(weekStart, 9);
}

function pickThisMonthBucketDay(now = new Date()) {
  const weekStart = startOfWeek(startOfDay(now));
  // First day after next week (lands in "This Month" bucket on mobile)
  return addDays(weekStart, 14);
}

module.exports = {
  startOfDay,
  startOfWeek,
  addDays,
  atLocalTime,
  pickThisWeekDay,
  pickNextWeekDay,
  pickThisMonthBucketDay,
};
