// WebClass向けのカスタムヘッダーを追加する処理

// ヘッダー置き換えを確実に行うための関数
function replaceHeader() {
  // ログインページではヘッダーをカスタマイズしない
  if (window.location.href.includes('/webclass/login.php')) {
    console.log('ログインページではヘッダーを変更しません');
    return false;
  }

  // 元のヘッダーを識別して削除
  const originalHeader = document.querySelector('header');
  if (originalHeader) {
    console.log('既存のヘッダーを削除します');
    originalHeader.remove();
  } else {
    console.log('既存のヘッダーが見つかりませんでした');
    // ヘッダーがない場合は後で再試行
    return false;
  }

  // 新しいヘッダーを作成
  const newHeader = document.createElement('header');
  newHeader.className = 'custom-header';
  newHeader.id = 'sandai-custom-header';
  
  // メインナビゲーション用コンテナ
  const navContainer = document.createElement('div');
  navContainer.className = 'nav-container';
  
  // ロゴとメインメニュー部分
  const mainNav = document.createElement('nav');
  mainNav.className = 'main-nav';
  
  // ロゴ部分
  const logoLink = document.createElement('a');
  logoLink.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/';
  logoLink.className = 'logo';
  logoLink.textContent = 'WebClass';
  
  // メインメニューリスト
  const mainMenu = document.createElement('ul');
  mainMenu.className = 'main-menu';
  
  // メインメニューアイテム - ホームとマイページは削除
  const menuItems = [
    // ホームは削除
    { text: '講義', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/index.php/' },
    { text: '科目', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/index.php/courses/' },
    { text: 'ダッシュボード', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/ip_mods.php/plugin/score_summary_table/dashboard' },
    { text: 'ポートフォリオ', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/eportfolio.php/showcases/' },
    { text: 'メール', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/msg_editor.php' }
  ];
  
  menuItems.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.text;
    
    if (item.target) {
      a.target = item.target;
    }
    
    li.appendChild(a);
    mainMenu.appendChild(li);
  });
  
  mainNav.appendChild(logoLink);
  mainNav.appendChild(mainMenu);
  navContainer.appendChild(mainNav);
  
  // 右側のコンテナ
  const rightContainer = document.createElement('div');
  rightContainer.className = 'header-right-container';
  
  // ヘルプメニュー（ドロップダウン式）
  const helpDropdown = document.createElement('div');
  helpDropdown.className = 'help-dropdown';
  
  const helpButton = document.createElement('button');
  helpButton.className = 'help-dropdown-button';
  helpButton.innerHTML = 'ヘルプ <span class="material-icons">arrow_drop_down</span>';
  helpButton.onclick = function() {
    document.querySelector('.help-menu').classList.toggle('active');
  };
  
  const helpMenu = document.createElement('ul');
  helpMenu.className = 'help-menu';
  
  // ヘルプメニューアイテム - ポップアップなしに変更して同じウィンドウで開く
  const helpItems = [
    { text: 'マニュアル', url: 'https://ed24lb.osaka-sandai.ac.jp/webclass/user.php/manual' },
    { text: 'FAQ', url: 'https://datapacific.zohodesk.com/portal/ja/kb/webclass-faq' },
    { text: 'よくある質問', url: 'https://www.osaka-sandai.ac.jp/cnt/qa_webclass_S.html', target: '_blank' },
    { text: '障害情報', url: 'https://www.google.com/appsstatus#hl=ja&v=status', target: '_blank' }
  ];
  
  helpItems.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.text;
    
    if (item.target) {
      a.target = item.target;
    }
    
    li.appendChild(a);
    helpMenu.appendChild(li);
  });
  
  helpDropdown.appendChild(helpButton);
  helpDropdown.appendChild(helpMenu);
  
  // 設定アイコン - 新しいウィンドウで開かないように変更
  const settingsLink = document.createElement('a');
  settingsLink.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/user.php/config';
  settingsLink.className = 'header-icon settings-icon';
  settingsLink.title = '設定';
  settingsLink.innerHTML = '<span class="material-icons">settings</span>';
  
  // ログアウトアイコン
  const logoutLink = document.createElement('a');
  logoutLink.href = 'https://ed24lb.osaka-sandai.ac.jp/webclass/logout.php';
  logoutLink.className = 'header-icon logout-icon';
  logoutLink.title = 'ログアウト';
  logoutLink.innerHTML = '<span class="material-icons">logout</span>';
  
  // 右側に配置
  rightContainer.appendChild(helpDropdown);
  rightContainer.appendChild(settingsLink);
  rightContainer.appendChild(logoutLink);
  
  navContainer.appendChild(rightContainer);
  newHeader.appendChild(navContainer);
  
  // 新しいヘッダーをbodyの最初に挿入
  const body = document.body;
  if (body) {
    body.insertBefore(newHeader, body.firstChild);
    console.log('新しいヘッダーを挿入しました');
    return true;
  } else {
    console.log('bodyが見つかりませんでした');
    return false;
  }
}

// マテリアルアイコンとGoogle Fontsを読み込む関数
function loadFonts() {
  // マテリアルアイコンのフォントを読み込む
  if (!document.querySelector('link[href*="fonts.googleapis.com/icon"]')) {
    const iconFont = document.createElement('link');
    iconFont.rel = 'stylesheet';
    iconFont.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(iconFont);
  }
  
  // Google FontsのRobotoを読み込む
  if (!document.querySelector('link[href*="fonts.googleapis.com/css2"]')) {
    const googleFont = document.createElement('link');
    googleFont.rel = 'stylesheet';
    googleFont.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(googleFont);
  }
}

// 曜日の日本語表記と英語略称のマッピング
const dayMapping = {
  '月': 'mon',
  '火': 'tue',
  '水': 'wed',
  '木': 'thu',
  '金': 'fri',
  '土': 'sat',
  '日': 'sun'
};

// 時限と時間帯のマッピング
const periodTimeMapping = {
  '1': { start: '9:00', end: '10:30' },
  '2': { start: '10:40', end: '12:10' },
  '3': { start: '12:50', end: '14:20' },
  '4': { start: '14:30', end: '16:00' },
  '5': { start: '16:10', end: '17:40' },
  '6': { start: '17:50', end: '19:20' },
  '7': { start: '19:30', end: '21:00' }
};

// 科目リストに今日の授業のハイライト表示を適用する関数
function highlightTodayClasses() {
  // トップページかindex.phpの場合のみ適用
  const path = window.location.pathname;
  if (!(path === '/webclass/' || 
      path.endsWith('/webclass') ||
      path === '/webclass' ||
      path === '/webclass/index.php/' ||
      path.endsWith('/webclass/index.php'))) {
    return;
  }
  
  // 現在の日付と時刻を取得
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 日本語曜日のマッピング配列
  const jpDays = ['日', '月', '火', '水', '木', '金', '土'];
  const currentDayJp = jpDays[currentDayIndex];
  
  // 現在の時限を判定
  let currentPeriod = null;
  for (const [period, timeRange] of Object.entries(periodTimeMapping)) {
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
  
  console.log(`今日の曜日: ${currentDayJp}, 現在の時限: ${currentPeriod || '授業時間外'}`);
  
  // 登録科目一覧の科目リンクを取得
  const courseLinks = document.querySelectorAll('.courseList li a');
  
  courseLinks.forEach(link => {
    const text = link.textContent;
    const courseInfoMatch = text.match(/(.+),(.+) 前期 ([月火水木金土日])(\d) (\d{4})/);
    
    if (courseInfoMatch) {
      const [, courseName, teacher, dayJp, period, year] = courseInfoMatch;
      
      // 今日の授業をハイライト
      if (dayJp === currentDayJp) {
        link.parentElement.classList.add('today-class');
        
        // 時間帯情報を追加
        const timeInfo = periodTimeMapping[period];
        if (timeInfo) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'course-time-info';
          timeSpan.textContent = ` (${timeInfo.start}～${timeInfo.end})`;
          link.appendChild(timeSpan);
        }
        
        // 現在の時限ならさらにハイライト
        if (period === currentPeriod) {
          link.parentElement.classList.add('current-period');
          
          // スクロールして表示範囲に入るようにする
          setTimeout(() => {
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 1000);
        }
      }
    }
  });
  
  // 凡例の追加
  addLegend();
}

// 凡例を追加する関数
function addLegend() {
  // すでに凡例があれば追加しない
  if (document.querySelector('.class-time-legend')) {
    return;
  }
  
  // 凡例を作成
  const legendContainer = document.createElement('div');
  legendContainer.className = 'class-time-legend';
  
  const legendTitle = document.createElement('h5');
  legendTitle.textContent = '授業時間帯';
  legendContainer.appendChild(legendTitle);
  
  const legendTable = document.createElement('table');
  legendTable.className = 'legend-table';
  
  // ヘッダー行を作成
  const headerRow = document.createElement('tr');
  const headerPeriod = document.createElement('th');
  headerPeriod.textContent = '時限';
  const headerTime = document.createElement('th');
  headerTime.textContent = '時間帯';
  headerRow.appendChild(headerPeriod);
  headerRow.appendChild(headerTime);
  legendTable.appendChild(headerRow);
  
  // 時限ごとの行を作成
  for (const [period, timeRange] of Object.entries(periodTimeMapping)) {
    const row = document.createElement('tr');
    const periodCell = document.createElement('td');
    periodCell.textContent = period;
    const timeCell = document.createElement('td');
    timeCell.textContent = `${timeRange.start}～${timeRange.end}`;
    row.appendChild(periodCell);
    row.appendChild(timeCell);
    legendTable.appendChild(row);
  }
  
  legendContainer.appendChild(legendTable);
  
  // 今日の授業の凡例
  const todayLegend = document.createElement('div');
  todayLegend.className = 'today-legend';
  const todaySpan = document.createElement('span');
  todaySpan.className = 'today-class-sample';
  todaySpan.textContent = '■';
  todayLegend.appendChild(todaySpan);
  todayLegend.appendChild(document.createTextNode(' 今日の授業'));
  legendContainer.appendChild(todayLegend);
  
  // 現在の授業の凡例
  const currentLegend = document.createElement('div');
  currentLegend.className = 'current-legend';
  const currentSpan = document.createElement('span');
  currentSpan.className = 'current-period-sample';
  currentSpan.textContent = '■';
  currentLegend.appendChild(currentSpan);
  currentLegend.appendChild(document.createTextNode(' 現在の授業'));
  legendContainer.appendChild(currentLegend);
  
  // コースリストの上部に凡例を追加
  const leftColumn = document.querySelector('.col-sm-3');
  if (leftColumn) {
    const firstChild = leftColumn.firstChild;
    if (firstChild) {
      leftColumn.insertBefore(legendContainer, firstChild);
    } else {
      leftColumn.appendChild(legendContainer);
    }
  }
}

// フッターにカスタマイズ情報を追加する関数
function customizeFooter() {
  const footer = document.querySelector('footer.ft-footer');
  if (!footer) return;
  
  const footerContainer = footer.querySelector('.container');
  if (!footerContainer) return;
  
  const customInfo = document.createElement('p');
  customInfo.className = 'ft-footer_custom';
  
  const customLink = document.createElement('a');
  customLink.href = 'https://github.com/kabuchin/';
  customLink.target = '_blank';
  customLink.textContent = 'Customized kabuchin';
  
  customInfo.appendChild(customLink);
  footerContainer.appendChild(customInfo);
}

// メインページのレイアウトを変更する関数
function modifyMainPageLayout() {
  // トップページとindex.phpに適用
  // パスをより厳密にチェック
  const path = window.location.pathname;
  if (!(path === '/webclass/' || 
      path.endsWith('/webclass') ||
      path === '/webclass' ||
      path === '/webclass/index.php/' ||
      path.endsWith('/webclass/index.php'))) {
    return;
  }
  
  console.log('WebClassメインページのレイアウト変更を適用します：' + path);
  
  // 左カラムを取得
  const leftColumn = document.querySelector('.col-sm-3');
  // 右カラムを取得
  const rightColumn = document.querySelector('.col-sm-9');
  
  if (!leftColumn || !rightColumn) {
    console.log('レイアウト要素が見つかりません');
    return;
  }
  
  // 検索ボックスの二重表示を防止
  // すでに移動済みかチェック
  if (document.getElementById('search-container')) {
    console.log('検索ボックスはすでに移動済みです');
    return;
  }
  
  // リンク欄を削除するより強力な方法
  function removeLinksBlock() {
    // すべてのサイドブロックを取得
    const allBlocks = document.querySelectorAll('.side-block-outer, .side-block');
    
    allBlocks.forEach(block => {
      // タイトル要素を見つける
      const titleElement = block.querySelector('.side-block-title, h4');
      if (titleElement && titleElement.textContent && 
          (titleElement.textContent.includes('リンク') || 
           titleElement.textContent.includes('課題実施状況一覧'))) {
        console.log(`ブロックを削除: ${titleElement.textContent}`);
        try {
          block.parentNode.removeChild(block);
        } catch (e) {
          console.log('削除エラー:', e);
          // 親要素が異なる場合は直接削除を試みる
          block.remove();
        }
      }
    });
    
    // ページ下部のモバイル用リンクブロックも削除
    const footerLinks = document.querySelectorAll('.side-block-outer.hidden-sm.hidden-md.hidden-lg');
    footerLinks.forEach(block => {
      try {
        if (block.parentNode) {
          block.parentNode.removeChild(block);
        } else {
          block.remove();
        }
      } catch (e) {
        console.log('フッターリンク削除エラー:', e);
      }
    });
  }
  
  // リンク欄削除を複数回試行
  removeLinksBlock();
  setTimeout(removeLinksBlock, 500);
  setTimeout(removeLinksBlock, 1500);
  
  // 右カラムから「コースの追加」ボタンを削除
  const addCourseButton = rightColumn.querySelector('a.btn.btn-default[href*="/courses/"]');
  if (addCourseButton) {
    // 親要素のdivごと削除
    const buttonContainer = addCourseButton.closest('div[align="right"]');
    if (buttonContainer) {
      buttonContainer.remove();
    } else {
      addCourseButton.remove();
    }
  }
  
  // 表示する学期を右カラムから左カラムに移動 - より具体的なセレクタを使用
  const yearHeading = rightColumn.querySelector('h4');
  if (yearHeading && yearHeading.textContent.trim() === '表示する学期') {
    console.log('表示する学期セクションを見つけました');
    // 次のdiv要素を取得（select要素を含む）
    const yearSelectDiv = yearHeading.nextElementSibling;
    if (yearSelectDiv && yearSelectDiv.tagName === 'DIV') {
      // 表示する学期のコンテナを作成
      const yearSelectorContainer = document.createElement('div');
      yearSelectorContainer.className = 'side-block';
      yearSelectorContainer.id = 'year-selector-container';
      yearSelectorContainer.style.marginBottom = '20px';
      
      const yearSelectorTitle = document.createElement('h4');
      yearSelectorTitle.className = 'side-block-title';
      yearSelectorTitle.textContent = '表示する学期';
      
      const yearSelectorContent = document.createElement('div');
      yearSelectorContent.className = 'side-block-content';
      
      // select要素をコピー
      const selects = yearSelectDiv.querySelectorAll('select');
      selects.forEach(select => {
        const newSelect = select.cloneNode(true);
        yearSelectorContent.appendChild(newSelect);
        // イベントハンドラの設定
        newSelect.addEventListener('change', function() {
          select.value = this.value;
          if (typeof document.condition !== 'undefined') {
            document.condition.submit();
          }
        });
      });
      
      yearSelectorContainer.appendChild(yearSelectorTitle);
      yearSelectorContainer.appendChild(yearSelectorContent);
      
      // 左カラムに挿入
      leftColumn.insertBefore(yearSelectorContainer, leftColumn.firstChild);
      
      // 元の要素を非表示
      yearHeading.style.display = 'none';
      yearSelectDiv.style.display = 'none';
    }
  }
  
  // 検索ボックスを右カラムから取得して左カラムに移動
  const searchBox = rightColumn.querySelector('#search_courses_left');
  if (searchBox) {
    // 新しいコンテナを作成
    const searchContainer = document.createElement('div');
    searchContainer.className = 'side-block';
    searchContainer.id = 'search-container';
    searchContainer.style.marginBottom = '20px';
    
    const searchTitle = document.createElement('h4');
    searchTitle.className = 'side-block-title';
    searchTitle.textContent = '科目検索';
    
    const searchContent = document.createElement('div');
    searchContent.className = 'side-block-content';
    
    // 検索ボックスのクローンを作成
    const newSearchBox = searchBox.cloneNode(true);
    newSearchBox.id = 'search_courses_left_new';
    newSearchBox.className = 'form-control';
    newSearchBox.style.width = '100%';
    
    // 検索機能を追加
    newSearchBox.addEventListener('keyup', function() {
      searchBox.value = this.value;
      const event = new Event('keyup');
      searchBox.dispatchEvent(event);
    });
    
    searchContent.appendChild(newSearchBox);
    searchContainer.appendChild(searchTitle);
    searchContainer.appendChild(searchContent);
    
    // 元の検索ボックスを非表示
    searchBox.style.display = 'none';
    
    // brタグを非表示
    const brAfterSearch = searchBox.nextElementSibling;
    if (brAfterSearch && brAfterSearch.tagName === 'BR') {
      brAfterSearch.style.display = 'none';
    }
    
    leftColumn.appendChild(searchContainer);
  }
  
  // 右カラムから「管理者からのお知らせ」を左カラムに移動
  const infoBox = document.getElementById('UserTopInfo');
  if (infoBox) {
    // お知らせのCSS改善を追加
    infoBox.classList.add('improved-info');
    leftColumn.appendChild(infoBox);
  }
  
  // 科目一覧の並び替え - [登録科目一覧]を一番上に
  function reorderCourseList() {
    const courseTreeItems = document.querySelectorAll('.courseTree.courseLevelOne > li');
    if (courseTreeItems.length === 0) return;
    
    let registeredCourseItem = null;
    
    // [登録科目一覧]を見つける
    for (let i = 0; i < courseTreeItems.length; i++) {
      const titleElement = courseTreeItems[i].querySelector('.courseTree-levelTitle');
      if (titleElement && titleElement.textContent.includes('[登録科目一覧]')) {
        registeredCourseItem = courseTreeItems[i];
        break;
      }
    }
    
    // 見つかった場合は一番上に移動
    if (registeredCourseItem) {
      const parent = registeredCourseItem.parentNode;
      parent.insertBefore(registeredCourseItem, parent.firstChild);
    }
  }
  
  // 科目一覧の並び替えを実行
  setTimeout(reorderCourseList, 300);
  
  // 左カラムの要素の並び替え
  function reorderLeftColumn() {
    const yearSelector = document.getElementById('year-selector-container');
    const searchContainer = document.getElementById('search-container');
    const infoContainer = document.getElementById('UserTopInfo');
    
    // 存在するものだけを配列に入れる
    const elements = [];
    
    if (yearSelector) {
      try {
        if (yearSelector.parentNode === leftColumn) {
          elements.push({ elem: yearSelector, type: 'year' });
          leftColumn.removeChild(yearSelector);
        }
      } catch (e) { console.log('要素取り外しエラー:', e); }
    }
    
    if (searchContainer) {
      try {
        if (searchContainer.parentNode === leftColumn) {
          elements.push({ elem: searchContainer, type: 'search' });
          leftColumn.removeChild(searchContainer);
        }
      } catch (e) { console.log('要素取り外しエラー:', e); }
    }
    
    if (infoContainer) {
      try {
        if (infoContainer.parentNode === leftColumn) {
          elements.push({ elem: infoContainer, type: 'info' });
          leftColumn.removeChild(infoContainer);
        }
      } catch (e) { console.log('要素取り外しエラー:', e); }
    }
    
    // 順番に左カラムに追加
    // 表示する学期 → 科目検索 → 管理者からのお知らせ
    const order = { year: 1, search: 2, info: 3 };
    elements.sort((a, b) => order[a.type] - order[b.type]);
    
    elements.forEach(item => {
      leftColumn.appendChild(item.elem);
    });
  }
  
  // 左カラムの要素の並び替えを実行
  setTimeout(reorderLeftColumn, 500);
  
  // 科目リストに今日の授業のハイライト表示を適用
  setTimeout(highlightTodayClasses, 1000);
  
  // フッターのカスタマイズ
  customizeFooter();
}

// ページの読み込みが完了したら実行する処理
function initializeCustomHeader() {
  console.log('WebClass カスタマイズ拡張機能を初期化中...');
  
  // フォントの読み込み
  loadFonts();
  
  // ヘッダー置き換えを試みる
  if (!replaceHeader()) {
    // 失敗した場合は少し待ってからもう一度試す
    setTimeout(replaceHeader, 500);
  }
  
  // メインページの場合はレイアウトも変更
  setTimeout(modifyMainPageLayout, 1000);
}

// DOMが読み込まれた直後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCustomHeader);
} else {
  // DOMがすでに読み込まれている場合は即時実行
  initializeCustomHeader();
}

// 念のため、ページが完全に読み込まれた後にもチェックする
window.addEventListener('load', function() {
  // ログインページではヘッダーをカスタマイズしない
  if (window.location.href.includes('/webclass/login.php')) {
    return;
  }
  
  if (!document.getElementById('sandai-custom-header')) {
    console.log('ヘッダーがまだ置き換えられていないため、再試行します');
    replaceHeader();
  }
  
  // メインページレイアウトの変更を再確認
  modifyMainPageLayout();
});

// DOM変更の監視（動的に変更される場合に対応）
const observer = new MutationObserver(function(mutations) {
  // ログインページではヘッダーをカスタマイズしない
  if (window.location.href.includes('/webclass/login.php')) {
    return;
  }
  
  if (!document.getElementById('sandai-custom-header') && document.querySelector('header')) {
    console.log('DOM変更を検知し、ヘッダーを置き換えます');
    replaceHeader();
  }
});

// body全体の変更を監視
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
