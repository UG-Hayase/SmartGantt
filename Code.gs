
/**
 * スプレッドシートのメニューにガントチャート起動ボタンを追加
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SmartGantt')
    .addItem('ガントチャートを開く', 'showSidebar')
    .addToUi();
}

/**
 * サイドバーを表示
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SmartGantt for Sheets')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 指定されたIDのスプレッドシート情報を取得（接続確認用）
 */
function getSpreadsheetInfo(spreadsheetId) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    
    // 必要なシートの存在確認と作成
    const requiredSheets = ['Tickets', 'Users', 'Versions', 'Priorities'];
    requiredSheets.forEach(name => {
      if (!ss.getSheetByName(name)) {
        ss.insertSheet(name);
        // ヘッダーの初期化
        const sheet = ss.getSheetByName(name);
        if (name === 'Tickets') {
          sheet.appendRow(['id', 'subject', 'description', 'status', 'priorityId', 'assigneeId', 'versionId', 'parentId', 'startDate', 'dueDate', 'progress', 'estimatedHours']);
        } else if (name === 'Users') {
          sheet.appendRow(['id', 'name', 'avatar']);
        } else if (name === 'Versions') {
          sheet.appendRow(['id', 'name']);
        } else if (name === 'Priorities') {
          sheet.appendRow(['id', 'name', 'color']);
        }
      }
    });

    return {
      id: ss.getId(),
      name: ss.getName(),
      url: ss.getUrl(),
      sheets: ss.getSheets().map(s => s.getName())
    };
  } catch (e) {
    // 具体的なエラーメッセージをフロントに返す
    const errorMsg = e.message || e.toString();
    if (errorMsg.includes('not found')) {
      throw new Error("スプレッドシートが見つかりません。IDが正しいか確認してください。");
    } else if (errorMsg.includes('permission') || errorMsg.includes('Access denied')) {
      throw new Error("アクセス権限がありません。このファイルをスクリプト実行ユーザーに共有してください。");
    } else {
      throw new Error("接続エラー: " + errorMsg);
    }
  }
}

/**
 * シートから全データを取得
 */
function getProjectData(spreadsheetId) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    return {
      tickets: getSheetDataAsJson(ss.getSheetByName('Tickets')),
      users: getSheetDataAsJson(ss.getSheetByName('Users')),
      versions: getSheetDataAsJson(ss.getSheetByName('Versions')),
      priorities: getSheetDataAsJson(ss.getSheetByName('Priorities'))
    };
  } catch (e) {
    throw new Error("データの取得に失敗しました: " + e.message);
  }
}

/**
 * シートのデータをJSON形式に変換
 */
function getSheetDataAsJson(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      if (val instanceof Date) {
        // ISO 8601形式で日付を扱う
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * 全データをシートに保存
 */
function saveAllData(payload, spreadsheetId) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(payload);
    
    updateSheetFromData(ss.getSheetByName('Tickets'), data.tickets, [
      'id', 'subject', 'description', 'status', 'priorityId', 'assigneeId', 
      'versionId', 'parentId', 'startDate', 'dueDate', 'progress', 'estimatedHours'
    ]);
    updateSheetFromData(ss.getSheetByName('Users'), data.users, ['id', 'name', 'avatar']);
    updateSheetFromData(ss.getSheetByName('Versions'), data.versions, ['id', 'name']);
    updateSheetFromData(ss.getSheetByName('Priorities'), data.priorities, ['id', 'name', 'color']);
    
    return "Success";
  } catch (e) {
    throw new Error("保存に失敗しました: " + e.message);
  }
}

/**
 * JSONデータに基づいてシートの内容を上書き更新
 */
function updateSheetFromData(sheet, items, headers) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(headers);
  if (!items || items.length === 0) return;
  
  const values = items.map(item => headers.map(h => {
    const val = item[h];
    // 空の値やnullは空文字にする
    return (val === null || val === undefined) ? '' : val;
  }));
  
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}
