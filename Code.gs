
/**
 * このスクリプトは不要となりました。
 * アプリケーションはブラウザのローカルストレージとCSVファイルで動作します。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SmartGantt')
    .addItem('ガントチャートを開く (ブラウザ版)', 'showSidebar')
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SmartGantt Local')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showSidebar(html);
}
