
import { Ticket, Holiday, User } from '../types';

/**
 * チケット配列をCSV文字列に変換
 */
export const ticketsToCsv = (tickets: Ticket[]): string => {
  const headers = [
    'id', 'subject', 'description', 'status', 'priorityId', 
    'assigneeId', 'versionId', 'parentId', 'startDate', 
    'dueDate', 'progress', 'estimatedHours'
  ];

  const rows = tickets.map(t => 
    headers.map(header => {
      const val = (t as any)[header];
      const stringVal = val === null || val === undefined ? '' : String(val);
      return `"${stringVal.replace(/"/g, '""')}"`;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

/**
 * CSV文字列をチケット配列に変換
 */
export const csvToTickets = (csvText: string): Ticket[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const tickets: Ticket[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    const ticket: any = {};
    headers.forEach((header, index) => {
      let val: any = values[index];
      if (header === 'progress' || header === 'estimatedHours') {
        val = Number(val) || 0;
      }
      if (val === '') val = (header === 'parentId' || header === 'assigneeId' || header === 'versionId') ? null : '';
      ticket[header] = val;
    });
    
    if (ticket.id && ticket.subject) {
      tickets.push(ticket as Ticket);
    }
  }

  return tickets;
};

/**
 * 祝日配列をCSV文字列に変換
 */
export const holidaysToCsv = (holidays: Holiday[]): string => {
  const headers = ['date', 'name'];
  const rows = holidays.map(h => [
    `"${h.date}"`,
    `"${h.name.replace(/"/g, '""')}"`
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
};

/**
 * CSV文字列を祝日配列に変換
 */
export const csvToHolidays = (csvText: string): Holiday[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const holidays: Holiday[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    const holiday: any = { id: `h${Date.now()}-${i}` };
    headers.forEach((header, index) => {
      if (header === 'date' || header === 'name') {
        holiday[header] = values[index];
      }
    });
    
    if (holiday.date && holiday.name) {
      holidays.push(holiday as Holiday);
    }
  }

  return holidays;
};

/**
 * 担当者配列をCSV文字列に変換
 */
export const usersToCsv = (users: User[]): string => {
  const headers = ['id', 'name', 'avatar'];
  const rows = users.map(u => [
    `"${u.id}"`,
    `"${u.name.replace(/"/g, '""')}"`,
    `"${u.avatar}"`
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
};

/**
 * CSV文字列を担当者配列に変換
 */
export const csvToUsers = (csvText: string): User[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const users: User[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    const user: any = {};
    headers.forEach((header, index) => {
      if (['id', 'name', 'avatar'].includes(header)) {
        user[header] = values[index];
      }
    });
    
    if (!user.id) user.id = `u${Date.now()}-${i}`;
    if (!user.avatar) user.avatar = `https://picsum.photos/seed/${user.id}/40/40`;
    
    if (user.name) {
      users.push(user as User);
    }
  }

  return users;
};

/**
 * ファイルをダウンロードさせる
 */
export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
