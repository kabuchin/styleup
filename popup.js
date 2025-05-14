/**
 * StyleUp for WebClass - ポップアップスクリプト
 * テーマの切り替えと状態管理を担当
 */

// ポップアップページが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * ポップアップの初期化
 */
function initializePopup() {
  // 保存されているテーマを取得して適用
  loadSavedTheme();
  
  // テーマオプションにイベントリスナーを設定
  setupThemeSelectors();
}

/**
 * 保存されているテーマを読み込んで適用
 */
function loadSavedTheme() {
  chrome.storage.sync.get('selectedTheme', function(data) {
    const selectedTheme = data.selectedTheme || 'default';
    
    // ダークモードの場合はポップアップ自体にもクラスを適用
    if (selectedTheme === 'theme-dark') {
      document.body.classList.add('theme-dark');
    }
    
    // 選択されているテーマにアクティブクラスを追加
    const activeOption = document.querySelector(`.theme-option[data-theme="${selectedTheme}"]`);
    if (activeOption) {
      activeOption.classList.add('active');
    }
  });
}

/**
 * テーマ選択肢にイベントリスナーを設定
 */
function setupThemeSelectors() {
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const themeId = this.getAttribute('data-theme');
      
      // UI更新
      updateActiveThemeSelection(themeId);
      
      // テーマをストレージに保存
      chrome.storage.sync.set({ 'selectedTheme': themeId });
      
      // 現在アクティブなWebClassタブにテーマを適用
      applyThemeToWebClass(themeId);
    });
  });
}

/**
 * ポップアップUI上のアクティブなテーマを更新
 */
function updateActiveThemeSelection(themeId) {
  // アクティブマーカーを更新
  document.querySelector('.theme-option.active')?.classList.remove('active');
  document.querySelector(`.theme-option[data-theme="${themeId}"]`)?.classList.add('active');
  
  // ダークモード切り替え
  if (themeId === 'theme-dark') {
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.remove('theme-dark');
  }
}

/**
 * WebClassタブにテーマを適用
 */
function applyThemeToWebClass(themeId) {
  // WebClassタブを検索
  chrome.tabs.query({url: "*://ed24lb.osaka-sandai.ac.jp/*"}, function(tabs) {
    if (tabs.length > 0) {
      // 見つかったすべてのWebClassタブにテーマを適用
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'setTheme',
          theme: themeId
        }, response => {
          const error = chrome.runtime.lastError;
          // エラー無視（ページがロード中などの場合）
        });
      });
    }
  });
}
