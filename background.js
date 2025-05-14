/**
 * StyleUp for WebClass
 * バックグラウンドスクリプト - 拡張機能のグローバル機能を管理
 */

// インストール/アップデート時の処理
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // 新規インストール時
    console.log('StyleUp for WebClass がインストールされました');
    
    // デフォルトテーマを設定
    chrome.storage.sync.set({ 'selectedTheme': 'default' });
    
    // インストール時にオプションページを開く
    chrome.tabs.create({
      url: 'popup.html'
    });
  } else if (details.reason === 'update') {
    // アップデート時
    console.log('StyleUp for WebClass がバージョン ' + chrome.runtime.getManifest().version + ' に更新されました');
  }
});

// メッセージリスナー - 他のスクリプトからの通信を処理
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'getTheme') {
    // 現在のテーマ設定を返す
    chrome.storage.sync.get('selectedTheme', function(data) {
      sendResponse({ theme: data.selectedTheme || 'default' });
    });
    return true; // 非同期レスポンスのため true を返す
  }
});

// ブラウザアクションボタンクリック時の処理
chrome.action.onClicked.addListener(function() {
  // ポップアップが自動的に表示されない場合は、手動でポップアップを表示
  chrome.action.openPopup();
});

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(function() {
  // 右クリックメニューを追加
  chrome.contextMenus.create({
    id: 'styleup-menu',
    title: 'StyleUp for WebClass',
    contexts: ['page'],
    documentUrlPatterns: ['*://ed24lb.osaka-sandai.ac.jp/*']
  });
  
  // サブメニューを追加
  chrome.contextMenus.create({
    id: 'toggle-dark-mode',
    parentId: 'styleup-menu',
    title: 'ダークモード切替',
    contexts: ['page'],
    documentUrlPatterns: ['*://ed24lb.osaka-sandai.ac.jp/*']
  });
  
  chrome.contextMenus.create({
    id: 'home-page',
    parentId: 'styleup-menu',
    title: 'WebClassホームへ',
    contexts: ['page'],
    documentUrlPatterns: ['*://ed24lb.osaka-sandai.ac.jp/*']
  });
});

// コンテキストメニュークリック時の処理
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'toggle-dark-mode') {
    // ダークモード切替
    toggleDarkMode(tab);
  } else if (info.menuItemId === 'home-page') {
    // WebClassホームへ移動
    chrome.tabs.update(tab.id, {
      url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/'
    });
  }
});

// ダークモード切替関数
function toggleDarkMode(tab) {
  chrome.storage.sync.get('selectedTheme', function(data) {
    const currentTheme = data.selectedTheme || 'default';
    const newTheme = currentTheme === 'theme-dark' ? 'default' : 'theme-dark';
    
    // テーマ設定を更新
    chrome.storage.sync.set({ 'selectedTheme': newTheme });
    
    // 現在のタブにメッセージを送信
    chrome.tabs.sendMessage(tab.id, {
      action: 'setTheme',
      theme: newTheme
    });
  });
}
