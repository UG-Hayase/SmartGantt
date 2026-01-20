
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
 * シートから全データを取得
 */
function getProjectData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    tickets: getSheetDataAsJson(ss.getSheetByName('Tickets')),
    users: getSheetDataAsJson(ss.getSheetByName('Users')),
    versions: getSheetDataAsJson(ss.getSheetByName('Versions')),
    priorities: getSheetDataAsJson(ss.getSheetByName('Priorities'))
  };
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
      // 日付オブジェクトを文字列(YYYY-MM-DD)に変換
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * 全データをシートに保存
 */
function saveAllData(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(payload);
  
  updateSheetFromData(ss.getSheetByName('Tickets'), data.tickets, [
    'id', 'subject', 'description', 'status', 'priorityId', 'assigneeId', 
    'versionId', 'parentId', 'startDate', 'dueDate', 'progress', 'estimatedHours'
  ]);
  updateSheetFromData(ss.getSheetByName('Users'), data.users, ['id', 'name', 'avatar']);
  updateSheetFromData(ss.getSheetByName('Versions'), data.versions, ['id', 'name']);
  updateSheetFromData(ss.getSheetByName('Priorities'), data.priorities, ['id', 'name', 'color']);
  
  return "Success";
}

/**
 * JSONデータに基づいてシートの内容を上書き更新
 */
function updateSheetFromData(sheet, items, headers) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(headers);
  if (items.length === 0) return;
  
  const values = items.map(item => headers.map(h => item[h] || ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}
