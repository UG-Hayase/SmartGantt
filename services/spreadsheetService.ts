
// Add global declaration for 'google' to fix TypeScript errors in Google Apps Script environment.
declare const google: any;

import { Ticket, User, Version, PriorityOption } from '../types';

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  sheets: string[];
}

/**
 * Google Apps Scriptとの通信を管理するサービス
 */
export const spreadsheetService = {
  /**
   * 指定されたスプレッドシートの情報を取得
   */
  async getInfo(id?: string): Promise<SpreadsheetInfo> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((info: SpreadsheetInfo) => resolve(info))
          .withFailureHandler((err: any) => reject(err))
          .getSpreadsheetInfo(id || null);
      } else {
        resolve({ id: 'mock-id', name: 'Local Mock Spreadsheet', url: '#', sheets: [] });
      }
    });
  },

  /**
   * スプレッドシートから全データを取得
   */
  async loadData(spreadsheetId?: string): Promise<{
    tickets: Ticket[];
    users: User[];
    versions: Version[];
    priorities: PriorityOption[];
  }> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((data: any) => resolve(data))
          .withFailureHandler((err: any) => reject(err))
          .getProjectData(spreadsheetId || null);
      } else {
        console.warn('GAS environment not found. Using local storage/mock.');
        const saved = localStorage.getItem('smart_gantt_mock');
        if (saved) {
          resolve(JSON.parse(saved));
        } else {
          resolve({ tickets: [], users: [], versions: [], priorities: [] });
        }
      }
    });
  },

  /**
   * 全データをスプレッドシートに保存
   */
  async saveAll(data: {
    tickets: Ticket[];
    users: User[];
    versions: Version[];
    priorities: PriorityOption[];
  }, spreadsheetId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((res: string) => resolve(res))
          .withFailureHandler((err: any) => reject(err))
          .saveAllData(payload, spreadsheetId || null);
      } else {
        localStorage.setItem('smart_gantt_mock', payload);
        setTimeout(() => resolve("Saved to local storage"), 500);
      }
    });
  }
};
