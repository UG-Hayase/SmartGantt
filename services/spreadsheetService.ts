
// Add global declaration for 'google' to fix TypeScript errors in Google Apps Script environment.
declare const google: any;

import { Ticket, User, Version, PriorityOption } from '../types';

/**
 * Google Apps Scriptとの通信を管理するサービス
 */
export const spreadsheetService = {
  /**
   * スプレッドシートから全データを取得
   */
  async loadData(): Promise<{
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
          .getProjectData();
      } else {
        // ローカル開発環境用のモック
        console.warn('GAS environment not found. Using local storage/mock.');
        const saved = localStorage.getItem('smart_gantt_mock');
        if (saved) {
          resolve(JSON.parse(saved));
        } else {
          // 初期値が必要な場合はここで返すか、App.tsx側でハンドリング
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
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((res: string) => resolve(res))
          .withFailureHandler((err: any) => reject(err))
          .saveAllData(payload);
      } else {
        // ローカル開発環境用のモック
        localStorage.setItem('smart_gantt_mock', payload);
        setTimeout(() => resolve("Saved to local storage"), 500);
      }
    });
  }
};
