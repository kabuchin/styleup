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
  // 保存されているテーマと設定を取得して適用
  loadSavedThemeAndSettings();
  
  // テーマオプションにイベントリスナーを設定
  setupThemeSelectors();
  
  // 自動スクロール設定のイベントリスナーを設定
  setupAutoScrollToggle();
  
  // フォントサイズスライダーのイベントリスナーを設定
  setupFontSizeSlider();
  
  // ログイン情報の設定
  setupLoginSettings();
}

/**
 * 保存されているテーマと設定を読み込んで適用
 */
function loadSavedThemeAndSettings() {
  chrome.storage.sync.get({
    'selectedTheme': 'default',
    'autoScroll': true,
    'courseFontSize': 14
  }, function(data) {
    // テーマの適用
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
    
    // 自動スクロール設定の適用（デフォルトはオン）
    const autoScrollEnabled = data.autoScroll !== undefined ? data.autoScroll : true;
    document.getElementById('auto-scroll').checked = autoScrollEnabled;
    
    // フォントサイズスライダーを設定
    const fontSizeSlider = document.getElementById('course-font-size');
    const fontSizeDisplay = document.getElementById('font-size-display');
    const fontPreview = document.getElementById('course-font-preview');
    
    // スライダー値を設定
    const fontSize = data.courseFontSize || 14;
    fontSizeSlider.value = fontSize;
    fontSizeDisplay.textContent = fontSize;
    
    // プレビューに適用
    fontPreview.style.fontSize = fontSize + 'px';
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
 * 自動スクロール切り替えのイベントリスナーを設定
 */
function setupAutoScrollToggle() {
  const autoScrollToggle = document.getElementById('auto-scroll');
  
  autoScrollToggle.addEventListener('change', function() {
    // 設定値をストレージに保存
    chrome.storage.sync.set({ 'autoScroll': this.checked });
    
    // 現在アクティブなWebClassタブに設定を適用
    updateWebClassSettings({ autoScroll: this.checked });
  });
}

/**
 * フォントサイズスライダーのイベントリスナーを設定
 */
function setupFontSizeSlider() {
  const fontSizeSlider = document.getElementById('course-font-size');
  const fontSizeDisplay = document.getElementById('font-size-display');
  const fontPreview = document.getElementById('course-font-preview');
  
  // スライダー値変更時
  fontSizeSlider.addEventListener('input', function() {
    const fontSize = this.value;
    
    // 表示値を更新
    fontSizeDisplay.textContent = fontSize;
    
    // プレビューに適用
    fontPreview.style.fontSize = fontSize + 'px';
    
    // Chromeストレージに保存
    chrome.storage.sync.set({ 'courseFontSize': parseInt(fontSize) });
    
    // 現在アクティブなタブに設定を適用
    updateWebClassSettings({ courseFontSize: parseInt(fontSize) });
  });
}

/**
 * ログイン設定を初期化し、イベントリスナーを設定
 */
function setupLoginSettings() {
  const usernameField = document.getElementById('username');
  const passwordField = document.getElementById('password');
  const autoLoginToggle = document.getElementById('auto-login');
  const saveButton = document.getElementById('save-login');
  const saveStatus = document.getElementById('save-status');
  
  // 保存された値を読み込み
  chrome.storage.sync.get(['wcUsername', 'wcPassword', 'autoLogin'], function(data) {
    if (data.wcUsername) {
      usernameField.value = data.wcUsername;
    }
    
    if (data.wcPassword) {
      passwordField.value = data.wcPassword;
    }
    
    autoLoginToggle.checked = data.autoLogin || false;
  });
  
  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', function() {
    const username = usernameField.value.trim();
    const password = passwordField.value;
    const autoLogin = autoLoginToggle.checked;
    
    // 保存処理
    chrome.storage.sync.set({
      'wcUsername': username,
      'wcPassword': password,
      'autoLogin': autoLogin
    }, function() {
      // 保存成功メッセージを表示
      saveStatus.style.display = 'block';
      
      // 3秒後にメッセージを非表示
      setTimeout(function() {
        saveStatus.style.display = 'none';
      }, 3000);
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

/**
 * WebClassタブに設定を適用
 */
function updateWebClassSettings(settings) {
  // WebClassタブを検索
  chrome.tabs.query({url: "*://ed24lb.osaka-sandai.ac.jp/*"}, function(tabs) {
    if (tabs.length > 0) {
      // 見つかったすべてのWebClassタブに設定を適用
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateSettings',
          settings: settings
        }, response => {
          const error = chrome.runtime.lastError;
          // エラー無視（ページがロード中などの場合）
        });
      });
    }
  });
}
