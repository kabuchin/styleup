/**
 * StyleUp for WebClass
 * WebClassのインターフェースを改善するための拡張機能
 */

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

// マテリアルアイコンとGoogle Fontsを読み込む関数
function loadFonts() {
  const head = document.head;
  
  // マテリアルアイコンのフォントを読み込む
  if (!document.querySelector('link[href*="fonts.googleapis.com/icon"]')) {
    const iconFont = document.createElement('link');
    iconFont.rel = 'stylesheet';
    iconFont.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    head.appendChild(iconFont);
  }
  
  // Google FontsのRobotoを読み込む
  if (!document.querySelector('link[href*="fonts.googleapis.com/css2"]')) {
    const googleFont = document.createElement('link');
    googleFont.rel = 'stylesheet';
    googleFont.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    head.appendChild(googleFont);
  }
}

/**
 * テーマ管理機能
 */
// テーマを設定する関数
function setTheme(themeId) {
  // 現在のテーマクラスをすべて削除
  document.body.classList.remove('theme-green', 'theme-red', 'theme-purple', 'theme-dark');
  
  // デフォルト以外のテーマの場合は、対応するクラスを追加
  if (themeId !== 'default') {
    document.body.classList.add(themeId);
  }
  
  // テーマIDをChromeストレージに保存
  chrome.storage.sync.set({ 'selectedTheme': themeId }, function() {
    console.log('Theme saved: ' + themeId);
  });
  
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

// テーマスイッチャーを生成（シンプル化）
function createThemeSwitcher() {
  // コンテナ作成
  const container = document.createElement('div');
  container.className = 'header-dropdown';
  
  // アイコンボタン作成
  const button = document.createElement('a');
  button.href = 'javascript:void(0);';
  button.className = 'header-icon';
  button.title = 'テーマ';
  button.innerHTML = '<span class="material-icons">palette</span>';
  
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
  
  // テーマオプションを追加
  THEME_OPTIONS.forEach(theme => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.dataset.theme = theme.id;
    
    const colorPreview = document.createElement('span');
    colorPreview.className = `color-preview ${theme.previewClass}`;
    
    btn.appendChild(colorPreview);
    btn.appendChild(document.createTextNode(theme.name));
    
    btn.onclick = function() {
      setTheme(theme.id);
      menu.classList.remove('active');
    };
    
    li.appendChild(btn);
    menu.appendChild(li);
  });
  
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
  mainNav.appendChild(createLogo());
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
  
  // 科目リンクを処理
  const courseLinks = document.querySelectorAll('.courseList li a');
  courseLinks.forEach(link => {
    const text = link.textContent;
    const courseInfoMatch = text.match(/(.+),(.+) 前期 ([月火水木金土日])(\d) (\d{4})/);
    
    if (courseInfoMatch) {
      const [, courseName, teacher, dayJp, period, year] = courseInfoMatch;
      
      if (dayJp === currentDayJp) {
        // 今日の授業をマーク
        link.parentElement.classList.add('today-class');
        
        // 時間情報を追加
        const timeInfo = PERIOD_TIME_MAPPING[period];
        if (timeInfo) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'course-time-info';
          timeSpan.textContent = ` (${timeInfo.start}～${timeInfo.end})`;
          link.appendChild(timeSpan);
        }
        
        // 現在時限ならさらにハイライト
        if (period === currentPeriod) {
          link.parentElement.classList.add('current-period');
          setTimeout(() => {
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 1000);
        }
      }
    }
  });
  
  // 時間帯の凡例を追加
  addTimeLegend();
}

// 授業時間帯の凡例を追加
function addTimeLegend() {
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
  headerTime.textContent = '時間帯';
  headerRow.appendChild(headerPeriod);
  headerRow.appendChild(headerTime);
  legendTable.appendChild(headerRow);
  
  // データ行
  const fragment = new DocumentFragment();
  for (const [period, timeRange] of Object.entries(PERIOD_TIME_MAPPING)) {
    const row = document.createElement('tr');
    
    const periodCell = document.createElement('td');
    periodCell.textContent = period;
    
    const timeCell = document.createElement('td');
    timeCell.textContent = `${timeRange.start}～${timeRange.end}`;
    
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

/**
 * 拡張機能の初期化
 */
// ページの読み込みが完了したら実行する初期化処理
function initializeCustomHeader() {
  console.log('WebClass カスタマイズ拡張機能を初期化中...');
  
  // リダイレクト処理を実行
  redirectToWebClass();
  
  // フォントの読み込み
  loadFonts();

  // eポートフォリオページのiframeを削除（優先順位を上げて早期に実行）
  removeEportfolioIframe();
  
  // ヘッダー置き換えを試みる
  if (!replaceHeader()) {
    // 失敗した場合は少し待ってからもう一度試す
    setTimeout(replaceHeader, 500);
  }
  
  // メインページの場合はレイアウトも変更
  setTimeout(modifyMainPageLayout, 1000);
  
  // 「このウィンドウを閉じる」ボタンを「ホームへ戻る」に変更
  setTimeout(replaceCloseButtons, 1000);
  
  // 保存されたテーマを読み込む
  loadSavedTheme();
  
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

// メッセージリスナーを追加（ポップアップからのテーマ変更に対応）
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'setTheme') {
    setTheme(message.theme);
    sendResponse({ success: true });
    return true;
  }
});
