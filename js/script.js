// ==========================================
// ▼ 1. Firebaseの初期設定とデータベースの準備 ▼
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
// 【変更】Firestore用ではなく、Realtime Database用のモジュールを読み込む
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOo0pfhSTg1hEah0Ve7ENFmbNlunKXMag",
  authDomain: "the-naleio-wakukan.firebaseapp.com",
  databaseURL: "https://the-naleio-wakukan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "the-naleio-wakukan",
  storageBucket: "the-naleio-wakukan.firebasestorage.app",
  messagingSenderId: "957480004799",
  appId: "1:957480004799:web:82278bfda664a0d41e6a0a"
};


// Firebaseの起動と、データベース（db）の接続
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); // 【変更】getFirestore から getDatabase に変更

// ==========================================
// ▼ 2. UI操作プログラム ▼
// ==========================================
// 各種要素の取得
const startReserveBtn = document.getElementById('startReserveBtn');
const reserveDialog = document.getElementById('reserveDialog');
const confirmDialog = document.getElementById('confirmDialog');
const completeDialog = document.getElementById('completeDialog');
const detailDialog = document.getElementById('detailDialog');
const editDialog = document.getElementById('editDialog');

const reserveForm = document.getElementById('reserveForm');
const reserveDate = document.getElementById('reserveDate');
const reserveTime = document.getElementById('reserveTime');
const confirmData = document.getElementById('confirmData');
const detailContent = document.getElementById('detailContent');
const editMemo = document.getElementById('editMemo');

const backToMainBtn = document.getElementById('backToMainBtn');
const backToReserveBtn = document.getElementById('backToReserveBtn');
const finalSubmitBtn = document.getElementById('finalSubmitBtn');
const closeCompleteBtn = document.getElementById('closeCompleteBtn');
const saveEditBtn = document.getElementById('saveEditBtn');
const rulesDialogBtn = document.getElementById('rulesDialogBtn');
const rulesDialog = document.getElementById('rulesDialog');
const closeRulesBtn = document.getElementById('closeRulesBtn');

let currentSelectedKey = null; // 現在開いている予約のIDを保持


// ▼ ダイアログを常に中央で開き直すための関数 ▼
function showCentered(dialog) {
  dialog.style.margin = ''; // autoに戻す
  dialog.style.left = '';   // 移動履歴をリセット
  dialog.style.top = '';    // 移動履歴をリセット
  dialog.showModal();
}

// ▼ ダイアログをドラッグ可能にする処理 ▼
document.querySelectorAll('dialog').forEach(dialog => {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  // 最初は「動かせる」アイコンにしておく
  dialog.style.cursor = 'move';

  dialog.addEventListener('mousedown', (e) => {
    // 入力欄やボタン、文字を選択しようとした時はドラッグさせない
    const noDragElements = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'LABEL', 'TH', 'TD'];
    if (noDragElements.includes(e.target.tagName)) return;

    isDragging = true;
    
    // 現在のダイアログの座標を取得
    const rect = dialog.getBoundingClientRect();
    
    // デフォルトの中央揃え（margin: auto）を解除し、絶対座標で固定する
    dialog.style.margin = '0';
    dialog.style.left = rect.left + 'px';
    dialog.style.top = rect.top + 'px';

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    // マウスカーソルを「掴んでいる」状態にする
    dialog.style.cursor = 'grabbing';
    // ドラッグ中にテキストが選択されるのを防ぐ
    document.body.style.userSelect = 'none'; 
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // マウスの移動量を計算してダイアログを動かす
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dialog.style.left = (initialLeft + dx) + 'px';
    dialog.style.top = (initialTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      dialog.style.cursor = 'move'; // 元のカーソルに戻す
      document.body.style.userSelect = ''; // テキスト選択防止を解除
    }
  });
});

// ==========================================
// ▼ 日付と時間帯の制限 ▼
// ==========================================
// ページの読み込み完了時に日付と時間の選択肢を初期化
window.addEventListener('DOMContentLoaded', () => {
  setupDateTimeRestrictions();
});

// ★追加・移動：YYYY-MM-DD 形式に変換する補助関数を、どこからでも使えるここに出す
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 日付と時間帯の制限を設定する関数
function setupDateTimeRestrictions() {
  const today = new Date();
  // 月末の日付を取得（翌月の0日を指定すると、今月の末日になる）
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // 今日を「最小日付」に設定
  reserveDate.min = formatDate(today);
  // 月末を「最大日付」に設定
  reserveDate.max = formatDate(endOfMonth);

  // 時間帯の選択肢生成（ここはそのまま）
  reserveTime.innerHTML = '<option value="">選択してください</option>';
  for (let hour = 8; hour < 22; hour += 2) {
    const start = String(hour).padStart(2, '0') + ':00';
    const end = String(hour + 2).padStart(2, '0') + ':00';
    const option = document.createElement('option');
    option.value = `${start}～${end}`;
    option.textContent = `${start} ～ ${end}`;
    reserveTime.appendChild(option);
  }
}

// ==========================================
// ▼ ルール詳細 ダイアログの開閉 ▼
// ==========================================
// 「詳細ルール」ボタン -> ダイアログを中央で開く
rulesDialogBtn.addEventListener('click', () => {
  showCentered(rulesDialog);
});

// 「閉じる」ボタン -> ダイアログを閉じる
closeRulesBtn.addEventListener('click', () => {
  rulesDialog.close();
});

// ==========================================
// ▼ 追加：サークルの所有日（曜日・週）のバリデーション ▼
// ==========================================
const circleSelect = document.querySelector('select[name="circle"]');

function validateDateRule() {
  const selectedDateStr = reserveDate.value;
  const selectedCircle = circleSelect.value;

  // サークルと日付の両方が入力されていない場合はチェックしない
  if (!selectedDateStr || !selectedCircle) return; 

  const date = new Date(selectedDateStr);
  const dayOfWeek = date.getDay(); // 0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土
  
  // その月の中で「第何週目か」を計算（日付を7で割って切り上げ）
  const weekOfMonth = Math.ceil(date.getDate() / 7); 

  let isValid = false;

  if (selectedCircle === '枠管') {
    // ★追加：枠管はすべての曜日・週で予約可能とする
    isValid = true;
  } else if (selectedCircle === 'ナレオ') {
    // ナレオ：火(2)、木(4)、土(6)、日(0)の偶数週
    if ([2, 4, 6].includes(dayOfWeek) || (dayOfWeek === 0 && weekOfMonth % 2 === 0)) {
      isValid = true;
    }
  } else if (selectedCircle === 'ダンモ') {
    // ダンモ：月(1)、水(3)、金(5)、日(0)の奇数週
    if ([1, 3, 5].includes(dayOfWeek) || (dayOfWeek === 0 && weekOfMonth % 2 !== 0)) {
      isValid = true;
    }
  }

  // ルール外の日付だった場合、警告を出して日付の入力をリセットする
  if (!isValid) {
    alert(`${selectedCircle}の所有日ではありません。\n申請するには幹部へ相談してください。`);
    reserveDate.value = ''; // 入力された日付を空にする
  }
}

// サークル名が変更された時と、日付が変更された時の両方でチェックを実行する
circleSelect.addEventListener('change', validateDateRule);
reserveDate.addEventListener('change', validateDateRule);


// 1. 「予約する」ボタンクリック -> 2のダイアログを開く
startReserveBtn.addEventListener('click', () => {
  reserveForm.reset(); // フォームをクリア
  showCentered(reserveDialog);
});

// 2. 「戻る」ボタン -> 元のページに戻る（ダイアログを閉じる）
backToMainBtn.addEventListener('click', () => {
  reserveDialog.close();
});

let currentFormData = null; // フォームデータを一時保存するための変数

// 2. 「確認」ボタン（フォーム送信時）
reserveForm.addEventListener('submit', (event) => {
  event.preventDefault(); 
  
  const formData = new FormData(reserveForm);
  // FormDataを扱いやすいようにオブジェクトに変換して保存
  currentFormData = Object.fromEntries(formData.entries()); 
  
  confirmData.innerHTML = `
    <p><strong>サークル名:</strong> ${currentFormData.circle}</p>
    <p><strong>バンド名、個人名:</strong> ${currentFormData.name}</p>
    <p><strong>内容:</strong> ${currentFormData.content}</p>
    <p><strong>日付:</strong> ${currentFormData.date}</p>
    <p><strong>時間帯:</strong> ${currentFormData.time}</p>
    <p><strong>備考:</strong> ${currentFormData.memo || 'なし'}</p>
  `;

  reserveDialog.close();
  showCentered(confirmDialog);
});

// 3. 「戻る」ボタン -> 2のダイアログに戻る
backToReserveBtn.addEventListener('click', () => {
  confirmDialog.close();
  showCentered(reserveDialog); // 入力内容は保持されたまま開きます
});

// 3. 「予約する」ボタン -> データベースに保存し、表に反映して4のダイアログへ
finalSubmitBtn.addEventListener('click', async () => {
  confirmDialog.close();
  
  try {
    // 【変更】Realtime Databaseの "reservations" という場所にデータを追加(push)する
    await push(ref(db, "reservations"), currentFormData);
    
    // ▼ この行を削除（またはコメントアウト）します ▼
    // reflectToCalendar(currentFormData);
    
    // ③ 完了画面を出す
    showCentered(completeDialog);
    
  } catch (error) {
    console.error("データの保存に失敗しました: ", error);
    alert("予約の保存に失敗しました。通信環境を確認してもう一度お試しください。");
  }
});

// 4. 「閉じる」ボタン -> 最初のページへ戻る
closeCompleteBtn.addEventListener('click', () => {
  completeDialog.close();
});

// ▼ 新しく追加する関数：カレンダー表へ書き込む処理 ▼
// ▼ カレンダー表へ書き込む処理 ▼
function reflectToCalendar(data) {
  console.log("描画開始:", data); // これを追加

  if (!data) return;

  const dateObj = new Date(data.date);
  const dayOfWeek = dateObj.getDay(); 
  
  // ① 曜日から、対象の列番号（0:時間, 1:月, 2:火 ... 7:日）を決定する
  // 日曜日は 0 なので 7 に変換、それ以外はそのままの数字を使う
  const colIndex = dayOfWeek === 0 ? 7 : dayOfWeek; 
  console.log("計算された列インデックス:", colIndex); // これを追加

  // ② 時間帯から、対象の行（上からの順番）を決定する
  const timeRows = {
    "08:00～10:00": 0, "10:00～12:00": 1, "12:00～14:00": 2,
    "14:00～16:00": 3, "16:00～18:00": 4, "18:00～20:00": 5, "20:00～22:00": 6
  };
  // ▼ ここで時間とrowIndexをログに出す ▼
  console.log("予約データ上の時間:", data.time);
  console.log("検索結果のrowIndex:", timeRows[data.time]);

  const rowIndex = timeRows[data.time];

  if (rowIndex === undefined) return;

  // ③ HTMLのテーブルから該当するセル(td)を見つける
  const table = document.getElementById('reservation_table'); 
  const targetRow = table.tBodies[0].rows[rowIndex];
  
  // ★ クラス名での検索をやめ、セルの番号で直接指定！
  const targetCell = targetRow.cells[colIndex];

  if (targetCell) {
    const dateParts = data.date.split('-'); 
    const shortDate = `${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}`; 
    const memoText = data.memo ? ` ${data.memo}` : '';
    const displayText = `${data.circle}/${data.name} (${data.content})<br>${shortDate}${memoText}`;

    // ★ data-id="${key}" を追加。これでクリック時にIDが取れるようになります
    const newReservationHtml = `<div class="reservation-item" data-id="${data.key}" style="cursor: pointer;">
      ${displayText}
    </div>`;
    targetCell.innerHTML += newReservationHtml;
  }
}

// ▼ カレンダーの枠の中身（予約ブロック）だけを一旦すべて消す関数 ▼
function clearCalendar() {
  const table = document.getElementById('reservation_table');
  const rows = table.tBodies[0].rows;
  
  for (let i = 0; i < rows.length; i++) {
    // ★ セル番号1（月曜）から 7（日曜）までの中身を空にする
    for (let col = 1; col <= 7; col++) {
      rows[i].cells[col].innerHTML = '';
    }
  }
}

// データベースの "reservations" という場所を常に監視する
const reservationsRef = ref(db, "reservations");


// ==========================================
// ▼ 予約詳細　クリックイベントの実装 ▼
// ==========================================
document.getElementById('reservation_table').addEventListener('click', (e) => {
  const item = e.target.closest('.reservation-item');
  if (!item) return; // 予約ブロック以外がクリックされたら無視

  const key = item.getAttribute('data-id');
  currentSelectedKey = key;

  // Firebaseから該当IDのデータを検索（全データから探す）
  const allData = window.currentAllReservations; // ※後述の修正が必要
  const data = allData[key];

  detailContent.innerHTML = `
    <p><strong>サークル:</strong> ${data.circle}</p>
    <p><strong>名前:</strong> ${data.name}</p>
    <p><strong>内容:</strong> ${data.content}</p>
    <p><strong>日時:</strong> ${data.date} ${data.time}</p>
    <p><strong>備考:</strong> ${data.memo || 'なし'}</p>
  `;
  
  showCentered(detailDialog);
});

// 1.「編集」ボタンが押されたら編集ダイアログを開く
document.getElementById('editReserveBtn').addEventListener('click', () => {
  const data = window.currentAllReservations[currentSelectedKey];
  
  // 既存のデータをそれぞれの入力欄にセットする
  document.getElementById('editName').value = data.name || '';
  document.getElementById('editContent').value = data.content || '';
  document.getElementById('editMemo').value = data.memo || ''; 
  
  detailDialog.close();
  showCentered(editDialog);
});

// 2.「保存」ボタンが押されたらFirebaseを更新
saveEditBtn.addEventListener('click', () => {
  // 入力された値を取得
  const newName = document.getElementById('editName').value;
  const newContent = document.getElementById('editContent').value;
  const newMemo = document.getElementById('editMemo').value;

  // 「内容」は必須なのでチェック
  if (!newContent) {
    alert("内容を選択してください。");
    return;
  }

  // Firebaseのデータを上書き更新（名前と内容も追加）
  update(ref(db, `reservations/${currentSelectedKey}`), {
    name: newName,
    content: newContent,
    memo: newMemo
  }).then(() => {
    editDialog.close();
    alert("予約内容を更新しました");
  });
});

// 【削除ボタン】
document.getElementById('deleteReserveBtn').addEventListener('click', () => {
  if (confirm("本当にこの予約を取り消ししますか？")) {
    remove(ref(db, `reservations/${currentSelectedKey}`));
    detailDialog.close();
    alert("予約を取り消しました。");
  }
});



// ==========================================
// ▼ 予約カレンダー 週切り替え・描画処理 ▼
// ==========================================
// 初期週の設定（ページロード時に実行）
function getTodayWeekIndex() {
  return getWeekOfMonth(new Date());
}

let currentWeek = getTodayWeekIndex();

// 矢印ボタンのイベント設定
document.getElementById('prevWeekBtn').addEventListener('click', () => {
  if (currentWeek > 1) { currentWeek--; updateDisplay(); }
});

document.getElementById('nextWeekBtn').addEventListener('click', () => {
  if (currentWeek < 6) { currentWeek++; updateDisplay(); } // 最大6週目まである月への対応
});

// 【修正】日付からその月の「第何週か」を正確に算出（月またぎのバグ防止）
function getWeekOfMonth(date) {
  const firstDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDate.getDay();
  const diff = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  const week1Monday = new Date(date.getFullYear(), date.getMonth(), 1 + diff);
  
  const diffTime = date.getTime() - week1Monday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.floor(diffDays / 7) + 1;
}

// 【新規追加】指定した週の「<第O週 月/日〜月/日>」テキストを自動生成する関数
function getWeekDateString(weekIndex) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // 今月1日の曜日を取得して、第1週の月曜日を計算
  const firstDate = new Date(year, month, 1);
  const firstDayOfWeek = firstDate.getDay();
  const diff = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  const week1Monday = new Date(year, month, 1 + diff);

  // 表示したい週の月曜日と日曜日を計算
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekIndex - 1) * 7);

  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  // 月と日を取り出す
  const startText = `${targetMonday.getMonth() + 1}/${targetMonday.getDate()}`;
  const endText = `${targetSunday.getMonth() + 1}/${targetSunday.getDate()}`;

  // <第1週 6/1~6/7> の形で返す
  return `第${weekIndex}週　${startText} 〜 ${endText}`;
}

// ▼ 唯一の updateDisplay 関数 ▼
function updateDisplay() {
  // ★ここで「第◯週」から「<第O週 O/OO~O/OO>」に文字を差し替え
  document.getElementById('weekLabel').textContent = getWeekDateString(currentWeek);
  
  clearCalendar();
  if (window.currentAllReservations) {
    const todayStr = formatDate(new Date()); 
    const currentMonth = new Date().getMonth(); // 今の月

    for (const key in window.currentAllReservations) {
      const reserveData = { ...window.currentAllReservations[key], key: key };
      
      // 過去の予約データは削除
      if (reserveData.date < todayStr) {
        remove(ref(db, `reservations/${key}`));
        continue; 
      }
      
      const d = new Date(reserveData.date);
      // ★今の月の予約、かつ、表示している週番号と一致するものだけ表示
      if (d.getMonth() === currentMonth && getWeekOfMonth(d) === currentWeek) {
        reflectToCalendar(reserveData);
      }
    }
  }
}

// データベース監視
onValue(reservationsRef, (snapshot) => {
  // ロード中の表示切り替え
  document.getElementById('loading_message').style.display = 'none';
  document.getElementById('reservation_table').style.display = 'table';
  document.getElementById('calendar_nav').style.display = 'block';

  if (snapshot.exists()) {
    window.currentAllReservations = snapshot.val();
  } else {
    window.currentAllReservations = {};
  }
  
  updateDisplay(); 
});