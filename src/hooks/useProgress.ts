"use client";
import { useState, useEffect, useCallback } from "react";
import { UNITS } from "@/data/curriculum";

export interface LessonRecord { completed: boolean; stars: number; xp: number; attempts: number; }
export interface ProgressStore {
  lessons: Record<string, LessonRecord>;      // "{lang}|{unitId}|{topicId}"
  challenges: Record<string, boolean>;        // "{lang}|{unitId}"
  rewards: Record<string, boolean>;           // "{unitId}"
  totalXP: number;
}

const EMPTY: ProgressStore = { lessons: {}, challenges: {}, rewards: {}, totalXP: 0 };

export function useProgress() {
  const [p, setP] = useState<ProgressStore>(EMPTY);

  useEffect(() => {
    try { const s = localStorage.getItem("av-progress"); if (s) setP({ ...EMPTY, ...JSON.parse(s) }); } catch {}
  }, []);

  const save = useCallback((next: ProgressStore) => {
    setP(next);
    try { localStorage.setItem("av-progress", JSON.stringify(next)); } catch {}
  }, []);

  const lessonKey = (lang: string, unitId: number, topicId: string) => `${lang}|${unitId}|${topicId}`;
  const challengeKey = (lang: string, unitId: number) => `${lang}|${unitId}`;

  const getLessonRecord = useCallback((lang: string, unitId: number, topicId: string): LessonRecord =>
    p.lessons[lessonKey(lang, unitId, topicId)] ?? { completed: false, stars: 0, xp: 0, attempts: 0 },
  [p]);

  const isChallengeComplete = useCallback((lang: string, unitId: number) =>
    p.challenges[challengeKey(lang, unitId)] ?? false, [p]);

  const isUnitUnlocked = useCallback((lang: string, unitId: number): boolean => {
    if (unitId <= 1) return true;
    const prev = UNITS.find(u => u.id === unitId - 1)!;
    const donePrev = prev.lessons.filter(l => p.lessons[lessonKey(lang, unitId - 1, l.id)]?.completed).length;
    return donePrev >= 2;
  }, [p]);

  const isLessonUnlocked = useCallback((lang: string, unitId: number, lessonIdx: number): boolean => {
    if (!isUnitUnlocked(lang, unitId)) return false;
    if (lessonIdx === 0) return true;
    const unit = UNITS.find(u => u.id === unitId)!;
    return p.lessons[lessonKey(lang, unitId, unit.lessons[lessonIdx - 1].id)]?.completed ?? false;
  }, [p, isUnitUnlocked]);

  const isChallengeUnlocked = useCallback((lang: string, unitId: number): boolean => {
    const unit = UNITS.find(u => u.id === unitId)!;
    return unit.lessons.every(l => p.lessons[lessonKey(lang, unitId, l.id)]?.completed);
  }, [p]);

  const isRewardReady = useCallback((lang: string, unitId: number): boolean => {
    if (p.rewards[`${unitId}`]) return false; // already claimed
    return isChallengeUnlocked(lang, unitId);  // all lessons done (challenge optional)
  }, [p, isChallengeUnlocked]);

  const completeLesson = useCallback((lang: string, unitId: number, topicId: string, stars: number, xpEarned: number): number => {
    const key = lessonKey(lang, unitId, topicId);
    const prev = p.lessons[key];
    const xpDelta = prev?.completed ? Math.max(0, xpEarned - (prev.xp ?? 0)) : xpEarned;
    save({
      ...p,
      totalXP: p.totalXP + xpDelta,
      lessons: {
        ...p.lessons,
        [key]: { completed: true, stars: Math.max(stars, prev?.stars ?? 0), xp: xpEarned, attempts: (prev?.attempts ?? 0) + 1 },
      },
    });
    return xpDelta;
  }, [p, save]);

  const completeChallenge = useCallback((lang: string, unitId: number, xpEarned: number) => {
    save({ ...p, totalXP: p.totalXP + xpEarned, challenges: { ...p.challenges, [challengeKey(lang, unitId)]: true } });
  }, [p, save]);

  const claimReward = useCallback((unitId: number) => {
    save({ ...p, rewards: { ...p.rewards, [`${unitId}`]: true } });
  }, [p, save]);

  const getUnitStats = useCallback((lang: string, unitId: number) => {
    const unit = UNITS.find(u => u.id === unitId)!;
    const done = unit.lessons.filter(l => p.lessons[lessonKey(lang, unitId, l.id)]?.completed).length;
    const stars = unit.lessons.reduce((acc, l) => acc + (p.lessons[lessonKey(lang, unitId, l.id)]?.stars ?? 0), 0);
    return { done, total: unit.lessons.length, stars, maxStars: unit.lessons.length * 3 };
  }, [p]);

  const getLangStats = useCallback((lang: string) => {
    let done = 0, total = 0;
    UNITS.forEach(u => { total += u.lessons.length; u.lessons.forEach(l => { if (p.lessons[lessonKey(lang, u.id, l.id)]?.completed) done++; }); });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [p]);

  return {
    totalXP: p.totalXP,
    rewards: p.rewards,
    getLessonRecord, isChallengeComplete,
    isUnitUnlocked, isLessonUnlocked, isChallengeUnlocked, isRewardReady,
    completeLesson, completeChallenge, claimReward,
    getUnitStats, getLangStats,
  };
}
