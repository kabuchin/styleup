/**
 * StyleUp for WebClass - ポップアップスクリプト
 * テーマの切り替えと状態管理を担当
 */

// カラープリセット定義
const COLOR_PRESETS = {
  blue: { main: '#1a73e8', sub: '#4285f4', accent: '#fbbc04' },
  green: { main: '#0f9d58', sub: '#34a853', accent: '#fbbc04' },
  red: { main: '#d93025', sub: '#ea4335', accent: '#fbbc04' },
  purple: { main: '#673ab7', sub: '#9c27b0', accent: '#ffeb3b' },
  orange: { main: '#f57c00', sub: '#ff9800', accent: '#ffc107' },
  teal: { main: '#00796b', sub: '#009688', accent: '#ffeb3b' },
  pink: { main: '#c2185b', sub: '#e91e63', accent: '#ffc107' },
  indigo: { main: '#303f9f', sub: '#3f51b5', accent: '#ff5722' }
};

// デフォルト曜日カラー
const DEFAULT_DAY_COLORS = {
  mon: '#ef5350',
  tue: '#ff9800',
  wed: '#4caf50',
  thu: '#2196f3',
  fri: '#9c27b0',
  sat: '#00bcd4',
  sun: '#ff5722'
};

// 初期化
document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
  loadSavedSettings();
  setupTabNavigation();
  setupBaseThemeSelector();
  setupColorPresets();
  setupCustomColorPickers();
  setupDayTagStyles();
  setupDayColorPickers();
  setupToggleSwitches();
  setupFontSizeSlider();
  setupLoginSettings();
}

/**
 * 保存されている設定を読み込む
 */
function loadSavedSettings() {
  chrome.storage.sync.get({
    baseTheme: 'light',
    colorPreset: 'blue',
    mainColor: '#1a73e8',
    subColor: '#4285f4',
    accentColor: '#fbbc04',
    dayTagStyle: 'colorful',
    dayColors: DEFAULT_DAY_COLORS,
    autoScroll: true,
    enableAnimations: true,
    enableBlur: true,
    courseFontSize: 14,
    wcUsername: '',
    wcPassword: '',
    autoLogin: false,
    autoLoginFailCount: 0
  }, function(data) {
    // ベーステーマ
    if (data.baseTheme === 'dark') {
      document.body.classList.add('theme-dark');
    }
    setActiveOption('.base-theme-option', `[data-base-theme="${data.baseTheme}"]`);
    
    // カラープリセット
    setActiveOption('.color-preset', `[data-preset="${data.colorPreset}"]`);
    
    // カスタムカラー
    document.getElementById('main-color').value = data.mainColor;
    document.getElementById('sub-color').value = data.subColor;
    document.getElementById('accent-color').value = data.accentColor;
    updateColorValues();
    updatePreviewColors(data.mainColor, data.subColor, data.accentColor);
    
    // 曜日タグスタイル
    setActiveOption('.day-style-option', `[data-style="${data.dayTagStyle}"]`);
    
    // 曜日カラー
    Object.entries(data.dayColors).forEach(([day, color]) => {
      const input = document.getElementById(`day-color-${day}`);
      if (input) input.value = color;
    });
    
    // トグル設定
    document.getElementById('auto-scroll').checked = data.autoScroll;
    document.getElementById('enable-animations').checked = data.enableAnimations;
    document.getElementById('enable-blur').checked = data.enableBlur;
    
    // フォントサイズ
    document.getElementById('course-font-size').value = data.courseFontSize;
    document.getElementById('font-size-display').textContent = data.courseFontSize;
    document.getElementById('course-font-preview').style.fontSize = data.courseFontSize + 'px';
    
    // ログイン設定
    document.getElementById('username').value = data.wcUsername;
    document.getElementById('password').value = data.wcPassword;
    document.getElementById('auto-login').checked = data.autoLogin;
    
    // 失敗カウント表示
    updateLoginFailCountDisplay(data.autoLoginFailCount);
  });
}

/**
 * タブナビゲーションのセットアップ
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // ボタンのアクティブ状態
      tabButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // コンテンツの表示切替
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

/**
 * ベーステーマ選択のセットアップ
 */
function setupBaseThemeSelector() {
  const options = document.querySelectorAll('.base-theme-option');
  
  options.forEach(option => {
    option.addEventListener('click', function() {
      const theme = this.dataset.baseTheme;
      
      setActiveOption('.base-theme-option', `[data-base-theme="${theme}"]`);
      
      if (theme === 'dark') {
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
      }
      
      saveSettings({ baseTheme: theme });
      applyToWebClass();
    });
  });
}

/**
 * カラープリセットのセットアップ
 */
function setupColorPresets() {
  const presets = document.querySelectorAll('.color-preset');
  
  presets.forEach(preset => {
    preset.addEventListener('click', function() {
      const presetId = this.dataset.preset;
      const colors = COLOR_PRESETS[presetId];
      
      setActiveOption('.color-preset', `[data-preset="${presetId}"]`);
      
      // カラーピッカーを更新
      document.getElementById('main-color').value = colors.main;
      document.getElementById('sub-color').value = colors.sub;
      document.getElementById('accent-color').value = colors.accent;
      updateColorValues();
      updatePreviewColors(colors.main, colors.sub, colors.accent);
      
      saveSettings({
        colorPreset: presetId,
        mainColor: colors.main,
        subColor: colors.sub,
        accentColor: colors.accent
      });
      applyToWebClass();
    });
  });
}

/**
 * カスタムカラーピッカーのセットアップ
 */
function setupCustomColorPickers() {
  const mainColor = document.getElementById('main-color');
  const subColor = document.getElementById('sub-color');
  const accentColor = document.getElementById('accent-color');
  
  [mainColor, subColor, accentColor].forEach(picker => {
    picker.addEventListener('input', function() {
      // プリセットの選択を解除
      document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
      
      updateColorValues();
      updatePreviewColors(mainColor.value, subColor.value, accentColor.value);
      
      saveSettings({
        colorPreset: 'custom',
        mainColor: mainColor.value,
        subColor: subColor.value,
        accentColor: accentColor.value
      });
      applyToWebClass();
    });
  });
}

/**
 * カラー値の表示を更新
 */
function updateColorValues() {
  document.getElementById('main-color-value').textContent = document.getElementById('main-color').value;
  document.getElementById('sub-color-value').textContent = document.getElementById('sub-color').value;
  document.getElementById('accent-color-value').textContent = document.getElementById('accent-color').value;
}

/**
 * プレビューカードの色を更新
 */
function updatePreviewColors(main, sub, accent) {
  const preview = document.getElementById('color-preview');
  const header = preview.querySelector('.preview-header');
  const button = preview.querySelector('.preview-button');
  const badge = preview.querySelector('.preview-badge');
  const link = preview.querySelector('.preview-link');
  
  header.style.background = `linear-gradient(135deg, ${main}, ${sub})`;
  button.style.backgroundColor = main;
  badge.style.backgroundColor = sub;
  link.style.color = main;
  
  // CSS変数も更新
  document.documentElement.style.setProperty('--primary-color', main);
  document.documentElement.style.setProperty('--sub-color', sub);
  document.documentElement.style.setProperty('--accent-color', accent);
}

/**
 * 曜日タグスタイルのセットアップ
 */
function setupDayTagStyles() {
  const options = document.querySelectorAll('.day-style-option');
  
  options.forEach(option => {
    option.addEventListener('click', function() {
      const style = this.dataset.style;
      
      setActiveOption('.day-style-option', `[data-style="${style}"]`);
      
      saveSettings({ dayTagStyle: style });
      applyToWebClass();
    });
  });
}

/**
 * 曜日カラーピッカーのセットアップ
 */
function setupDayColorPickers() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  days.forEach(day => {
    const picker = document.getElementById(`day-color-${day}`);
    if (picker) {
      picker.addEventListener('input', function() {
        const dayColors = {};
        days.forEach(d => {
          dayColors[d] = document.getElementById(`day-color-${d}`).value;
        });
        
        saveSettings({ dayColors });
        applyToWebClass();
      });
    }
  });
}

/**
 * トグルスイッチのセットアップ
 */
function setupToggleSwitches() {
  const autoScroll = document.getElementById('auto-scroll');
  const enableAnimations = document.getElementById('enable-animations');
  const enableBlur = document.getElementById('enable-blur');
  
  autoScroll.addEventListener('change', function() {
    saveSettings({ autoScroll: this.checked });
    applyToWebClass();
  });
  
  enableAnimations.addEventListener('change', function() {
    saveSettings({ enableAnimations: this.checked });
    applyToWebClass();
  });
  
  enableBlur.addEventListener('change', function() {
    saveSettings({ enableBlur: this.checked });
    applyToWebClass();
  });
}

/**
 * フォントサイズスライダーのセットアップ
 */
function setupFontSizeSlider() {
  const slider = document.getElementById('course-font-size');
  const display = document.getElementById('font-size-display');
  const preview = document.getElementById('course-font-preview');
  
  slider.addEventListener('input', function() {
    const size = this.value;
    display.textContent = size;
    preview.style.fontSize = size + 'px';
    
    saveSettings({ courseFontSize: parseInt(size) });
    applyToWebClass();
  });
}

/**
 * ログイン設定のセットアップ
 */
function setupLoginSettings() {
  const saveButton = document.getElementById('save-login');
  const saveStatus = document.getElementById('save-status');
  
  saveButton.addEventListener('click', function() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const autoLogin = document.getElementById('auto-login').checked;
    
    chrome.storage.sync.set({
      wcUsername: username,
      wcPassword: password,
      autoLogin: autoLogin,
      autoLoginFailCount: 0
    }, function() {
      saveStatus.style.display = 'flex';
      updateLoginFailCountDisplay(0);
      
      setTimeout(function() {
        saveStatus.style.display = 'none';
      }, 3000);
    });
  });
}

/**
 * ログイン失敗カウントの表示を更新
 */
function updateLoginFailCountDisplay(count) {
  let failCountDiv = document.getElementById('login-fail-count');
  
  if (count >= 3) {
    if (!failCountDiv) {
      failCountDiv = document.createElement('div');
      failCountDiv.id = 'login-fail-count';
      failCountDiv.className = 'alert alert-warning';
      failCountDiv.innerHTML = `
        <span class="material-icons">error</span>
        <div>
          <strong>自動ログインが${count}回失敗し停止中</strong><br>
          <small>設定を保存すると再度有効になります</small>
        </div>
      `;
      
      const saveButton = document.getElementById('save-login');
      saveButton.parentNode.insertBefore(failCountDiv, saveButton);
    }
    failCountDiv.style.display = 'flex';
  } else if (failCountDiv) {
    failCountDiv.style.display = 'none';
  }
}

/**
 * アクティブオプションの設定
 */
function setActiveOption(parentSelector, activeSelector) {
  document.querySelectorAll(parentSelector).forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`${parentSelector}${activeSelector}`);
  if (activeEl) activeEl.classList.add('active');
}

// デバウンス用の変数
let pendingSettings = {};
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_DELAY = 500; // 500ms待ってから保存

/**
 * 設定を保存（デバウンス処理）
 * MAX_WRITE_OPERATIONS_PER_MINUTE エラーを防ぐため、
 * 複数の設定変更をまとめて保存する
 */
function saveSettings(settings) {
  // 保留中の設定にマージ
  pendingSettings = { ...pendingSettings, ...settings };
  
  // 既存のタイマーをクリア
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  
  // 新しいタイマーを設定
  saveDebounceTimer = setTimeout(() => {
    if (Object.keys(pendingSettings).length > 0) {
      chrome.storage.sync.set(pendingSettings, () => {
        if (chrome.runtime.lastError) {
          console.error('設定保存エラー:', chrome.runtime.lastError.message);
        } else {
          console.log('設定を保存しました:', Object.keys(pendingSettings));
        }
      });
      pendingSettings = {};
    }
  }, SAVE_DEBOUNCE_DELAY);
}

// applyToWebClass用のデバウンス変数
let applyDebounceTimer = null;
const APPLY_DEBOUNCE_DELAY = 300; // 300ms待ってから適用

/**
 * WebClassタブに設定を適用（デバウンス処理）
 */
function applyToWebClass() {
  // 既存のタイマーをクリア
  if (applyDebounceTimer) {
    clearTimeout(applyDebounceTimer);
  }
  
  applyDebounceTimer = setTimeout(() => {
    chrome.storage.sync.get(null, function(settings) {
      // 旧形式との互換性のためにselectedThemeも設定
      let selectedTheme = 'default';
      if (settings.baseTheme === 'dark') {
        selectedTheme = 'theme-dark';
      } else if (settings.colorPreset === 'green') {
        selectedTheme = 'theme-green';
      } else if (settings.colorPreset === 'red') {
        selectedTheme = 'theme-red';
      } else if (settings.colorPreset === 'purple') {
        selectedTheme = 'theme-purple';
      }
      
      // selectedThemeをpendingSettingsに追加（saveSettingsのデバウンスを利用）
      saveSettings({ selectedTheme });
      
      chrome.tabs.query({ url: "*://ed24lb.osaka-sandai.ac.jp/*" }, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'applyFullSettings',
            settings: {
              ...settings,
              selectedTheme
            }
          }, () => {
            // エラー無視
            if (chrome.runtime.lastError) {
              // タブが閉じられている場合などのエラーを無視
            }
          });
        });
      });
    });
  }, APPLY_DEBOUNCE_DELAY);
}
