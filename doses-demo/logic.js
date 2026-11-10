// Doses demo: the reminder logic, ported from the iPhone app's DoseCore package (Swift).
// Pure functions on a plain "log" object, so it can be tested with `node doses-demo/logic.test.js`.
// Times are milliseconds since the epoch, in the visitor's local time zone.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DoseLogic = factory();
})(this, function () {
  "use strict";

  const MINUTE = 60000;
  const MAX_REMINDERS = 8; // the iPhone app keeps at most 64 pending notifications

  function defaultSchedule() {
    return {
      reminders: [
        { id: "morning", title: "Morning", hour: 8, minute: 0, isEnabled: true },
        { id: "evening", title: "Evening", hour: 20, minute: 0, isEnabled: true },
      ],
      graceMinutes: 120, // not recorded this long after it is due = missed
      earlyMinutes: 60,  // "I took it" opens this long before the dose is due
    };
  }

  // Doses due before trackingStart are ignored, so starting never invents "missed" doses from the past.
  function newLog(trackingStart) {
    return { schedule: defaultSchedule(), trackingStart: trackingStart, taken: [], notes: [] };
  }

  const byTime = (a, b) => a.dueAt - b.dueAt || a.title.localeCompare(b.title);
  const keyOf = (o) => o.reminderId + "|" + o.dueAt;

  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function nextDay(ms) {
    const d = new Date(ms);
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // Every enabled reminder due on the day containing dayMs, earliest first.
  function occurrencesOn(schedule, dayMs) {
    const d = new Date(dayMs);
    return schedule.reminders
      .filter((r) => r.isEnabled)
      .map((r) => ({
        reminderId: r.id,
        title: r.title,
        dueAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), r.hour, r.minute, 0, 0).getTime(),
      }))
      .sort(byTime);
  }

  // Every scheduled dose with start <= dueAt <= end, oldest first.
  function occurrencesFrom(schedule, start, end) {
    const out = [];
    for (let day = startOfDay(start); day <= end; day = nextDay(day)) {
      for (const o of occurrencesOn(schedule, day)) {
        if (o.dueAt >= start && o.dueAt <= end) out.push(o);
      }
    }
    return out.sort(byTime);
  }

  function entryFor(log, occ) {
    return log.taken.find((e) => e.reminderId === occ.reminderId && e.dueAt === occ.dueAt);
  }

  // One of: upcoming, due, taken, takenLate, missed (+ `at` when recorded).
  function status(log, occ, now) {
    const grace = log.schedule.graceMinutes * MINUTE;
    const entry = entryFor(log, occ);
    if (entry) {
      return entry.takenAt > occ.dueAt + grace
        ? { state: "takenLate", at: entry.takenAt }
        : { state: "taken", at: entry.takenAt };
    }
    if (now < occ.dueAt) return { state: "upcoming" };
    return { state: now <= occ.dueAt + grace ? "due" : "missed" };
  }

  // The "I took it" button opens `earlyMinutes` before the dose and closes once it is recorded.
  function canMarkTaken(log, occ, now) {
    if (entryFor(log, occ)) return false;
    return now >= occ.dueAt - log.schedule.earlyMinutes * MINUTE;
  }

  function undoTaken(log, occ) {
    log.taken = log.taken.filter((e) => !(e.reminderId === occ.reminderId && e.dueAt === occ.dueAt));
  }

  function markTaken(log, occ, at) {
    undoTaken(log, occ);
    // The title is kept so history still reads right if the reminder is later renamed or deleted.
    log.taken.push({ reminderId: occ.reminderId, title: occ.title, dueAt: occ.dueAt, takenAt: at });
  }

  const withoutTitles = (s) =>
    JSON.stringify(Object.assign({}, s, { reminders: s.reminders.map((r) => Object.assign({}, r, { title: "" })) }));

  // Changing times, adding or removing a reminder restarts tracking from `now`;
  // earlier recorded doses stay in the history. Only renaming keeps tracking as it was.
  function changeSchedule(log, newSchedule, now) {
    if (JSON.stringify(newSchedule) === JSON.stringify(log.schedule)) return;
    const onlyRenamed = withoutTitles(newSchedule) === withoutTitles(log.schedule);
    log.schedule = newSchedule;
    if (!onlyRenamed) log.trackingStart = now;
  }

  function addNote(log, at, text) {
    log.notes.push({ id: String(at) + "-" + log.notes.length, at: at, note: text });
  }

  function removeNote(log, id) {
    log.notes = log.notes.filter((n) => n.id !== id);
  }

  function today(log, now) {
    return occurrencesOn(log.schedule, now);
  }

  // Past doses, newest first: scheduled since tracking began, plus anything recorded earlier.
  function history(log, now) {
    const all = new Map();
    for (const o of occurrencesFrom(log.schedule, log.trackingStart, now)) all.set(keyOf(o), o);
    for (const e of log.taken) {
      const o = { reminderId: e.reminderId, title: e.title, dueAt: e.dueAt };
      if (e.dueAt <= now && !all.has(keyOf(o))) all.set(keyOf(o), o);
    }
    return Array.from(all.values()).sort((a, b) => byTime(b, a));
  }

  function lastMissedOrLate(log, now) {
    return history(log, now).find((o) => {
      const s = status(log, o, now).state;
      return s === "missed" || s === "takenLate";
    }) || null;
  }

  const fmt = (ms) =>
    new Date(ms).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  // A plain-text summary the person can copy and show their doctor. Labels and times only.
  function report(log, now, days) {
    days = days || 30;
    const cutoff = now - days * 86400000;
    let onTime = 0, late = 0, missed = 0;
    const lines = [];
    for (const o of history(log, now).filter((x) => x.dueAt >= cutoff)) {
      const s = status(log, o, now);
      if (s.state === "taken") { onTime++; lines.push(fmt(o.dueAt) + " " + o.title + ": taken " + fmt(s.at)); }
      else if (s.state === "takenLate") { late++; lines.push(fmt(o.dueAt) + " " + o.title + ": LATE, taken " + fmt(s.at)); }
      else if (s.state === "missed") { missed++; lines.push(fmt(o.dueAt) + " " + o.title + ": MISSED"); }
    }
    const out = ["Dose record, last " + days + " days", "", "On time: " + onTime + "   Late: " + late + "   Missed: " + missed, ""].concat(lines);
    const notes = log.notes.filter((n) => n.at >= cutoff).sort((a, b) => b.at - a.at);
    if (notes.length) {
      out.push("", "Notes");
      for (const n of notes) out.push(fmt(n.at) + (n.note ? ": " + n.note : ""));
    }
    return out.join("\n");
  }

  return {
    MAX_REMINDERS: MAX_REMINDERS, MINUTE: MINUTE,
    defaultSchedule: defaultSchedule, newLog: newLog, startOfDay: startOfDay,
    occurrencesOn: occurrencesOn, occurrencesFrom: occurrencesFrom,
    status: status, canMarkTaken: canMarkTaken, markTaken: markTaken, undoTaken: undoTaken,
    changeSchedule: changeSchedule, addNote: addNote, removeNote: removeNote,
    today: today, history: history, lastMissedOrLate: lastMissedOrLate, report: report,
  };
});
