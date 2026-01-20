
import { Ticket, TicketStatus } from '../types';

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
      // カンマや改行を含む場合はダブルクォーテーションで囲む
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
    
    // 単純なカンマ区切り（クォート内のカンマは考慮しない簡易版。高度なパースが必要な場合はライブラリ推奨）
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
 * ファイルをダウンロードさせる
 */
export const downloadFile = (content: string, fileName: string, contentType: string) => {
  // 日本語の文字化けを防ぐためBOMを付与
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
