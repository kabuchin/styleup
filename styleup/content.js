/**
 * StyleUp for WebClass
 * WebClassのインターフェースを改善するための拡張機能
 */

// ========================================
// 最速で実行：ちらつき防止のため同期的にテーマを適用
// ========================================
(function applyThemeImmediately() {
  // ローカルストレージからテーマをキャッシュとして読み込み（高速）
  const cachedTheme = localStorage.getItem('styleup-theme-cache');
  
  // ちらつき防止: 最初はopacity:0、スタイル適用後に表示
  const hidingStyle = document.createElement('style');
  hidingStyle.id = 'styleup-hiding-style';
  hidingStyle.textContent = `
    html:not(.styleup-ready) body {
      opacity: 0 !important;
      transition: opacity 0.05s ease-out;
    }
    html.styleup-ready body {
      opacity: 1 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(hidingStyle);
  
  if (cachedTheme && cachedTheme !== 'default') {
    document.documentElement.classList.add(cachedTheme);
    // bodyがない場合もあるため、存在確認
    if (document.body) {
      document.body.classList.add(cachedTheme);
    } else {
      // bodyが作成されたら即座にクラスを追加
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          document.body.classList.add(cachedTheme);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }
  
  // カスタムカラーをキャッシュから読み込んで即座に適用
  try {
    const cachedColors = localStorage.getItem('styleup-custom-colors');
    if (cachedColors) {
      const { mainColor, subColor, accentColor } = JSON.parse(cachedColors);
      const colorCSS = `
        :root {
          --custom-primary: ${mainColor};
          --custom-sub: ${subColor || mainColor};
          --custom-accent: ${accentColor || '#fbbc04'};
        }
      `;
      const colorStyle = document.createElement('style');
      colorStyle.id = 'styleup-cached-colors';
      colorStyle.textContent = colorCSS;
      (document.head || document.documentElement).appendChild(colorStyle);
    }
  } catch (e) {}
  
  // クリティカルCSSを即座に注入
  const criticalCSS = `
    :root {
      --primary-color: #1a73e8;
      --background-color: #ffffff;
      --text-color: #202124;
    }
    html.theme-dark, body.theme-dark {
      --primary-color: #8ab4f8;
      --background-color: #202124;
      --text-color: #e8eaed;
      background-color: #202124 !important;
      color: #e8eaed !important;
    }
    header .navbar.navbar-default { display: none !important; }
    .side-block-title-hidden, .side-block-content-hidden { display: none !important; }
  `;
  
  const style = document.createElement('style');
  style.id = 'styleup-instant-css';
  style.textContent = criticalCSS;
  (document.head || document.documentElement).appendChild(style);
  
  // DOMContentLoaded前でも可能な限り早く表示を有効化
  function showPage() {
    document.documentElement.classList.add('styleup-ready');
  }
  
  // スタイルシートの読み込み完了を待つか、タイムアウト後に表示
  if (document.readyState === 'loading') {
    // 最大100msまで待機、それ以降は強制表示
    const timeout = setTimeout(showPage, 100);
    document.addEventListener('DOMContentLoaded', () => {
      clearTimeout(timeout);
      // 少し遅延してスタイルが適用される時間を確保
      requestAnimationFrame(showPage);
    }, { once: true });
  } else {
    // すでにDOMが読み込まれている場合は即座に表示
    showPage();
  }
})();

// 時限と時間帯のマッピング
const PERIOD_TIME_MAPPING = {
  '1': { start: '9:00', end: '10:30' },
  '2': { start: '10:40', end: '12:10' },
  '3': { start: '12:50', end: '14:20' },
  '4': { start: '14:30', end: '16:00' },
  '5': { start: '16:10', end: '17:40' },
  '6': { start: '17:50', end: '19:20' },
  '7': { start: '19:30', end: '21:00' }
};

// 曜日の日本語表記と英語略称のマッピング
const DAY_MAPPING = {
  '月': 'mon', '火': 'tue', '水': 'wed', 
  '木': 'thu', '金': 'fri', '土': 'sat', '日': 'sun'
};

// テーマオプション
const THEME_OPTIONS = [
  { id: 'default', name: 'ブルー', previewClass: 'blue-preview' },
  { id: 'theme-green', name: 'グリーン', previewClass: 'green-preview' },
  { id: 'theme-red', name: 'レッド', previewClass: 'red-preview' },
  { id: 'theme-purple', name: 'パープル', previewClass: 'purple-preview' },
  { id: 'theme-dark', name: 'ダークモード', previewClass: 'dark-preview' }
];

// カラープリセット
const COLOR_PRESETS = {
  blue: { main: '#1a73e8', sub: '#4285f4', accent: '#fbbc04', name: 'ブルー' },
  green: { main: '#0f9d58', sub: '#34a853', accent: '#fbbc04', name: 'グリーン' },
  red: { main: '#d93025', sub: '#ea4335', accent: '#fbbc04', name: 'レッド' },
  purple: { main: '#673ab7', sub: '#9c27b0', accent: '#ff9800', name: 'パープル' },
  orange: { main: '#e65100', sub: '#ff6d00', accent: '#2979ff', name: 'オレンジ' },
  teal: { main: '#00796b', sub: '#009688', accent: '#ffab00', name: 'ティール' },
  pink: { main: '#c2185b', sub: '#e91e63', accent: '#7c4dff', name: 'ピンク' },
  indigo: { main: '#303f9f', sub: '#3f51b5', accent: '#ff5722', name: 'インディゴ' }
};

// 開講情報キャッシュのキー
const COURSE_SCHEDULE_CACHE_KEY = 'styleup-course-schedules';
const CACHE_EXPIRY_DAYS = 7; // キャッシュ有効期限（日）

/**
 * 開講情報管理機能
 */
// 開講情報のキャッシュを取得
function getCourseScheduleCache() {
  try {
    const cached = localStorage.getItem(COURSE_SCHEDULE_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // 有効期限チェック
      if (data.expiry && Date.now() < data.expiry) {
        return data.schedules || {};
      }
    }
  } catch (e) {
    console.error('開講情報キャッシュ読み込みエラー:', e);
  }
  return {};
}

// 開講情報をキャッシュに保存
function saveCourseScheduleCache(schedules) {
  try {
    const data = {
      schedules: schedules,
      expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem(COURSE_SCHEDULE_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('開講情報キャッシュ保存エラー:', e);
  }
}

// 開講情報から時間割をパース
// 例: "水曜日 4限, 水曜日 5限" → [{day: '水', period: '4'}, {day: '水', period: '5'}]
function parseScheduleText(scheduleText) {
  const schedules = [];
  if (!scheduleText) return schedules;
  
  // "水曜日 4限" のパターンにマッチ
  const pattern = /([月火水木金土日])曜日\s*(\d)限/g;
  let match;
  while ((match = pattern.exec(scheduleText)) !== null) {
    schedules.push({
      day: match[1],
      period: match[2]
    });
  }
  return schedules;
}

// コースIDから開講情報をフェッチ（非同期）
async function fetchCourseSchedule(courseId) {
  const cache = getCourseScheduleCache();
  
  // キャッシュにある場合はそれを返す
  if (cache[courseId]) {
    return cache[courseId];
  }
  
  try {
    const infoUrl = `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/info`;
    const response = await fetch(infoUrl, { credentials: 'include' });
    
    if (!response.ok) {
      console.warn(`開講情報取得失敗: ${courseId}`);
      return null;
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // dl-horizontal から時間割を探す
    const dlElements = doc.querySelectorAll('dl.dl-horizontal dt');
    let scheduleText = '';
    
    for (const dt of dlElements) {
      if (dt.textContent.trim() === '時間割') {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === 'DD') {
          scheduleText = dd.textContent.trim();
          break;
        }
      }
    }
    
    const schedules = parseScheduleText(scheduleText);
    
    if (schedules.length > 0) {
      // キャッシュに保存
      cache[courseId] = schedules;
      saveCourseScheduleCache(cache);
      console.log(`開講情報をキャッシュ: ${courseId}`, schedules);
    }
    
    return schedules;
  } catch (e) {
    console.error(`開講情報フェッチエラー: ${courseId}`, e);
    return null;
  }
}

// 科目リンクのURLからコースIDを抽出
function extractCourseIdFromUrl(url) {
  const match = url.match(/\/course\.php\/([^/]+)/);
  return match ? match[1] : null;
}

// 時間割テキストを生成（例: "水4, 水5"）
function formatScheduleDisplay(schedules) {
  if (!schedules || schedules.length === 0) return '';
  return schedules.map(s => `${s.day}${s.period}`).join(', ');
}

// 「他」がマークされた時間割バッジを非同期で更新
async function updatePendingScheduleBadges() {
  const pendingBadges = document.querySelectorAll('.course-time-badge[data-needs-schedule-fetch="true"]');
  
  if (pendingBadges.length === 0) return;
  
  console.log(`スケジュール取得が必要なバッジ: ${pendingBadges.length}件`);
  
  const dayMap = {
    '月': 'day-mon',
    '火': 'day-tue',
    '水': 'day-wed',
    '木': 'day-thu',
    '金': 'day-fri',
    '土': 'day-sat',
    '日': 'day-sun'
  };
  
  for (const badge of pendingBadges) {
    const courseUrl = badge.dataset.courseUrl;
    if (!courseUrl) continue;
    
    const courseId = extractCourseIdFromUrl(courseUrl);
    if (!courseId) continue;
    
    try {
      const schedules = await fetchCourseSchedule(courseId);
      
      if (schedules && schedules.length > 0) {
        // 完全なスケジュールで表示を更新
        const displayText = schedules.map(s => `${s.day}${s.period}限`).join(', ');
        badge.textContent = displayText;
        
        // 既存の曜日クラスを削除
        Object.values(dayMap).forEach(cls => badge.classList.remove(cls));
        
        // 複数の曜日がある場合は最初の曜日のクラスを適用
        if (schedules[0] && dayMap[schedules[0].day]) {
          badge.classList.add(dayMap[schedules[0].day]);
        }
        
        // 複数時限の場合は専用クラスを追加
        if (schedules.length > 1) {
          badge.classList.add('multiple-periods');
        }
        
        // フェッチ完了マーカーを更新
        badge.classList.remove('schedule-pending');
        badge.removeAttribute('data-needs-schedule-fetch');
        
        console.log(`スケジュール更新完了: ${courseId} → ${displayText}`);
      }
    } catch (e) {
      console.error(`スケジュール更新エラー: ${courseId}`, e);
    }
  }
}

/**
 * ユーティリティ関数
 */
// ページ種別判定関数
function getPageType() {
  const path = window.location.pathname;
  const url = window.location.href;

  if (url.includes('/webclass/login.php')) {
    return 'login';
  } else if (url.includes('/webclass/course.php/')) {
    // コースIDを抽出
    const urlMatch = path.match(/\/webclass\/course\.php\/([^/]+)/);
    const courseId = urlMatch && urlMatch[1] ? urlMatch[1] : null;
    return { type: 'course', courseId };
  } else if (
    path === '/webclass/' || 
    path.endsWith('/webclass') || 
    path === '/webclass' || 
    path === '/webclass/index.php/' || 
    path.endsWith('/webclass/index.php')
  ) {
    return 'home';
  } else if (path.includes('/webclass/ip_mods.php/plugin/score_summary_table')) {
    return 'dashboard';
  } else if (path.includes('/webclass/eportfolio.php')) {
    return 'portfolio';
  } else if (path.includes('/webclass/msg_editor.php')) {
    return 'mail';
  } else {
    // 他のページタイプも特定できるように拡張
    if (path.includes('/webclass/')) {
      return 'webclass-other';  // WebClass配下の他ページ
    }
    return 'other';
  }
}

// リダイレクト処理を行う関数
function redirectToWebClass() {
  // トップページからwebclassサブディレクトリへリダイレクト
  if (window.location.href === "https://ed24lb.osaka-sandai.ac.jp/" || 
      window.location.href === "https://ed24lb.osaka-sandai.ac.jp") {
    console.log('WebClassのメインページへリダイレクトします');
    window.location.href = "https://ed24lb.osaka-sandai.ac.jp/webclass/";
  }
}

// CSS selectors cannot use :contains(), so we add data attributes to match elements
function addDataContentAttributes() {
  // サイドブロックのタイトル要素を取得
  const sideBlockTitles = document.querySelectorAll('.side-block-title, h4.side-block-title, .side-block-outer h4');
  
  sideBlockTitles.forEach(titleElement => {
    if (!titleElement.textContent) return;
    
    // data-content属性を追加してテキスト内容に基づいた選択を可能にする
    titleElement.setAttribute('data-content', titleElement.textContent.trim());
    
    // 「リンク」または「課題実施状況一覧」ブロックを非表示化
    if (titleElement.textContent.includes('リンク') || 
        titleElement.textContent.includes('課題実施状況一覧')) {
      titleElement.classList.add('side-block-title-hidden');
      
      // 対応するコンテンツも非表示
      let contentElement = titleElement.nextElementSibling;
      while(contentElement && 
            (contentElement.classList.contains('side-block-content') || 
            contentElement.classList.contains('side-block-outer'))) {
        contentElement.classList.add('side-block-content-hidden');
        contentElement = contentElement.nextElementSibling;
      }
    }
  });
}

// マテリアルアイコンとGoogle Fontsを読み込む関数
function loadFonts() {
  const head = document.head;
  
  // 既に読み込まれている場合はスキップ（パフォーマンス向上）
  if (document.querySelector('link[href*="fonts.googleapis.com/icon"]') || 
      document.querySelector('link[href*="fonts.googleapis.com/css2"]')) {
    return;
  }
  
  // マテリアルアイコンとRobotoフォントを一度に読み込み（HTTP接続を節約）
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Icons&family=Roboto:wght@300;400;500;700&display=swap';
  fontLink.setAttribute('media', 'print');
  fontLink.setAttribute('onload', "this.media='all'");  // 非ブロッキングロード
  head.appendChild(fontLink);
}

/**
 * テーマ管理機能
 */
// デバウンス用の変数
let themeDebounceTimer = null;
const THEME_DEBOUNCE_DELAY = 500; // 500ms待ってから保存

// テーマを設定する関数
function setTheme(themeId) {
  // 現在のテーマクラスをすべて削除
  document.body.classList.remove('theme-green', 'theme-red', 'theme-purple', 'theme-dark');
  document.documentElement.classList.remove('theme-green', 'theme-red', 'theme-purple', 'theme-dark');
  
  // デフォルト以外のテーマの場合は、対応するクラスを追加
  if (themeId !== 'default') {
    document.body.classList.add(themeId);
    document.documentElement.classList.add(themeId);
  }
  
  // ローカルストレージにキャッシュ保存（次回アクセス時の高速化）
  try {
    localStorage.setItem('styleup-theme-cache', themeId);
  } catch (e) {
    // ローカルストレージが使えない場合は無視
  }
  
  // テーマIDをChromeストレージに保存（デバウンス処理）
  // MAX_WRITE_OPERATIONS_PER_MINUTE エラーを防ぐ
  if (themeDebounceTimer) {
    clearTimeout(themeDebounceTimer);
  }
  
  themeDebounceTimer = setTimeout(() => {
    chrome.storage.sync.set({ 'selectedTheme': themeId }, function() {
      if (chrome.runtime.lastError) {
        console.error('Theme save error:', chrome.runtime.lastError.message);
      } else {
        console.log('Theme saved: ' + themeId);
      }
    });
  }, THEME_DEBOUNCE_DELAY);
  
  // iframe内のコンテンツにもテーマを適用
  applyThemeToFrames();
}

// フレームやiframeにもテーマを適用する関数
function applyThemeToFrames() {
  // 現在のテーマを取得
  const isDarkMode = document.body.classList.contains('theme-dark');
  const isGreen = document.body.classList.contains('theme-green');
  const isRed = document.body.classList.contains('theme-red');
  const isPurple = document.body.classList.contains('theme-purple');
  
  // 利用可能なすべてのiframeに適用
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc.body) {
        // テーマクラスをクリア
        iframeDoc.body.classList.remove('theme-dark', 'theme-green', 'theme-red', 'theme-purple');
        
        // 現在のテーマを適用
        if (isDarkMode) iframeDoc.body.classList.add('theme-dark');
        if (isGreen) iframeDoc.body.classList.add('theme-green');
        if (isRed) iframeDoc.body.classList.add('theme-red');
        if (isPurple) iframeDoc.body.classList.add('theme-purple');
      }
    } catch (e) {
      // 同一生成元ポリシーによりアクセスできないiframeは無視
    }
  });
  
  // フレームセットにも対応（可能な場合）
  try {
    const frames = window.frames;
    if (frames && frames.length) {
      for (let i = 0; i < frames.length; i++) {
        try {
          const frameDoc = frames[i].document;
          if (frameDoc && frameDoc.body) {
            // テーマクラスをクリア
            frameDoc.body.classList.remove('theme-dark', 'theme-green', 'theme-red', 'theme-purple');
            
            // 現在のテーマを適用
            if (isDarkMode) frameDoc.body.classList.add('theme-dark');
            if (isGreen) frameDoc.body.classList.add('theme-green');
            if (isRed) frameDoc.body.classList.add('theme-red');
            if (isPurple) frameDoc.body.classList.add('theme-purple');
          }
        } catch (e) {
          // クロスオリジンの制限でアクセスできないフレームは無視
        }
      }
    }
  } catch (e) {
    // フレームへのアクセスエラーを無視
  }
}

/**
 * 完全な設定を適用（新UI対応）
 */
function applyFullSettings(settings) {
  console.log('完全な設定を適用:', settings);
  
  // ベーステーマ適用
  if (settings.baseTheme === 'dark') {
    setTheme('theme-dark');
  } else if (settings.selectedTheme) {
    setTheme(settings.selectedTheme);
  } else {
    setTheme('default');
  }
  
  // カスタムカラー適用
  applyCustomColors(settings.mainColor, settings.subColor, settings.accentColor);
  
  // 曜日タグスタイル適用
  applyDayTagStyle(settings.dayTagStyle, settings.dayColors);
  
  // アニメーション設定
  if (settings.enableAnimations === false) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
  
  // ぼかし効果設定
  if (settings.enableBlur === false) {
    document.body.classList.add('no-blur');
  } else {
    document.body.classList.remove('no-blur');
  }
  
  // フォントサイズ
  if (settings.courseFontSize) {
    applyCourseFontSize(settings.courseFontSize);
  }
  
  // グローバル設定更新
  window.styleupSettings = {
    ...(window.styleupSettings || {}),
    ...settings
  };
}

/**
 * カスタムカラーを適用
 */
function applyCustomColors(mainColor, subColor, accentColor) {
  if (!mainColor) return;
  
  // 動的スタイル要素を取得または作成
  let styleEl = document.getElementById('styleup-custom-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'styleup-custom-colors';
    document.head.appendChild(styleEl);
  }
  
  // サブカラーとアクセントカラーのデフォルト値
  const sub = subColor || mainColor;
  const accent = accentColor || '#fbbc04';
  
  // 明るい色かどうかを判定（テキスト色を決定するため）
  function isLightColor(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  }
  
  const textOnMain = isLightColor(mainColor) ? '#202124' : '#ffffff';
  const textOnSub = isLightColor(sub) ? '#202124' : '#ffffff';
  
  const css = `
    :root {
      --custom-primary: ${mainColor};
      --custom-sub: ${sub};
      --custom-accent: ${accent};
      --custom-text-on-primary: ${textOnMain};
      --custom-text-on-sub: ${textOnSub};
    }
    
    /* ========================================
       ヘッダー・ナビゲーション
       ======================================== */
    .custom-header {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
    }
    
    .custom-header .logo {
      color: ${textOnMain} !important;
    }
    
    .custom-header .main-menu a {
      color: ${textOnMain} !important;
      opacity: 0.9;
    }
    
    .custom-header .main-menu a:hover {
      background-color: rgba(255,255,255,0.15) !important;
      color: ${textOnMain} !important;
      opacity: 1;
    }
    
    .custom-header .main-menu a.active {
      background-color: rgba(255,255,255,0.2) !important;
    }
    
    .custom-header .header-icon {
      color: ${textOnMain} !important;
      opacity: 0.9;
    }
    
    .custom-header .header-icon:hover {
      background-color: rgba(255,255,255,0.15) !important;
      opacity: 1;
    }
    
    .custom-header .user-info span {
      color: ${textOnMain} !important;
    }
    
    /* ========================================
       コースリスト・タイトル
       ======================================== */
    .courseTree-levelTitle,
    .registered-courses .courseTree-levelTitle {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
      color: ${textOnMain} !important;
    }
    
    /* ========================================
       リンク・ホバー効果
       ======================================== */
    a {
      color: ${mainColor};
    }
    
    a:hover {
      color: ${sub} !important;
    }
    
    .course-name-highlight {
      color: ${mainColor} !important;
    }
    
    .course-name-highlight:hover {
      color: ${sub} !important;
    }
    
    /* ========================================
       ボタン・入力要素
       ======================================== */
    .btn-primary,
    .styleup-time-badge,
    input[type="submit"]:not(.form-cancel),
    button.btn-primary,
    input.btn-primary {
      background-color: ${mainColor} !important;
      border-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    .btn-primary:hover,
    .styleup-time-badge:hover,
    input[type="submit"]:not(.form-cancel):hover {
      background-color: ${sub} !important;
      border-color: ${sub} !important;
    }
    
    /* ========================================
       WebClass固有要素
       ======================================== */
    /* ページタイトル (h1.pkgtitle.bgc_main) */
    h1.pkgtitle,
    h1.pkgtitle.bgc_main,
    .pkgtitle.bgc_main {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
      color: ${textOnMain} !important;
      border: none !important;
    }
    
    /* bgc_main クラス全般 */
    .bgc_main,
    dt.bgc_main {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    /* ナビゲーション */
    .navi dt.bgc_main {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    /* タブ・アクティブ状態 */
    .tab-active,
    .active-tab,
    li.active > a {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    /* フォーカス・選択状態 */
    input:focus,
    textarea:focus,
    select:focus {
      border-color: ${mainColor} !important;
      box-shadow: 0 0 0 3px rgba(${hexToRgb(mainColor)}, 0.15) !important;
    }
    
    /* 選択されたアイテム */
    .selected,
    tr.selected,
    .item-selected {
      background-color: rgba(${hexToRgb(mainColor)}, 0.1) !important;
    }
    
    /* ========================================
       ダークモード時の調整
       ======================================== */
    body.theme-dark .custom-header {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
    }
    
    body.theme-dark a {
      color: ${sub};
    }
    
    body.theme-dark a:hover {
      color: ${mainColor} !important;
    }
    
    body.theme-dark h1.pkgtitle,
    body.theme-dark h1.pkgtitle.bgc_main,
    body.theme-dark .pkgtitle.bgc_main {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
      color: ${textOnMain} !important;
    }
    
    body.theme-dark .bgc_main,
    body.theme-dark dt.bgc_main {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    body.theme-dark .navi dt.bgc_main {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    body.theme-dark .navi dd a {
      color: ${sub} !important;
    }
    
    body.theme-dark .navi dd a:hover {
      color: ${mainColor} !important;
    }
    
    body.theme-dark .courseTree-levelTitle,
    body.theme-dark .registered-courses .courseTree-levelTitle {
      background: linear-gradient(135deg, ${mainColor}, ${sub}) !important;
      color: ${textOnMain} !important;
    }
    
    body.theme-dark .btn-primary,
    body.theme-dark input[type="submit"]:not(.form-cancel) {
      background-color: ${mainColor} !important;
      border-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    body.theme-dark .btn-primary:hover,
    body.theme-dark input[type="submit"]:not(.form-cancel):hover {
      background-color: ${sub} !important;
    }
    
    /* ドロップダウンメニューのアクティブ状態 */
    body.theme-dark .header-dropdown-menu li button:hover {
      background-color: ${mainColor} !important;
      color: ${textOnMain} !important;
    }
    
    /* 今日の授業ハイライト */
    .today-class {
      border-left-color: ${mainColor} !important;
    }
    
    body.theme-dark .today-class {
      border-left-color: ${sub} !important;
      background-color: rgba(${hexToRgb(mainColor)}, 0.1) !important;
    }
  `;
  
  styleEl.textContent = css;
  
  // ローカルストレージにも保存（高速読み込み用）
  try {
    localStorage.setItem('styleup-custom-colors', JSON.stringify({ mainColor, subColor, accentColor }));
  } catch (e) {}
}

// HEX色をRGB文字列に変換するヘルパー関数
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '26, 115, 232';
}

/**
 * 曜日タグスタイルを適用
 */
function applyDayTagStyle(style, dayColors) {
  if (!style) style = 'colorful';
  
  // 動的スタイル要素を取得または作成
  let styleEl = document.getElementById('styleup-day-tag-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'styleup-day-tag-styles';
    document.head.appendChild(styleEl);
  }
  
  // デフォルトの曜日カラー
  const colors = {
    mon: dayColors?.mon || '#ef5350',
    tue: dayColors?.tue || '#ff9800',
    wed: dayColors?.wed || '#4caf50',
    thu: dayColors?.thu || '#2196f3',
    fri: dayColors?.fri || '#9c27b0',
    sat: dayColors?.sat || '#00bcd4',
    sun: dayColors?.sun || '#ff5722'
  };
  
  let css = '';
  
  switch (style) {
    case 'colorful':
      css = `
        .course-time-badge.day-mon { background-color: ${colors.mon} !important; color: white !important; }
        .course-time-badge.day-tue { background-color: ${colors.tue} !important; color: white !important; }
        .course-time-badge.day-wed { background-color: ${colors.wed} !important; color: white !important; }
        .course-time-badge.day-thu { background-color: ${colors.thu} !important; color: white !important; }
        .course-time-badge.day-fri { background-color: ${colors.fri} !important; color: white !important; }
        .course-time-badge.day-sat { background-color: ${colors.sat} !important; color: white !important; }
        .course-time-badge.day-sun { background-color: ${colors.sun} !important; color: white !important; }
      `;
      break;
      
    case 'monotone':
      css = `
        .course-time-badge.day-mon,
        .course-time-badge.day-tue,
        .course-time-badge.day-wed,
        .course-time-badge.day-thu,
        .course-time-badge.day-fri { background-color: #616161 !important; color: white !important; }
        .course-time-badge.day-sat { background-color: #424242 !important; color: white !important; }
        .course-time-badge.day-sun { background-color: #757575 !important; color: white !important; }
        
        body.theme-dark .course-time-badge.day-mon,
        body.theme-dark .course-time-badge.day-tue,
        body.theme-dark .course-time-badge.day-wed,
        body.theme-dark .course-time-badge.day-thu,
        body.theme-dark .course-time-badge.day-fri { background-color: #9e9e9e !important; color: #212121 !important; }
        body.theme-dark .course-time-badge.day-sat { background-color: #757575 !important; color: white !important; }
        body.theme-dark .course-time-badge.day-sun { background-color: #bdbdbd !important; color: #212121 !important; }
      `;
      break;
      
    case 'single':
      const mainColor = window.styleupSettings?.mainColor || '#1a73e8';
      css = `
        .course-time-badge.day-mon,
        .course-time-badge.day-tue,
        .course-time-badge.day-wed,
        .course-time-badge.day-thu,
        .course-time-badge.day-fri,
        .course-time-badge.day-sat,
        .course-time-badge.day-sun { 
          background-color: ${mainColor} !important; 
          color: white !important; 
        }
      `;
      break;
      
    case 'gradient':
      const gradMain = window.styleupSettings?.mainColor || '#1a73e8';
      const gradSub = window.styleupSettings?.subColor || '#4285f4';
      css = `
        .course-time-badge.day-mon,
        .course-time-badge.day-tue,
        .course-time-badge.day-wed,
        .course-time-badge.day-thu,
        .course-time-badge.day-fri,
        .course-time-badge.day-sat,
        .course-time-badge.day-sun { 
          background: linear-gradient(135deg, ${gradMain}, ${gradSub}) !important; 
          color: white !important; 
        }
      `;
      break;
      
    case 'outline':
      css = `
        .course-time-badge.day-mon { background: transparent !important; border: 2px solid ${colors.mon} !important; color: ${colors.mon} !important; }
        .course-time-badge.day-tue { background: transparent !important; border: 2px solid ${colors.tue} !important; color: ${colors.tue} !important; }
        .course-time-badge.day-wed { background: transparent !important; border: 2px solid ${colors.wed} !important; color: ${colors.wed} !important; }
        .course-time-badge.day-thu { background: transparent !important; border: 2px solid ${colors.thu} !important; color: ${colors.thu} !important; }
        .course-time-badge.day-fri { background: transparent !important; border: 2px solid ${colors.fri} !important; color: ${colors.fri} !important; }
        .course-time-badge.day-sat { background: transparent !important; border: 2px solid ${colors.sat} !important; color: ${colors.sat} !important; }
        .course-time-badge.day-sun { background: transparent !important; border: 2px solid ${colors.sun} !important; color: ${colors.sun} !important; }
      `;
      break;
  }
  
  styleEl.textContent = css;
  
  // ローカルストレージにも保存
  try {
    localStorage.setItem('styleup-day-tag-style', JSON.stringify({ style, dayColors: colors }));
  } catch (e) {}
}

// 保存されたテーマを読み込む関数
function loadSavedTheme() {
  chrome.storage.sync.get('selectedTheme', function(data) {
    if (data.selectedTheme) {
      setTheme(data.selectedTheme);
      console.log('保存されたテーマを適用しました: ' + data.selectedTheme);
    }
    
    // iframe内のコンテンツにもテーマを適用
    setTimeout(applyThemeToFrames, 500);
  });
}

// 保存された設定を読み込む関数
function loadSettings() {
  chrome.storage.sync.get({
    'selectedTheme': 'default',
    'autoScroll': true,
    'courseFontSize': 14,
    'baseTheme': 'light',
    'mainColor': '#1a73e8',
    'subColor': '#4285f4',
    'accentColor': '#fbbc04',
    'dayTagStyle': 'colorful',
    'dayColors': {
      mon: '#ef5350',
      tue: '#ff9800',
      wed: '#4caf50',
      thu: '#2196f3',
      fri: '#9c27b0',
      sat: '#00bcd4',
      sun: '#ff5722'
    },
    'enableAnimations': true,
    'enableBlur': true
  }, function(data) {
    // テーマを適用
    if (data.baseTheme === 'dark') {
      setTheme('theme-dark');
    } else if (data.selectedTheme) {
      setTheme(data.selectedTheme);
    }
    
    // カスタムカラーを適用
    applyCustomColors(data.mainColor, data.subColor, data.accentColor);
    
    // 曜日タグスタイルを適用
    applyDayTagStyle(data.dayTagStyle, data.dayColors);
    
    // アニメーション設定
    if (data.enableAnimations === false) {
      document.body.classList.add('no-animations');
    }
    
    // ぼかし効果設定
    if (data.enableBlur === false) {
      document.body.classList.add('no-blur');
    }
    
    // 自動スクロール設定を保存
    window.styleupSettings = {
      autoScroll: data.autoScroll,
      courseFontSize: data.courseFontSize,
      mainColor: data.mainColor,
      subColor: data.subColor,
      accentColor: data.accentColor,
      dayTagStyle: data.dayTagStyle,
      dayColors: data.dayColors
    };
    
    console.log('設定を読み込みました:', window.styleupSettings);
    
    // フォントサイズを適用
    applyCourseFontSize(data.courseFontSize);
  });
}

// 科目名のフォントサイズを適用する関数
function applyCourseFontSize(fontSize) {
  // CSSカスタムプロパティを設定
  document.documentElement.style.setProperty('--course-title-font-size', fontSize + 'px');
  console.log('科目名フォントサイズを変更しました:', fontSize + 'px');
}

/**
 * ヘッダーコンポーネント生成関数
 */
// ロゴを生成する関数
function createLogo() {
  const logoLink = document.createElement('a');
  logoLink.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
  logoLink.className = 'logo';
  logoLink.textContent = 'WebClass';
  return logoLink;
}

// メインメニューを生成する関数
function createMainMenu() {
  const pageType = getPageType();
  const mainMenu = document.createElement('ul');
  mainMenu.className = 'main-menu';
  
  let menuItems;
  
  if (pageType.type === 'course' && pageType.courseId) {
    // コースページの場合のメニュー項目
    menuItems = createCourseMenuItems(pageType.courseId);
  } else {
    // 通常ページの場合のメニュー項目
    menuItems = createStandardMenuItems();
  }
  
  const fragment = new DocumentFragment();
  
  menuItems.forEach(item => {
    const li = document.createElement('li');
    
    if (item.isDropdown) {
      appendDropdownMenu(li, item);
    } else if (item.icon) {
      appendIconMenu(li, item);
    } else {
      appendTextMenu(li, item);
    }
    
    fragment.appendChild(li);
  });
  
  mainMenu.appendChild(fragment);
  return mainMenu;
}

// コースページ用メニュー項目を生成
function createCourseMenuItems(courseId) {
  return [
    { text: '教材', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/` },
    { text: 'レポート', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/my-reports` },
    { 
      text: '成績', 
      isDropdown: true,
      items: [
        { text: '集計', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/scores` },
        { text: '出題分野ごとの集計', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/area-score` },
        { text: 'テスト結果', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/reslt_frame.php` },
        { text: 'e ポートフォリオ・評価分析', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/eportfolio.php/assessments/view_personal_summary_sheet` },
        { text: 'SCORM教材の成績一覧', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/#scorm-report`, isModal: true }
      ]
    },
    { text: '出席', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/attendance` },
    { 
      text: 'その他', 
      isDropdown: true,
      items: [
        { text: '学習カルテ', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/#carte`, isModal: true },
        { text: 'ノート', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/my-note/` },
        { text: '開講情報', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/info` },
        { text: 'アクセスログ', url: `https://ed24lb.osaka-sandai.ac.jp/webclass/course.php/${courseId}/access-log` }
      ]
    }
  ];
}

// 標準ページ用メニュー項目を生成
function createStandardMenuItems() {
  return [
    { text: '講義', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/index.php/' },
    { text: '科目', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/index.php/courses/' },
    { text: 'ダッシュボード', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/ip_mods.php/plugin/score_summary_table/dashboard' },
    { text: 'ポートフォリオ', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/eportfolio.php/showcases/' }
  ];
}

// ドロップダウンメニューの追加
function appendDropdownMenu(li, item) {
  li.className = 'dropdown-container';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'dropdown-toggle';
  toggleBtn.innerHTML = `${item.text} <span class="material-icons">arrow_drop_down</span>`;
  
  const dropdown = document.createElement('ul');
  dropdown.className = 'dropdown-menu';
  
  // ドロップダウン項目を追加
  const dropdownFragment = new DocumentFragment();
  item.items.forEach(subItem => {
    const subLi = document.createElement('li');
    const subLink = document.createElement('a');
    subLink.href = subItem.url;
    subLink.textContent = subItem.text;
    
    // モーダル表示が必要なリンクの場合
    if (subItem.isModal) {
      subLink.className = 'showCourseLearningLayoutModalButton';
      setupModalLinkHandler(subLink, subItem.url);
    }
    
    subLi.appendChild(subLink);
    dropdownFragment.appendChild(subLi);
  });
  
  dropdown.appendChild(dropdownFragment);
  
  // トグルボタンのクリックイベント
  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    dropdown.classList.toggle('active');
    
    // 他のドロップダウンメニューを閉じる
    document.querySelectorAll('.main-menu .dropdown-menu.active').forEach(menu => {
      if (menu !== dropdown) {
        menu.classList.remove('active');
      }
    });
  });
  
  li.appendChild(toggleBtn);
  li.appendChild(dropdown);
}

// モーダルリンクのクリックハンドラをセットアップ
function setupModalLinkHandler(link, url) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const modalId = url.split('#')[1];
    if (!modalId) return;
    
    if (typeof showCourseLearningLayoutModal === 'function') {
      showCourseLearningLayoutModal('#' + modalId);
    } else {
      openModalManually(modalId);
    }
  });
}

// モーダルを手動でオープンする関数
function openModalManually(modalId) {
  const modal = document.getElementById('courseLearningLayoutModal');
  if (!modal) return;
  
  const modalTitle = modal.querySelector('.modal-title');
  const modalFrame = modal.querySelector('.modal-body-frame');
  
  const targetListScript = document.getElementById('courseLearningLayoutModalTargetList');
  if (!targetListScript) return;
  
  try {
    const targetList = JSON.parse(targetListScript.textContent);
    const target = targetList.find(t => t.modal_id === modalId);
    if (!target) return;
    
    if (modalTitle) modalTitle.textContent = target.label;
    if (modalFrame) modalFrame.src = target.url;
    
    if (window.jQuery) {
      window.jQuery(modal).modal('show');
    } else {
      // VanillaJSでモーダル表示
      modal.style.display = 'block';
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      
      createModalBackdrop();
      setupModalCloseHandlers(modal);
    }
  } catch (error) {
    console.error('モーダルターゲット解析エラー:', error);
  }
}

// モーダル背景を作成
function createModalBackdrop() {
  let modalBackdrop = document.querySelector('.modal-backdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(modalBackdrop);
  } else {
    modalBackdrop.classList.add('show');
  }
}

// モーダルを閉じるハンドラをセットアップ
function setupModalCloseHandlers(modal) {
  const closeButtons = modal.querySelectorAll('.close, .btn-close');
  closeButtons.forEach(btn => {
    btn.onclick = function() {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      document.querySelector('.modal-backdrop')?.remove();
    };
  });
}

// アイコンメニューの追加
function appendIconMenu(li, item) {
  const a = document.createElement('a');
  a.href = item.url;
  a.className = 'menu-icon';
  a.title = item.title || '';
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'material-icons';
  iconSpan.textContent = item.icon;
  
  a.appendChild(iconSpan);
  
  // 現在のページと一致する場合、activeクラスを追加
  if (isActiveMenuLink(item)) {
    a.classList.add('active');
  }
  
  li.appendChild(a);
}

// テキストメニューの追加
function appendTextMenu(li, item) {
  const a = document.createElement('a');
  a.href = item.url;
  a.textContent = item.text;
  
  if (isActiveMenuLink(item)) {
    a.classList.add('active');
  }
  
  if (item.target) {
    a.target = item.target;
  }
  
  li.appendChild(a);
}

// メニューリンクがアクティブかどうか判定
function isActiveMenuLink(item) {
  try {
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    const itemURL = new URL(item.url);
    const itemPath = itemURL.pathname;
    
    // アイコンメニューの場合
    if (item.icon === 'email' && currentPath.includes('/msg_editor.php')) {
      return true;
    }
    
    // テキストメニューの場合
    if (item.text) {
      if (currentPath === itemPath) return true;
      
      if (item.text === '科目' && currentPath.includes('/index.php/courses')) return true;
      if (item.text === 'ダッシュボード' && currentPath.includes('/ip_mods.php/plugin/score_summary_table')) return true;
      if (item.text === 'ポートフォリオ' && currentPath.includes('/eportfolio.php')) return true;
      if (item.text === 'メール' && currentPath.includes('/msg_editor.php')) return true;
      
      if (item.text === '講義' && (
        currentPath === '/webclass/' || 
        currentPath === '/webclass' ||
        currentPath.endsWith('/webclass/index.php') || 
        currentPath.endsWith('/webclass/index.php/')
      )) {
        return true;
      }
    }
  } catch (e) {
    console.log('URL解析エラー:', e);
  }
  
  return false;
}

// 共通ヘッダーアイコン生成関数
function createHeaderIcon(iconName, title, href) {
  const icon = document.createElement('a');
  icon.href = href;
  icon.className = 'header-icon';
  icon.title = title;
  icon.innerHTML = `<span class="material-icons">${iconName}</span>`;
  return icon;
}

// テーマスイッチャーを生成（新UI対応）
function createThemeSwitcher() {
  // コンテナ作成
  const container = document.createElement('div');
  container.className = 'header-dropdown';
  
  // アイコンボタン作成
  const button = document.createElement('a');
  button.href = 'javascript:void(0);';
  button.className = 'header-icon';
  button.title = 'テーマ設定';
  button.innerHTML = '<span class="material-icons">palette</span>';
  
  // ドロップダウンメニュー作成
  const menu = document.createElement('ul');
  menu.className = 'header-dropdown-menu theme-menu';
  
  // クリックイベント
  button.addEventListener('click', function(e) {
    e.preventDefault();
    menu.classList.toggle('active');
    
    // 他のドロップダウンを閉じる
    document.querySelectorAll('.header-dropdown-menu.active').forEach(m => {
      if (m !== menu) m.classList.remove('active');
    });
  });
  
  // ダークモードトグル
  const darkModeLi = document.createElement('li');
  darkModeLi.className = 'theme-toggle-item';
  const darkModeBtn = document.createElement('button');
  darkModeBtn.className = 'theme-toggle-btn';
  
  const updateDarkModeBtn = () => {
    const isDark = document.body.classList.contains('theme-dark');
    darkModeBtn.innerHTML = `
      <span class="material-icons">${isDark ? 'light_mode' : 'dark_mode'}</span>
      <span>${isDark ? 'ライトモード' : 'ダークモード'}</span>
    `;
  };
  updateDarkModeBtn();
  
  darkModeBtn.onclick = function() {
    const isDark = document.body.classList.contains('theme-dark');
    if (isDark) {
      setTheme('default');
      chrome.storage.sync.set({ baseTheme: 'light' });
    } else {
      setTheme('theme-dark');
      chrome.storage.sync.set({ baseTheme: 'dark' });
    }
    updateDarkModeBtn();
  };
  
  darkModeLi.appendChild(darkModeBtn);
  menu.appendChild(darkModeLi);
  
  // 区切り線
  const separator = document.createElement('li');
  separator.className = 'menu-separator';
  menu.appendChild(separator);
  
  // クイックカラー選択
  const colorLi = document.createElement('li');
  colorLi.className = 'quick-colors-item';
  const colorLabel = document.createElement('span');
  colorLabel.className = 'quick-colors-label';
  colorLabel.textContent = 'クイックカラー';
  colorLi.appendChild(colorLabel);
  
  const colorGrid = document.createElement('div');
  colorGrid.className = 'quick-color-grid';
  
  const quickColors = [
    { main: '#1a73e8', sub: '#4285f4', name: 'ブルー' },
    { main: '#0f9d58', sub: '#34a853', name: 'グリーン' },
    { main: '#d93025', sub: '#ea4335', name: 'レッド' },
    { main: '#673ab7', sub: '#9c27b0', name: 'パープル' },
    { main: '#f57c00', sub: '#ff9800', name: 'オレンジ' },
    { main: '#00796b', sub: '#009688', name: 'ティール' },
    { main: '#c2185b', sub: '#e91e63', name: 'ピンク' },
    { main: '#303f9f', sub: '#3f51b5', name: 'インディゴ' }
  ];
  
  quickColors.forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.className = 'quick-color-btn';
    colorBtn.title = color.name;
    colorBtn.style.background = `linear-gradient(135deg, ${color.main} 50%, ${color.sub} 50%)`;
    
    colorBtn.onclick = function() {
      applyCustomColors(color.main, color.sub, '#fbbc04');
      chrome.storage.sync.set({
        mainColor: color.main,
        subColor: color.sub,
        colorPreset: color.name.toLowerCase()
      });
      menu.classList.remove('active');
    };
    
    colorGrid.appendChild(colorBtn);
  });
  
  colorLi.appendChild(colorGrid);
  menu.appendChild(colorLi);
  
  // 区切り線
  const separator2 = document.createElement('li');
  separator2.className = 'menu-separator';
  menu.appendChild(separator2);
  
  // 詳細設定へのリンク
  const settingsLi = document.createElement('li');
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'settings-link-btn';
  settingsBtn.innerHTML = `
    <span class="material-icons">settings</span>
    <span>詳細設定（拡張機能）</span>
  `;
  settingsBtn.onclick = function() {
    // 拡張機能のポップアップを開くようにユーザーに案内
    alert('拡張機能アイコンをクリックして、詳細なテーマ設定を行ってください。\\n\\nカスタムカラーや曜日タグスタイルなど、より詳細な設定が可能です。');
    menu.classList.remove('active');
  };
  settingsLi.appendChild(settingsBtn);
  menu.appendChild(settingsLi);
  
  // 組み立て
  container.appendChild(button);
  container.appendChild(menu);
  return container;
}

// ヘルプドロップダウンを生成（シンプル化）
function createHelpDropdown() {
  // コンテナ作成
  const container = document.createElement('div');
  container.className = 'header-dropdown';
  
  // アイコンボタン作成
  const button = document.createElement('a');
  button.href = 'javascript:void(0);';
  button.className = 'header-icon';
  button.title = 'ヘルプ';
  button.innerHTML = '<span class="material-icons">help_outline</span>';
  
  // ドロップダウンメニュー作成
  const menu = document.createElement('ul');
  menu.className = 'header-dropdown-menu';
  
  // クリックイベント
  button.addEventListener('click', function(e) {
    e.preventDefault();
    menu.classList.toggle('active');
    
    // 他のドロップダウンを閉じる
    document.querySelectorAll('.header-dropdown-menu.active').forEach(m => {
      if (m !== menu) m.classList.remove('active');
    });
  });
  
  // ヘルプメニューアイテム
  const helpItems = [
    { text: 'マニュアル', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/user.php/manual' },
    { text: 'FAQ', url: 'https://datapacific.zohodesk.com/portal/ja/kb/webclass-faq' },
    { text: 'よくある質問', url: 'https://www.osaka-sandai.ac.jp/cnt/qa_webclass_S.html', target: '_blank' },
    { text: '障害情報', url: 'https://www.google.com/appsstatus#hl=ja&v=status', target: '_blank' }
  ];
  
  // メニュー項目を追加
  helpItems.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.text;
    
    if (item.target) {
      a.target = item.target;
    }
    
    li.appendChild(a);
    menu.appendChild(li);
  });
  
  // 組み立て
  container.appendChild(button);
  container.appendChild(menu);
  return container;
}

// 右側コントロール部分を生成
function createRightControls() {
  const rightContainer = document.createElement('div');
  rightContainer.className = 'header-right-container';
  
  // 共通関数でアイコンを作成
  const mailIcon = createHeaderIcon('email', 'メール', 'https://ed24lb.osaka-sandai.ac.jp/webclass/msg_editor.php');
  const settingsIcon = createHeaderIcon('settings', '設定', 'https://ed24lb.osaka-sandai.ac.jp/webclass/user.php/config');
  const logoutIcon = createHeaderIcon('logout', 'ログアウト', 'https://ed24lb.osaka-sandai.ac.jp/webclass/logout.php');
  
  // ドロップダウンを含むコンポーネント
  const themeSwitcher = createThemeSwitcher();
  const helpDropdown = createHelpDropdown();
  
  // 要素を追加
  rightContainer.appendChild(mailIcon);
  rightContainer.appendChild(themeSwitcher);
  rightContainer.appendChild(helpDropdown);
  rightContainer.appendChild(settingsIcon);
  rightContainer.appendChild(logoutIcon);
  
  return rightContainer;
}

// eポートフォリオページのiframeを削除する関数を強化
function removeEportfolioIframe() {
  // eポートフォリオ関連ページかをチェック
  if (window.location.pathname.includes('/webclass/eportfolio.php')) {
    // iframe#iframe_top_barを探して削除
    const iframeTopBar = document.querySelector('iframe#iframe_top_bar');
    if (iframeTopBar) {
      console.log('eポートフォリオページからiframeを削除します');
      iframeTopBar.remove();
    }
    
    // contents_menuを削除
    const contentsMenu = document.getElementById('contents_menu');
    if (contentsMenu) {
      console.log('eポートフォリオページからcontents_menuを削除します');
      contentsMenu.remove();
    }
    
    // content_bodyのマージンを修正
    const contentBody = document.getElementById('content_body');
    if (contentBody) {
      contentBody.style.margin = '0';
      contentBody.style.float = 'none';
      contentBody.style.width = '100%';
      console.log('content_bodyのマージンを修正しました');
    }
    
    // jQuery関数をオーバーライド（iframeの追加を防止）
    if (window.jQuery) {
      const originalPrepend = window.jQuery.fn.prepend;
      window.jQuery.fn.prepend = function() {
        // iframeの追加をブロック
        if (arguments.length > 0 && 
            arguments[0] && 
            typeof arguments[0] === 'object' && 
            arguments[0].id === 'iframe_top_bar') {
          console.log('iframeの追加をブロックしました');
          return this;
        }
        return originalPrepend.apply(this, arguments);
      };
    }
    
    // ショーケースページ固有のスクリプト変数を無効化
    if (window.header_iframe) {
      window.header_iframe = null;
    }
    
    // MutationObserverを設定してiframeが追加されたら即時に削除
    setupIframeRemovalObserver();
  }
}

// iframeとcontents_menuが追加されたら削除するためのオブザーバー設定
function setupIframeRemovalObserver() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          
          // iframeチェック
          if (node.nodeName === 'IFRAME' && node.id === 'iframe_top_bar') {
            console.log('動的に追加されたiframeを削除しました');
            node.remove();
          }
          
          // contents_menuチェック
          if (node.id === 'contents_menu') {
            console.log('動的に追加されたcontents_menuを削除しました');
            node.remove();
            
            // content_bodyのマージンを修正
            const contentBody = document.getElementById('content_body');
            if (contentBody) {
              contentBody.style.margin = '0';
              contentBody.style.float = 'none';
              contentBody.style.width = '100%';
            }
          }
        }
      }
    });
  });
  
  // body全体を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // ページアンロード時にオブザーバーを停止
  window.addEventListener('beforeunload', function() {
    observer.disconnect();
  });
}

// ヘッダー置き換えを確実に行うための関数（改良版）
function replaceHeader() {
  const pageType = getPageType();
  
  // ログインページではヘッダーをカスタマイズしない
  if (pageType === 'login') {
    console.log('ログインページではヘッダーを変更しません');
    return false;
  }

  // eポートフォリオページの場合はiframeを削除
  if (pageType === 'portfolio') {
    removeEportfolioIframe();
  }

  // 元のヘッダーを識別して削除
  let originalHeader = document.querySelector('header');
  
  // WebClassの一部ページではheaderタグがないので、代替方法で探す
  if (!originalHeader && (pageType === 'portfolio' || pageType === 'dashboard' || pageType === 'webclass-other')) {
    // ヘッダーにあたる要素を検索（CSSセレクタを調整）
    originalHeader = document.querySelector('.bgc_sub') || 
                    document.querySelector('#WsTitle') || 
                    document.querySelector('#ip-header');
  }
  
  if (!originalHeader) {
    console.log('既存のヘッダーが見つかりませんでした');
    // 既存ヘッダーがなくても強制的に新しいヘッダーを挿入
    insertNewHeader();
    return true;
  }
  
  console.log('既存のヘッダーを削除します');
  try {
    originalHeader.remove();
  } catch (e) {
    console.error('ヘッダー削除エラー:', e);
  }

  // 新しいヘッダーを挿入
  return insertNewHeader();
}

// 新しいヘッダーを挿入する関数（分離して再利用可能に）
function insertNewHeader() {
  // 新しいヘッダーを作成
  const newHeader = document.createElement('header');
  newHeader.className = 'custom-header';
  newHeader.id = 'sandai-custom-header';
  
  // メインナビゲーション用コンテナ
  const navContainer = document.createElement('div');
  navContainer.className = 'nav-container';
  
  // メインナビ部分を作成
  const mainNav = document.createElement('nav');
  mainNav.className = 'main-nav';
  
  // ロゴとメニューを追加
  const logo = createLogo();

  // mbl.php/question_results (結果履歴)ならロゴを非表示に
  if (window.location.pathname.includes('/mbl.php/question_results')) {
    logo.style.visibility = 'hidden';
  }

  mainNav.appendChild(logo);

  mainNav.appendChild(createMainMenu());
  
  // コンテナに要素を追加
  navContainer.appendChild(mainNav);
  navContainer.appendChild(createRightControls());
  newHeader.appendChild(navContainer);
  
  // 新しいヘッダーをbodyの最初に挿入
  const body = document.body;
  if (!body) {
    console.log('bodyが見つかりませんでした');
    return false;
  }
  
  body.insertBefore(newHeader, body.firstChild);
  console.log('新しいヘッダーを挿入しました');
  return true;
}

/**
 * メインページの機能改善
 */
// メインページのレイアウトを変更する関数
function modifyMainPageLayout() {
  const pageType = getPageType();
  
  // トップページ以外では何もしない
  if (pageType !== 'home') {
    return;
  }
  
  console.log('WebClassメインページのレイアウト変更を適用します');
  
  // 左右のカラムを取得
  const leftColumn = document.querySelector('.col-sm-3');
  const rightColumn = document.querySelector('.col-sm-9');
  
  if (!leftColumn || !rightColumn) {
    console.log('レイアウト要素が見つかりません');
    return;
  }
  
  // 検索ボックスの重複チェック
  if (document.getElementById('search-container')) {
    return;
  }
  
  // 共通改善処理
  removeLinksBlock();
  removeAddCourseButton(rightColumn);
  moveYearSelector(rightColumn, leftColumn);
  moveSearchBox(rightColumn, leftColumn);
  moveInfoBox(leftColumn);
  
  // 並び替えと追加処理
  setTimeout(() => {
    reorderCourseList();
    reorderLeftColumn(leftColumn);
    highlightTodayClasses();
    enhanceCoursesList(); // 科目リスト表示の改善を追加
    customizeFooter();
  }, 500);
}

// リンクブロックを削除する関数
function removeLinksBlock() {
  // すべてのサイドブロックを取得して不要なものを削除
  const allBlocks = document.querySelectorAll('.side-block-outer, .side-block');
  
  allBlocks.forEach(block => {
    const titleElement = block.querySelector('.side-block-title, h4');
    if (titleElement && titleElement.textContent && 
        (titleElement.textContent.includes('リンク') || 
         titleElement.textContent.includes('課題実施状況一覧'))) {
      try {
        block.remove();
      } catch (e) {
        console.log('ブロック削除エラー:', e);
      }
    }
  });
  
  // モバイル用リンクブロックも削除
  document.querySelectorAll('.side-block-outer.hidden-sm.hidden-md.hidden-lg').forEach(block => {
    try {
      block.remove();
    } catch (e) {
      console.log('モバイルリンク削除エラー:', e);
    }
  });
}

// コース追加ボタンを削除
function removeAddCourseButton(rightColumn) {
  const addCourseButton = rightColumn.querySelector('a.btn.btn-default[href*="/courses/"]');
  if (addCourseButton) {
    const buttonContainer = addCourseButton.closest('div[align="right"]');
    if (buttonContainer) {
      buttonContainer.remove();
    } else {
      addCourseButton.remove();
    }
  }
}

// 学期選択を移動
function moveYearSelector(rightColumn, leftColumn) {
  const yearHeading = rightColumn.querySelector('h4');
  if (!yearHeading || yearHeading.textContent.trim() !== '表示する学期') return;
  
  const yearSelectDiv = yearHeading.nextElementSibling;
  if (!yearSelectDiv || yearSelectDiv.tagName !== 'DIV') return;
  
  // コンテナ作成
  const container = document.createElement('div');
  container.className = 'side-block';
  container.id = 'year-selector-container';
  container.style.marginBottom = '20px';
  
  const title = document.createElement('h4');
  title.className = 'side-block-title';
  title.textContent = '表示する学期';
  
  const content = document.createElement('div');
  content.className = 'side-block-content';
  
  // セレクトボックスのコピーと処理設定
  yearSelectDiv.querySelectorAll('select').forEach(select => {
    const newSelect = select.cloneNode(true);
    newSelect.addEventListener('change', function() {
      select.value = this.value;
      if (typeof document.condition !== 'undefined') {
        document.condition.submit();
      }
    });
    content.appendChild(newSelect);
  });
  
  // 要素の組み立てと表示/非表示
  container.appendChild(title);
  container.appendChild(content);
  leftColumn.insertBefore(container, leftColumn.firstChild);
  
  yearHeading.style.display = 'none';
  yearSelectDiv.style.display = 'none';
}

// 検索ボックスを移動
function moveSearchBox(rightColumn, leftColumn) {
  const searchBox = rightColumn.querySelector('#search_courses_left');
  if (!searchBox) return;
  
  // 検索コンテナ作成
  const container = document.createElement('div');
  container.className = 'side-block';
  container.id = 'search-container';
  container.style.marginBottom = '20px';
  
  const title = document.createElement('h4');
  title.className = 'side-block-title';
  title.textContent = '科目検索';
  
  const content = document.createElement('div');
  content.className = 'side-block-content';
  
  // 検索ボックスのコピーと処理設定
  const newSearchBox = searchBox.cloneNode(true);
  newSearchBox.id = 'search_courses_left_new';
  newSearchBox.className = 'form-control';
  newSearchBox.style.width = '100%';
  
  newSearchBox.addEventListener('keyup', function() {
    searchBox.value = this.value;
    searchBox.dispatchEvent(new Event('keyup'));
  });
  
  // 要素の組み立てと表示/非表示
  content.appendChild(newSearchBox);
  container.appendChild(title);
  container.appendChild(content);
  leftColumn.appendChild(container);
  
  searchBox.style.display = 'none';
  
  const brAfterSearch = searchBox.nextElementSibling;
  if (brAfterSearch && brAfterSearch.tagName === 'BR') {
    brAfterSearch.style.display = 'none';
  }
}

// お知らせを移動
function moveInfoBox(leftColumn) {
  const infoBox = document.getElementById('UserTopInfo');
  if (!infoBox) return;
  
  infoBox.classList.add('improved-info');
  leftColumn.appendChild(infoBox);
}

// 科目一覧を並び替え
function reorderCourseList() {
  const courseTreeItems = document.querySelectorAll('.courseTree.courseLevelOne > li');
  if (courseTreeItems.length === 0) return;
  
  let registeredCourseItem = null;
  
  // [登録科目一覧]を検索
  for (const item of courseTreeItems) {
    const titleElement = item.querySelector('.courseTree-levelTitle');
    if (titleElement && titleElement.textContent.includes('[登録科目一覧]')) {
      registeredCourseItem = item;
      break;
    }
  }
  
  // 一番上に移動
  if (registeredCourseItem) {
    const parent = registeredCourseItem.parentNode;
    parent.insertBefore(registeredCourseItem, parent.firstChild);
  }
}

// 左カラム要素を並び替え
function reorderLeftColumn(leftColumn) {
  const yearSelector = document.getElementById('year-selector-container');
  const searchContainer = document.getElementById('search-container');
  const infoContainer = document.getElementById('UserTopInfo');
  
  const elements = [];
  const order = { year: 1, search: 2, info: 3 };
  
  // 存在確認と一時削除
  [
    { elem: yearSelector, type: 'year' },
    { elem: searchContainer, type: 'search' },
    { elem: infoContainer, type: 'info' }
  ].forEach(item => {
    if (item.elem && item.elem.parentNode === leftColumn) {
      elements.push(item);
      try {
        leftColumn.removeChild(item.elem);
      } catch (e) {}
    }
  });
  
  // 順番に再挿入
  elements.sort((a, b) => order[a.type] - order[b.type]);
  elements.forEach(item => leftColumn.appendChild(item.elem));
}

// 複数時間割を適用する関数（「他」がある科目用）
function applyMultipleSchedules(link, schedules, currentDayJp, currentPeriod, todaysClassElements, courseName) {
  if (!schedules || schedules.length === 0) return;
  
  // 既に時間情報が追加されている場合はスキップ
  if (link.querySelector('.course-schedule-info')) return;
  
  // 時間割表示を作成
  const scheduleDisplay = formatScheduleDisplay(schedules);
  
  // 時間割情報要素を作成
  const scheduleSpan = document.createElement('span');
  scheduleSpan.className = 'course-schedule-info';
  scheduleSpan.textContent = ` [${scheduleDisplay}]`;
  scheduleSpan.style.cssText = 'color: #888; font-size: 0.9em; margin-left: 4px;';
  
  link.appendChild(scheduleSpan);
  
  // 今日の曜日に該当する時限があるかチェック
  const todaySchedules = schedules.filter(s => s.day === currentDayJp);
  if (todaySchedules.length > 0) {
    link.parentElement.classList.add('today-class');
    if (!todaysClassElements.includes(link)) {
      todaysClassElements.push(link);
    }
    
    // 時間情報を追加
    const timeInfos = todaySchedules.map(s => {
      const timeInfo = PERIOD_TIME_MAPPING[s.period];
      return timeInfo ? `${s.period}限: ${timeInfo.start}～${timeInfo.end}` : `${s.period}限`;
    }).join(', ');
    
    // 既存の時間リンクがなければ追加
    if (!link.querySelector('.course-time-info')) {
      const timeLink = document.createElement('a');
      timeLink.className = 'course-time-info course-time-link';
      timeLink.textContent = ` (${timeInfos})`;
      timeLink.href = link.href;
      timeLink.title = `${courseName} - ${timeInfos}`;
      timeLink.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      link.appendChild(timeLink);
    }
    
    // 現在時限に該当するかチェック
    if (todaySchedules.some(s => s.period === currentPeriod)) {
      link.parentElement.classList.add('current-period');
    }
  }
}

// 今日の授業をハイライト表示
function highlightTodayClasses() {
  // 現在の日付と時刻を取得
  const now = new Date();
  const currentDayIndex = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 日本語曜日
  const jpDays = ['日', '月', '火', '水', '木', '金', '土'];
  const currentDayJp = jpDays[currentDayIndex];
  
  // 現在の時限を判定
  let currentPeriod = null;
  for (const [period, timeRange] of Object.entries(PERIOD_TIME_MAPPING)) {
    const startTimeParts = timeRange.start.split(':').map(Number);
    const endTimeParts = timeRange.end.split(':').map(Number);
    
    const startTimeMinutes = startTimeParts[0] * 60 + startTimeParts[1];
    const endTimeMinutes = endTimeParts[0] * 60 + endTimeParts[1];
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
      currentPeriod = period;
      break;
    }
  }
  
  // 自動スクロールのフラグを取得
  let shouldScrollToTodaysClass = window.styleupSettings && window.styleupSettings.autoScroll;
  let todaysClassElements = []; // 今日の授業要素を格納する配列

  // 科目リンクを処理
  const courseLinks = document.querySelectorAll('.courseList li a');
  courseLinks.forEach(link => {
    const text = link.textContent;
    // 前期/後期両方に対応、「水4 他」のような「他」が付くパターンにも対応
    const hasOther = text.includes(' 他 '); // 「他」があるかチェック
    const courseInfoMatch = text.match(/(.+),(.+) (前期|後期) ([月火水木金土日])(\d)(?: 他)? (\d{4})/);
    
    if (courseInfoMatch) {
      const [, courseName, teacher, semester, dayJp, period, year] = courseInfoMatch;
      
      // 「他」がある場合は開講情報から完全な時間割を取得
      if (hasOther) {
        const courseId = extractCourseIdFromUrl(link.href);
        if (courseId) {
          // キャッシュから即座に取得を試みる
          const cache = getCourseScheduleCache();
          if (cache[courseId]) {
            // キャッシュがある場合は即座に適用
            applyMultipleSchedules(link, cache[courseId], currentDayJp, currentPeriod, todaysClassElements, courseName);
          } else {
            // キャッシュがない場合は非同期で取得
            fetchCourseSchedule(courseId).then(schedules => {
              if (schedules && schedules.length > 0) {
                applyMultipleSchedules(link, schedules, currentDayJp, currentPeriod, todaysClassElements, courseName);
              }
            });
          }
        }
      }
      
      // 通常の処理（単一時限）
      if (dayJp === currentDayJp) {
        // 今日の授業をマーク
        link.parentElement.classList.add('today-class');
        todaysClassElements.push(link); // 今日の授業要素を配列に追加
        
        // 時間情報を追加
        const timeInfo = PERIOD_TIME_MAPPING[period];
        if (timeInfo) {
          // リンクURL取得
          const courseUrl = link.href;
          
          // 時間情報をクリック可能なリンクに変更
          const timeLink = document.createElement('a');
          timeLink.className = 'course-time-info course-time-link';
          timeLink.textContent = ` (${timeInfo.start}～${timeInfo.end})`;
          timeLink.href = courseUrl;
          timeLink.title = `${courseName} - ${timeInfo.start}～${timeInfo.end}`;
          
          // リンククリックイベントを親リンクと共有
          timeLink.addEventListener('click', function(e) {
            e.stopPropagation(); // 親リンクのクリックイベントを停止
          });
          
          link.appendChild(timeLink);
        }
        
        // 現在時限ならさらにハイライト
        if (period === currentPeriod) {
          link.parentElement.classList.add('current-period');
        }
      }
    }
  });
  
  // 自動スクロールが有効で、今日の授業がある場合は最初の今日の授業へスクロール
  if (shouldScrollToTodaysClass && todaysClassElements.length > 0) {
    // 一瞬でスクロール（smooth効果なし）
    todaysClassElements[0].scrollIntoView({
      block: 'center'
    });
  }
  
  // 時間帯の凡例を追加
  addTimeLegend(currentPeriod);
}

// 授業時間帯の凡例を追加
function addTimeLegend(currentPeriod = null) {
  if (document.querySelector('.class-time-legend')) return;
  
  // 凡例コンテナ
  const legendContainer = document.createElement('div');
  legendContainer.className = 'class-time-legend';
  
  // タイトル
  const legendTitle = document.createElement('h5');
  legendTitle.textContent = '授業時間帯';
  legendContainer.appendChild(legendTitle);
  
  // 時間表
  const legendTable = document.createElement('table');
  legendTable.className = 'legend-table';
  
  // ヘッダー行
  const headerRow = document.createElement('tr');
  const headerPeriod = document.createElement('th');
  headerPeriod.textContent = '時限';
  const headerTime = document.createElement('th');
  headerTime.textContent = '時間帯 - 科目';
  headerRow.appendChild(headerPeriod);
  headerRow.appendChild(headerTime);
  legendTable.appendChild(headerRow);
  
  // データ行
  const fragment = new DocumentFragment();
  
  // 対応する曜日の授業リンクを検索するヘルパー関数
  function findCourseLinks(period) {
    const now = new Date();
    const jpDays = ['日', '月', '火', '水', '木', '金', '土'];
    const currentDayJp = jpDays[now.getDay()];
    
    // 現在の曜日の授業を検索（前期/後期両方に対応、「他」が付くパターンにも対応）
    const todaysCourses = Array.from(document.querySelectorAll('.courseList li a'))
      .filter(link => {
        const text = link.textContent;
        const match = text.match(/(.+),(.+) (前期|後期) ([月火水木金土日])(\d)(?: 他)? (\d{4})/);
        return match && match[4] === currentDayJp && match[5] === period;
      })
      .map(link => {
        const text = link.textContent;
        // 科目名と教員名を抽出
        const courseMatch = text.match(/(.+),(.+) (前期|後期) ([月火水木金土日])(\d)(?: 他)? (\d{4})/);
        return { 
          link: link, 
          courseName: courseMatch ? courseMatch[1].trim() : text,
          teacherName: courseMatch ? courseMatch[2].trim() : ""
        };
      });
    
    return todaysCourses;
  }
  
  for (const [period, timeRange] of Object.entries(PERIOD_TIME_MAPPING)) {
    const row = document.createElement('tr');
    
    const periodCell = document.createElement('td');
    periodCell.textContent = period;
    
    const timeCell = document.createElement('td');
    
    // 対応する曜日の授業リンクを検索
    const courseLinks = findCourseLinks(period);
    
    if (courseLinks.length > 0) {
      // この時限に授業がある場合、リンクを作成
      const timeContainer = document.createElement('div');
      timeContainer.className = 'time-legend-container';
      
      const timeLink = document.createElement('a');
      timeLink.textContent = `${timeRange.start}～${timeRange.end}`;
      timeLink.href = courseLinks[0].link.href;
      timeLink.className = 'time-legend-link';
      
      // 現在の時限なら特別なクラスを追加
      if (period === currentPeriod) {
        timeLink.classList.add('current-time');
        row.classList.add('current-period-row');
      }
      
      // 科目名を表示
      const courseNameSpan = document.createElement('span');
      courseNameSpan.className = 'time-legend-course-name';
      courseNameSpan.textContent = ` - ${courseLinks[0].courseName}`;
      
      timeLink.title = `${courseLinks[0].courseName} に移動`;
      
      timeContainer.appendChild(timeLink);
      timeContainer.appendChild(courseNameSpan);
      timeCell.appendChild(timeContainer);
    } else {
      // この時限に授業がない場合は通常テキスト
      timeCell.textContent = `${timeRange.start}～${timeRange.end}`;
    }
    
    row.appendChild(periodCell);
    row.appendChild(timeCell);
    fragment.appendChild(row);
  }
  legendTable.appendChild(fragment);
  legendContainer.appendChild(legendTable);
  
  // 今日と現在の凡例
  const todayLegend = createLegendItem('today-class-sample', '今日の授業');
  const currentLegend = createLegendItem('current-period-sample', '現在の授業');
  
  legendContainer.appendChild(todayLegend);
  legendContainer.appendChild(currentLegend);
  
  // 左カラムに追加
  const leftColumn = document.querySelector('.col-sm-3');
  if (leftColumn) {
    leftColumn.insertBefore(legendContainer, leftColumn.firstChild);
  }
}

// 凡例アイテムを作成
function createLegendItem(className, text) {
  const container = document.createElement('div');
  container.className = className === 'today-class-sample' ? 'today-legend' : 'current-legend';
  
  const colorBox = document.createElement('span');
  colorBox.className = className;
  colorBox.textContent = '■';
  
  container.appendChild(colorBox);
  container.appendChild(document.createTextNode(` ${text}`));
  
  return container;
}

// フッターカスタマイズ
function customizeFooter() {
  const footer = document.querySelector('footer.ft-footer');
  if (!footer) return;
  
  const footerContainer = footer.querySelector('.container');
  if (!footerContainer) return;
  
  // すでにあれば追加しない
  if (footerContainer.querySelector('.ft-footer_custom')) return;
  
  const customInfo = document.createElement('p');
  customInfo.className = 'ft-footer_custom';
  
  const customLink = document.createElement('a');
  customLink.href = 'https://github.com/kabuchin/';
  customLink.target = '_blank';
  customLink.textContent = 'Customized by kabuchin';
  
  customInfo.appendChild(customLink);
  footerContainer.appendChild(customInfo);
}

/**
 * イベント・リスナー設定
 */
// ドロップダウンメニューをクリック外で閉じる機能
function setupOutsideClickHandler() {
  document.addEventListener('click', function(event) {
    // ドロップダウン関連要素内のクリックかチェック
    const isInsideDropdown = event.target.closest('.header-dropdown');
    
    // ドロップダウン外のクリックなら、すべてのメニューを閉じる
    if (!isInsideDropdown) {
      document.querySelectorAll('.header-dropdown-menu.active').forEach(menu => {
        menu.classList.remove('active');
      });
    }
  });
}

// 自動ログイン失敗カウントのキー
const LOGIN_FAIL_COUNT_KEY = 'autoLoginFailCount';
const MAX_LOGIN_FAILURES = 3;

// ログインページでの自動入力とログイン処理（高速化版）
function handleLoginPage() {
  const url = window.location.href;
  
  // ログインページかどうか確認
  if (!url.includes('/webclass/login.php')) return;
  
  console.log('WebClassログインページを検出しました');
  
  // ログインページ用のスタイルを即座に適用
  document.body.classList.add('login-page');
  
  // フォーム要素を早期に取得を試みる
  const loginForm = document.querySelector('form[name="loginform"], form[action*="login.php"]');
  
  if (loginForm) {
    // フォームが既に存在する場合は即座に処理
    handleLoginForm(loginForm);
  } else {
    // DOMContentLoadedで再試行（loadより高速）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form[name="loginform"], form[action*="login.php"]');
        if (form) handleLoginForm(form);
      }, { once: true });
    }
  }
}

// ログインフォームの処理（高速化・失敗カウント対応版）
function handleLoginForm(loginForm) {
  if (!loginForm) {
    loginForm = document.querySelector('form[name="loginform"], form[action*="login.php"]');
    if (!loginForm) {
      console.warn('ログインフォームが見つかりません');
      return;
    }
  }
  
  // フィールドを高速に取得
  const userIdField = loginForm.querySelector('input[name="username"], #userid');
  const passwordField = loginForm.querySelector('input[name="val"], #passwd');
  
  if (!userIdField || !passwordField) {
    console.warn('ログインフィールドが見つかりません');
    return;
  }
  
  const loginButton = loginForm.querySelector('input[type="submit"], button[type="submit"]');
  
  // 保存されたログイン情報を取得（失敗カウントも含む）
  chrome.storage.sync.get(['wcUsername', 'wcPassword', 'autoLogin', LOGIN_FAIL_COUNT_KEY], function(data) {
    const failCount = data[LOGIN_FAIL_COUNT_KEY] || 0;
    
    // 失敗回数が上限に達している場合は自動ログインを停止
    if (failCount >= MAX_LOGIN_FAILURES) {
      console.warn(`自動ログインは${MAX_LOGIN_FAILURES}回失敗したため停止しています。ポップアップから再度有効にしてください。`);
      showLoginFailureWarning(failCount);
      return;
    }
    
    if (data.wcUsername && data.wcPassword) {
      // ユーザーID入力（直接設定で高速化）
      userIdField.value = data.wcUsername;
      // input イベントを発火させてフレームワークに通知
      userIdField.dispatchEvent(new Event('input', { bubbles: true }));
      
      // パスワード入力
      passwordField.value = data.wcPassword;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 自動ログインが有効な場合は処理を実行
      if (data.autoLogin) {
        // 失敗カウントをインクリメント（成功したらリセット）
        chrome.storage.sync.set({ [LOGIN_FAIL_COUNT_KEY]: failCount + 1 });
        
        // 最小限の遅延で送信（50ms）
        requestAnimationFrame(() => {
          setTimeout(() => {
            executeLogin(loginForm, loginButton);
          }, 50);
        });
      }
    }
  });
}

// ログイン実行（分離して効率化）
function executeLogin(loginForm, loginButton) {
  try {
    if (loginButton) {
      loginButton.click();
    } else {
      loginForm.submit();
    }
  } catch (error) {
    console.error('ログイン処理中にエラーが発生しました:', error);
    // フォールバック
    try {
      loginForm.submit();
    } catch (e) {
      console.error('すべてのログイン試行が失敗しました');
    }
  }
}

// ログイン失敗警告を表示
function showLoginFailureWarning(failCount) {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'styleup-login-warning';
  warningDiv.innerHTML = `
    <div style="background: #ff5252; color: white; padding: 12px 16px; border-radius: 8px; margin: 10px; text-align: center; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
      <strong>⚠️ 自動ログインが停止しました</strong><br>
      <span style="font-size: 12px;">連続${failCount}回失敗したため自動ログインを停止しました。<br>
      拡張機能のポップアップから再度有効にしてください。</span>
      <button id="reset-login-fail" style="margin-top: 8px; padding: 6px 16px; background: white; color: #ff5252; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        リセットして再試行
      </button>
    </div>
  `;
  
  const loginForm = document.querySelector('form[name="loginform"], form[action*="login.php"]');
  if (loginForm) {
    loginForm.parentElement.insertBefore(warningDiv, loginForm);
  } else {
    document.body.insertBefore(warningDiv, document.body.firstChild);
  }
  
  // リセットボタンのイベント
  document.getElementById('reset-login-fail')?.addEventListener('click', function() {
    chrome.storage.sync.set({ [LOGIN_FAIL_COUNT_KEY]: 0 }, function() {
      location.reload();
    });
  });
}

// ログイン成功時に失敗カウントをリセット（ホームページで呼び出す）
function resetLoginFailCount() {
  chrome.storage.sync.set({ [LOGIN_FAIL_COUNT_KEY]: 0 });
}

/**
 * 拡張機能の初期化
 */
// ページの読み込みが完了したら実行する初期化処理
function initializeCustomHeader() {
  console.log('WebClass カスタマイズ拡張機能を初期化中...');
  
  // クリティカルCSSを設定
  setupCriticalCSS();
  
  // リンクブロック非表示のためにデータ属性を追加
  addDataContentAttributes();
  
  // ログインページの処理を最優先で実行
  handleLoginPage();
  
  // ホームページ等にアクセスできた場合はログイン成功とみなして失敗カウントをリセット
  const pageType = getPageType();
  if (pageType === 'home' || pageType === 'dashboard' || 
      (typeof pageType === 'object' && pageType.type === 'course')) {
    resetLoginFailCount();
  }
  
  // リダイレクト処理を実行
  redirectToWebClass();
  
  // フォントの読み込み
  loadFonts();

  // eポートフォリオページのiframeを削除
  removeEportfolioIframe();
  
  // ヘッダー置き換えを試みる
  if (!replaceHeader()) {
    // 失敗した場合は少し待ってからもう一度試す
    setTimeout(replaceHeader, 500);
  }
  
  // 設定を読み込む
  loadSettings();
  
  // メインページの場合はレイアウトも変更
  setTimeout(modifyMainPageLayout, 1000);
  
  // 「このウィンドウを閉じる」ボタンを「ホームへ戻る」に変更
  setTimeout(replaceCloseButtons, 1000);
  
  // クリック外でドロップダウンメニューを閉じる
  setupOutsideClickHandler();

  // 再度iframe削除を試みる（遅延実行）
  setTimeout(removeEportfolioIframe, 1000);
  
  // 定期的にiframeのテーマを確認・適用
  setInterval(applyThemeToFrames, 3000);
}

// 「このウィンドウを閉じる」ボタンを「ホームへ戻る」に変更する関数（強化版）
function replaceCloseButtons() {
  // 「このウィンドウを閉じる」というテキストを持つすべてのリンクを検索
  const closeTextPatterns = [
    'このウィンドウを閉じる',
    '[このウィンドウを閉じる]',
    '» このウィンドウを閉じる',
    '[» このウィンドウを閉じる]',
    ' このウィンドウを閉じる ',
    ' » このウィンドウを閉じる '
  ];
  
  // すべてのリンクをチェック
  const allLinks = Array.from(document.querySelectorAll('a'));
  const closeLinks = allLinks.filter(link => {
    const linkText = link.textContent.trim();
    return closeTextPatterns.some(pattern => 
      linkText === pattern || 
      linkText.includes(pattern)
    );
  });
  
  // 各リンクを「ホームへ戻る」に変更
  closeLinks.forEach(link => {
    link.textContent = 'ホームへ戻る';
    link.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
    link.onclick = function(e) {
      e.preventDefault();
      window.location.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
    };
  });
  
  // JavaScriptでの閉じる処理をオーバーライド
  if (window.close !== undefined && typeof window.close === 'function') {
    const originalClose = window.close;
    window.close = function() {
      window.location.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
    };
  }
  
  // close.phpへのリンクも置き換え
  const closePhpLinks = Array.from(document.querySelectorAll('a[href*="close.php"]'));
  closePhpLinks.forEach(link => {
    link.textContent = 'ホームへ戻る';
    link.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
    link.onclick = function(e) {
      e.preventDefault();
      window.location.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
    };
  });
}

// クリティカルCSSの優先読み込みを設定
function setupCriticalCSS() {
  // 最も重要なスタイルを抽出したインラインCSS
  const criticalStyles = `
    :root {
      --primary-color: #1a73e8;
      --background-color: #ffffff;
      --text-color: #202124;
    }
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 0;
      color: var(--text-color);
      background-color: var(--background-color);
    }
    body.theme-dark {
      --primary-color: #8ab4f8;
      --background-color: #202124;
      --text-color: #e8eaed;
    }
    .custom-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
      background-color: var(--background-color);
    }
    header .navbar.navbar-default {
      display: none !important;
    }
    .side-block-title-hidden, .side-block-content-hidden {
      display: none !important;
    }
  `;
  
  // クリティカルCSSをドキュメントヘッドに追加
  const styleElement = document.createElement('style');
  styleElement.id = 'styleup-critical-css';
  styleElement.textContent = criticalStyles;
  document.head.appendChild(styleElement);
}

// DOMが読み込まれた直後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCustomHeader);
} else {
  // DOMがすでに読み込まれている場合は即時実行
  initializeCustomHeader();
}

// ページが完全に読み込まれたあとの処理
window.addEventListener('load', function() {
  // ログインページではヘッダーをカスタマイズしない
  if (getPageType() === 'login') return;
  
  // ヘッダー未置換の場合は再試行
  if (!document.getElementById('sandai-custom-header')) {
    replaceHeader();
  }
  
  // メインページレイアウトの変更を再確認
  modifyMainPageLayout();
  
  // 「このウィンドウを閉じる」ボタンの変更を再確認
  replaceCloseButtons();
  
  // 保存されたテーマを再適用
  loadSavedTheme();
  
  // 遅延実行を追加して確実にすべての「閉じる」ボタンを処理
  setTimeout(replaceCloseButtons, 2000);
});

// DOM変更の監視（動的に変更される場合に対応）
const observer = new MutationObserver(function(mutations) {
  if (getPageType() === 'login') return;
  
  if (!document.getElementById('sandai-custom-header') && document.querySelector('header')) {
    console.log('DOM変更を検知し、ヘッダーを置き換えます');
    replaceHeader();
  }
  
  // DOM変更時にもボタン置換を確認
  replaceCloseButtons();
});

// body全体の変更を監視
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// メッセージリスナーを追加（ポップアップからの設定変更に対応）
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'setTheme') {
    setTheme(message.theme);
    sendResponse({ success: true });
    return true;
  }
  
  // 設定更新メッセージを処理
  if (message.action === 'updateSettings') {
    // グローバル設定を更新
    window.styleupSettings = {
      ...(window.styleupSettings || {}),
      ...message.settings
    };
    
    // フォントサイズの更新
    if (message.settings.courseFontSize) {
      applyCourseFontSize(message.settings.courseFontSize);
    }
    
    console.log('設定を更新しました:', window.styleupSettings);
    sendResponse({ success: true });
    return true;
  }
  
  // 完全な設定適用（新UI用）
  if (message.action === 'applyFullSettings') {
    applyFullSettings(message.settings);
    sendResponse({ success: true });
    return true;
  }
});

// 科目アイテムの表示を強化する関数
function enhanceCourseItems(courseList) {
  // 親カテゴリーが登録科目一覧かどうかをチェック
  const isRegisteredCourseList = courseList.closest('li.registered-courses') !== null;
  
  const courses = courseList.querySelectorAll(':scope > li');
  
  courses.forEach(course => {
    // 全てのコースに基本クラスを適用
    course.classList.add('course-item');
    
    // 登録科目リストの場合は特別なクラスを追加
    if (isRegisteredCourseList) {
      course.classList.add('registered-course');
    } else {
      // 登録科目以外の項目には別クラスを追加
      course.classList.add('other-course-item');
    }
    
    const linkElement = course.querySelector('a');
    if (!linkElement) return;
    
    // 現在のHTML構造を保持
    const originalHTML = course.innerHTML;
    const linkURL = linkElement.getAttribute('href');
    const fullText = linkElement.textContent.trim();
    
    // 科目名とその他情報を分離
    let courseTitle = fullText;
    let teacherName = '';
    let semester = '';
    let day = '';
    let period = '';
    let year = '';
    
    // 科目情報をパース（「水4 他」のような「他」が付くパターンにも対応）
    const courseInfoMatch = fullText.match(/(.+),(.+) (前期|後期) ([月火水木金土日])(\d)(?: 他)? (\d{4})/);
    // 「他」が含まれているかを判定（複数時限開講の科目）
    const hasOtherSchedule = fullText.includes(' 他 ');
    if (courseInfoMatch) {
      [, courseTitle, teacherName, semester, day, period, year] = courseInfoMatch;
    }
    
    // 新しいHTML構造を構築
    const newContent = document.createElement('div');
    newContent.className = 'course-content';
    
    // 科目名を目立たせる
    const titleDiv = document.createElement('div');
    titleDiv.className = 'course-main-info';
    
    const titleLink = document.createElement('a');
    titleLink.href = linkURL;
    
    // 科目名と教員名を分けて表示
    if (courseInfoMatch) {
      // 登録科目は科目名と教員名を分離表示
      const courseNameSpan = document.createElement('span');
      courseNameSpan.className = 'course-name-highlight';
      courseNameSpan.textContent = courseTitle.trim();
      titleLink.appendChild(courseNameSpan);
      
      // 教員名を追加
      if (teacherName) {
        const teacherNameSpan = document.createElement('span');
        teacherNameSpan.className = 'course-teacher-inline';
        teacherNameSpan.textContent = ` (${teacherName.trim()})`;
        titleLink.appendChild(teacherNameSpan);
      }
    } else {
      // 登録科目以外は通常表示
      titleLink.textContent = fullText.replace('» ', '');
      if (isRegisteredCourseList === false) {
        titleLink.classList.add('other-course-link');
      }
    }
    
    titleDiv.appendChild(titleLink);
    
    // 追加情報（曜日時限）
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'course-details';
    
    if (day && period && isRegisteredCourseList) {
      // 曜日タグ（曜日ごとに異なるクラスを適用）
      const timeBadge = document.createElement('span');
      timeBadge.className = 'course-time-badge';
      
      // 曜日ごとにクラスを適用
      const dayMap = {
        '月': 'day-mon',
        '火': 'day-tue',
        '水': 'day-wed',
        '木': 'day-thu',
        '金': 'day-fri',
        '土': 'day-sat',
        '日': 'day-sun'
      };
      
      if (dayMap[day]) {
        timeBadge.classList.add(dayMap[day]);
      }
      
      // 「他」がある場合は、後から完全なスケジュールを取得するためのマーカーを追加
      if (hasOtherSchedule) {
        timeBadge.textContent = `${day}${period}限 他`;
        timeBadge.dataset.courseUrl = linkURL;
        timeBadge.dataset.needsScheduleFetch = 'true';
        timeBadge.classList.add('schedule-pending');
      } else {
        timeBadge.textContent = `${day}${period}限`;
      }
      detailsDiv.appendChild(timeBadge);
      
      // 登録科目では時間情報を表示しない（登録科目一覧のみ）
      if (!isRegisteredCourseList) {
        const timeInfo = PERIOD_TIME_MAPPING[period];
        if (timeInfo) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'course-time-info';
          timeSpan.textContent = `${timeInfo.start}～${timeInfo.end}`;
          detailsDiv.appendChild(timeSpan);
        }
      }
    } else if (day && period) {
      // 登録科目一覧以外の場合は従来通りの表示
      // 曜日タグ
      const timeBadge = document.createElement('span');
      timeBadge.className = 'course-time-badge';
      timeBadge.textContent = `${day}${period}`;
      detailsDiv.appendChild(timeBadge);
      
      // 時間情報
      const timeInfo = PERIOD_TIME_MAPPING[period];
      if (timeInfo) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'course-time-info';
        timeSpan.textContent = `${timeInfo.start}～${timeInfo.end}`;
        detailsDiv.appendChild(timeSpan);
      }
    }
    
    if (teacherName && !isRegisteredCourseList) {
      const teacherSpan = document.createElement('span');
      teacherSpan.className = 'course-teacher';
      teacherSpan.textContent = teacherName;
      detailsDiv.appendChild(teacherSpan);
    }
    
    // 新しい構造に組み立て
    newContent.appendChild(titleDiv);
    newContent.appendChild(detailsDiv);
    
    // 元の内容を置き換え
    course.innerHTML = '';
    const newWrapper = document.createElement('div');
    newWrapper.className = 'course-title';
    newWrapper.appendChild(newContent);
    course.appendChild(newWrapper);
    
    // 締切が近い課題の表示を保持
    if (originalHTML.includes('締切が近い課題があります')) {
      const deadlineInfo = document.createElement('div');
      deadlineInfo.innerHTML = '<span class="course-contents-info">締切が近い課題があります</span>';
      course.appendChild(deadlineInfo);
    }
    
    // 新着メッセージの表示を保持
    if (originalHTML.includes('新着メッセージ')) {
      const messageMatch = originalHTML.match(/新着メッセージ\((\d+)\)/);
      if (messageMatch && messageMatch[1]) {
        const messageInfo = document.createElement('div');
        messageInfo.innerHTML = `<span class="course-new-message">新着メッセージ(${messageMatch[1]})</span>`;
        course.appendChild(messageInfo);
      }
    }
    
    // クリックハンドラを追加（リンクではない部分をクリックしても移動できるように）
    course.style.cursor = 'pointer';
    course.addEventListener('click', function(e) {
      // リンク自体がクリックされた場合は通常の動作を許可
      if (e.target.tagName === 'A') return;
      
      // それ以外の場合はコースページに移動
      window.location.href = linkURL;
    });
  });
}

// 科目リストの表示を改善する関数
function enhanceCoursesList() {
  const pageType = getPageType();
  
  // トップページ以外では実行しない
  if (pageType !== 'home') return;
  
  // 科目一覧のコンテナを取得
  const courseLevelOneList = document.querySelector('.courseTree.courseLevelOne');
  if (!courseLevelOneList) return;
  
  console.log('科目リスト表示を強化します');
  
  // 強化クラスを追加
  courseLevelOneList.classList.add('enhanced-course-tree');
  
  // 各カテゴリを処理
  const categoryItems = courseLevelOneList.querySelectorAll(':scope > li');
  categoryItems.forEach((categoryItem, index) => {
    // カテゴリータイトルと科目リストを取得
    const titleElement = categoryItem.querySelector('.courseTree-levelTitle');
    const courseList = categoryItem.querySelector('.courseList');
    
    if (!titleElement || !courseList) return;
    
    // 登録科目一覧のカテゴリを特定してクラスを追加
    if (titleElement.textContent.includes('[登録科目一覧]')) {
      categoryItem.classList.add('registered-courses');
    }
    
    // 科目数をカウントして表示
    const courseCount = courseList.querySelectorAll(':scope > li').length;
    if (courseCount > 0) {
      const countBadge = document.createElement('span');
      countBadge.className = 'course-count';
      countBadge.textContent = courseCount;
      if (!titleElement.querySelector('.course-count')) {
        titleElement.appendChild(countBadge);
      }
    }
    
    // 折りたたみ機能を追加
    titleElement.style.cursor = 'pointer';
    if (!titleElement.hasAttribute('data-click-handler-added')) {
      titleElement.setAttribute('data-click-handler-added', 'true');
      titleElement.addEventListener('click', function() {
        categoryItem.classList.toggle('collapsed');
       
        courseList.style.display = categoryItem.classList.contains('collapsed') ? 'none' : 'block';
      });
    }
    
    // 科目リストにクラスを追加
    courseList.classList.add('enhanced-course-list');
    
    // 各科目アイテムを強化
    enhanceCourseItems(courseList);
  });
  
  // 登録科目カテゴリが最初に表示されるよう並べ替え
  reorderCourseList();
  
  // 「他」がマークされた時間割バッジを非同期で更新
  updatePendingScheduleBadges();
}