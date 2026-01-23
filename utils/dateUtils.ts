
import { Holiday } from '../types';

/**
 * ローカル時刻に基づいた YYYY-MM-DD 形式の文字列を返します。
 * toISOString() のタイムゾーンによる1日のズレを防ぎます。
 */
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * YYYY-MM-DD 文字列からローカル時刻の深夜0時の Date オブジェクトを安全に生成します。
 */
export const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split(/[-/]/).map(Number);
  if (parts.length !== 3) return new Date();
  // 月は0から始まるため -1
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 2つの日付間のカレンダー日数の差を返します。
 * 22日開始〜23日期日の場合、差は 1 となります。
 */
export const diffDays = (d1: Date, d2: Date): number => {
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getDaysInInterval = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const target = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (current <= target) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
};

export const getMonthYearString = (date: Date): string => {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const getJapaneseDay = (date: Date): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
};

/**
 * 指定した日が稼働日（平日かつ祝日でない）かどうかを判定。
 */
export const isWorkDay = (date: Date, holidays: Holiday[]): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 土日
  const dateStr = formatDate(date);
  return !holidays.some(h => h.date === dateStr);
};

/**
 * 開始日から指定した稼働日数（工数）後の期日を計算します（開始日を1日目として含む）。
 * 22日(月)開始、工数2日間の場合、22日(1日目)、23日(2日目)となり、23日を返します。
 */
export const addWorkDays = (startDate: Date, workDays: number, holidays: Holiday[]): Date => {
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let remaining = Math.max(1, Math.ceil(workDays));
  
  // 開始日が非稼働日の場合は、直後の稼働日までスライドさせてからカウント開始
  while (!isWorkDay(current, holidays)) {
    current = addDays(current, 1);
  }

  // 1日目は確保済みなので、2日目以降をループで加算
  let count = 1;
  while (count < remaining) {
    current = addDays(current, 1);
    if (isWorkDay(current, holidays)) {
      count++;
    }
  }
  
  return current;
};

/**
 * 2つの日付の間の稼働日数をカウントします（開始日・終了日を含む）。
 */
export const countWorkDays = (start: Date, end: Date, holidays: Holiday[]): number => {
  let count = 0;
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const target = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  if (current > target) return 0;

  while (current <= target) {
    if (isWorkDay(current, holidays)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
};
