let capture;
let handpose;
let facemesh;
let predictions = [];
let facePredictions = [];

// 示範畫面 (Attract Mode) 用的陣列
let stars = [];
let demoLasers = [];
let demoEnemies = [];
let demoParticles = [];

// 圖片素材
let planeImg;
let bulletImg;
let beamImg;

// 遊戲狀態管理
let gameState = "DETECTING"; // 可分為 "DETECTING" (掃描), "SUCCESS", "FADE_IN", "LOGIN" (登入展示), "PLAYING"
let detectStartTime = 0;     // 記錄符合條件的開始時間
let successStartTime = 0;    // 記錄打勾動畫的開始時間
let fadeInStartTime = 0;     // 記錄淡入動畫的開始時間
const REQUIRED_TIME = 5000;  // 需維持動作 5 秒 (5000 毫秒)
let hoverButton = null;      // 目前手部懸停的按鈕 ("START" 或是 "SETTINGS")
let hoverStartTime = 0;      // 開始懸停的時間
let isMusicOn = true;        // 設定：音樂是否開啟
let isSfxOn = true;          // 設定：音效是否開啟

function preload() {
  // 關閉 CPU 運算，讓瀏覽器使用 GPU (WebGL) 加速，大幅提升效能！
  // ml5.setBackend("cpu");
  // 使用新版 ml5.js (v1.0+) 的 handPose 模型，注意 P 是大寫
  handpose = ml5.handPose();
  // 加入 faceMesh 臉部網格模型
  facemesh = ml5.faceMesh();

  // 載入圖片素材 (建議使用英文檔名避免編碼錯誤，請確認您的檔案已改為以下名稱)
  planeImg = loadImage("plane.jpg");
  bulletImg = loadImage("bullet.jpg");
  beamImg = loadImage("beam.jpg");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.hide();

  // 開始持續偵測攝影機畫面中的手部
  handpose.detectStart(capture, results => {
    predictions = results;
  });
  // 開始持續偵測攝影機畫面中的臉部
  facemesh.detectStart(capture, results => {
    facePredictions = results;
  });

  // 初始化星空背景
  for (let i = 0; i < 100; i++) {
    stars.push({ x: random(windowWidth), y: random(windowHeight), speed: random(2, 6), size: random(1, 3) });
  }
}

function draw() {
  // 如果是登入展示畫面、設定畫面或正在淡入登入畫面，直接繪製並提早返回 (不畫攝影機)
  if (gameState === "LOGIN" || gameState === "SETTINGS" || gameState === "FADE_IN") {
    drawLoginScreen();

    if (gameState === "FADE_IN") {
      // 淡入黑幕 (透明度從 255 到 0)
      let alpha = map(millis() - fadeInStartTime, 0, 1000, 255, 0, true);
      fill(0, 0, 0, alpha);
      noStroke();
      rect(0, 0, windowWidth, windowHeight); // 覆蓋整個畫面

      if (alpha <= 0) {
        gameState = "LOGIN";
      }
    }
    return; 
  }

  // 根據不同狀態給予不同的背景顏色
  if (gameState === "DETECTING" || gameState === "SUCCESS") {
    background(0); // 掃描時使用純黑背景增加科技感
  } else {
    background('#e7c6ff'); // 進入遊戲後的背景
  }

  const videoWidth = windowWidth * 0.85;
  const videoHeight = windowHeight * 0.85;
  const x = (windowWidth - videoWidth) / 2;
  const y = (windowHeight - videoHeight) / 2;

  push();
  translate(x + videoWidth, y);
  scale(-1, 1);
  
  if (gameState === "DETECTING" || gameState === "SUCCESS") {
    // X光掃描儀器濾鏡風格：加上綠色半透明濾鏡
    tint(0, 255, 65, 120);
    image(capture, 0, 0, videoWidth, videoHeight);
    noTint();

    if (gameState === "DETECTING") {
      // 繪製由上往下的掃描雷射線動畫
      let scanY = (millis() * 0.25) % videoHeight;
      stroke(0, 255, 65);
      strokeWeight(3);
      line(0, scanY, videoWidth, scanY);
      // 掃描線上方留下一層餘輝
      fill(0, 255, 65, 30);
      noStroke();
      rect(0, 0, videoWidth, scanY);
    }
  } else {
    // 正常遊戲影像
    image(capture, 0, 0, videoWidth, videoHeight);
  }
  
  // 當攝影機確實有畫面時，再開始繪製追蹤點
  if (capture.width > 0) {
    // 所有狀態都繪製追蹤點
    drawKeypoints(videoWidth, videoHeight);
    drawFaceKeypoints(videoWidth, videoHeight);
  }
  
  pop();

  // --- 繪製文字與 UI (在 pop 之後，避免文字被左右翻轉) ---
  if (capture.width > 0) {
    textFont('Courier New'); // 使用等寬字體維持科技感
    textAlign(CENTER, CENTER);
    
    if (gameState === "DETECTING") {
      // 繪製掃描範圍的科技感邊框與網格
      drawScannerFrame(x, y, videoWidth, videoHeight);

      // 檢查條件：是否同時有 1 張臉 與 2 隻手
      let isPlayerReady = (facePredictions.length >= 1) && (predictions.length >= 2);

      if (isPlayerReady) {
        if (detectStartTime === 0) detectStartTime = millis(); // 剛符合條件，開始計時
        
        let elapsedTime = millis() - detectStartTime;
        let remainingSec = Math.ceil((REQUIRED_TIME - elapsedTime) / 1000);
        // 計算 0 ~ 1 之間的進度比例
        let progress = Math.min(elapsedTime / REQUIRED_TIME, 1);

        drawTechUI(`TARGET LOCKED. HOLD STILL... ${remainingSec}S`, '#00ff41', progress); // 綠色配進度條

        if (elapsedTime >= REQUIRED_TIME) {
          gameState = "SUCCESS"; // 時間到，進入成功動畫
          successStartTime = millis();
        }
      } else {
        detectStartTime = 0; // 條件中斷，重置計時器
        drawTechUI("AWAITING PLAYER...\nPLEASE SHOW FACE AND BOTH HANDS IN FRAME", '#ff003c', 0);
      }
    } else if (gameState === "SUCCESS") {
      drawScannerFrame(x, y, videoWidth, videoHeight);
      drawTechUI("ACCESS GRANTED.", '#00ff41', 1);

      // 畫出帶有動態進度的打勾動畫 (0 到 500 毫秒)
      let checkProgress = map(millis() - successStartTime, 0, 500, 0, 1, true);
      drawCheckmark(windowWidth / 2, windowHeight / 2 - 50, checkProgress);

      // 停留 1.5 秒後進入淡入狀態
      if (millis() - successStartTime > 1500) {
        gameState = "FADE_IN";
        fadeInStartTime = millis();
      }
    } else if (gameState === "PLAYING") {
      // 遊戲進行中的 UI 提示
      fill('#00ff41');
      textSize(24);
      text("SYSTEM ONLINE: GAME STARTED", windowWidth / 2, 40);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 將手部節點繪製在畫面上的專屬函式
function drawKeypoints(vw, vh) {
  // ml5 回傳的座標是基於攝影機原始解析度。
  // 因為我們在畫布上將影像縮放至 85%，所以這裡必須計算對應的縮放比例，追蹤點才會精準對齊手指。
  let scaleX = vw / capture.width;
  let scaleY = vh / capture.height;

  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];
    // 新版 ml5 回傳的特徵點陣列名稱為 keypoints
    for (let j = 0; j < prediction.keypoints.length; j += 1) {
      const keypoint = prediction.keypoints[j];
      fill(0, 255, 0); // 設定節點顏色為綠色
      noStroke();
      // 新版座標格式改為 keypoint.x 與 keypoint.y
      ellipse(keypoint.x * scaleX, keypoint.y * scaleY, 10, 10);
    }
  }
}

// 將臉部節點繪製在畫面上的專屬函式
function drawFaceKeypoints(vw, vh) {
  let scaleX = vw / capture.width;
  let scaleY = vh / capture.height;

  for (let i = 0; i < facePredictions.length; i += 1) {
    const prediction = facePredictions[i];
    for (let j = 0; j < prediction.keypoints.length; j += 1) {
      const keypoint = prediction.keypoints[j];
      fill(0, 255, 65, 150); // 設定為半透明的科技綠
      noStroke();
      ellipse(keypoint.x * scaleX, keypoint.y * scaleY, 3, 3); // 臉部節點較多，畫小一點
    }
  }
}

// 繪製掃描器外框與網格的函式
function drawScannerFrame(x, y, w, h) {
  stroke('#00ff41');
  strokeWeight(5);
  noFill();
  const l = 50; // 邊角線段長度

  // 畫四個角落的框線 (左上、右上、左下、右下)
  beginShape(); vertex(x + l, y); vertex(x, y); vertex(x, y + l); endShape();
  beginShape(); vertex(x + w - l, y); vertex(x + w, y); vertex(x + w, y + l); endShape();
  beginShape(); vertex(x + l, y + h); vertex(x, y + h); vertex(x, y + h - l); endShape();
  beginShape(); vertex(x + w - l, y + h); vertex(x + w, y + h); vertex(x + w, y + h - l); endShape();

  // 畫淡淡的背景網格 (雷達感)
  stroke(0, 255, 65, 40);
  strokeWeight(1);
  for (let i = 1; i < 10; i++) {
    line(x + (w / 10) * i, y, x + (w / 10) * i, y + h);
    line(x, y + (h / 10) * i, x + w, y + (h / 10) * i);
  }
}

// 繪製科技感資訊框的函式
function drawTechUI(msg, textColor, progress = 0) {
  const boxWidth = 600;
  const boxHeight = 100;
  const cx = windowWidth / 2;
  const cy = windowHeight - 100;

  // 畫半透明底框
  fill(0, 20, 0, 200);
  stroke(textColor);
  strokeWeight(2);
  rect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth, boxHeight);

  // 畫進度條填充
  if (progress > 0) {
    fill(0, 255, 65, 60); // 半透明綠色的進度條
    noStroke();
    rect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth * progress, boxHeight);
  }

  // 畫文字
  fill(textColor);
  noStroke();
  textSize(24);
  text(msg, cx, cy);
}

// 繪製打勾動畫的函式
function drawCheckmark(cx, cy, progress) {
  push();
  stroke('#00ff41');
  strokeWeight(15);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  noFill();
  
  // 增加科技發光感
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = '#00ff41';

  let p1 = { x: cx - 40, y: cy + 10 };
  let p2 = { x: cx - 10, y: cy + 40 };
  let p3 = { x: cx + 50, y: cy - 30 };

  beginShape();
  if (progress > 0) {
    vertex(p1.x, p1.y);
    if (progress < 0.5) {
      let t = progress * 2;
      vertex(lerp(p1.x, p2.x, t), lerp(p1.y, p2.y, t));
    } else {
      vertex(p2.x, p2.y);
      let t = (progress - 0.5) * 2;
      vertex(lerp(p2.x, p3.x, t), lerp(p2.y, p3.y, t));
    }
  }
  endShape();
  pop();
}

// --- 以下為新增的登入展示畫面 (Attract Mode) 相關函式 ---

function drawLoginScreen() {
  push();
  background(0, 10, 0); // 深黑綠色背景

  // 1. 繪製並更新星空背景
  fill(0, 255, 65, 150);
  noStroke();
  for (let i = 0; i < stars.length; i++) {
    let s = stars[i];
    ellipse(s.x, s.y, s.size);
    s.y += s.speed;
    if (s.y > windowHeight) {
      s.y = 0;
      s.x = random(windowWidth);
    }
  }

  // 2. 模擬戰鬥機移動 (使用 sine 函數在畫面下方左右平滑移動)
  let planeX = windowWidth / 2 + sin(millis() * 0.0015) * (windowWidth * 0.3);
  let planeY = windowHeight - 180;

  // 自動發射雷射 (每 15 幀發射一次)
  if (frameCount % 15 === 0) {
    // 交替發射光束與子彈
    let weaponType = (frameCount % 30 === 0) ? "bullet" : "beam";
    demoLasers.push({ x: planeX, y: planeY - 30, type: weaponType });
  }

  // 自動產生敵人 (每 40 幀產生一台)
  if (frameCount % 40 === 0) {
    demoEnemies.push({ x: random(windowWidth * 0.2, windowWidth * 0.8), y: -50 });
  }

  // 3. 更新與繪製雷射
  imageMode(CENTER);
  for (let i = demoLasers.length - 1; i >= 0; i--) {
    let l = demoLasers[i];
    if (l.type === "bullet") {
      image(bulletImg, l.x, l.y - 15, 20, 40); // 繪製子彈
    } else {
      image(beamImg, l.x, l.y - 15, 30, 60); // 繪製光束
    }
    l.y -= 15; // 雷射往上飛
    if (l.y < 0) demoLasers.splice(i, 1); // 超出邊界移除
  }

  // 4. 更新與繪製敵人，並偵測碰撞
  for (let i = demoEnemies.length - 1; i >= 0; i--) {
    let e = demoEnemies[i];
    e.y += 4; // 敵人往下飛
    
    // 畫敵人 (紅色菱形)
    fill(20, 0, 0, 200);
    stroke(255, 0, 60);
    strokeWeight(2);
    beginShape();
    vertex(e.x, e.y);
    vertex(e.x - 20, e.y - 20);
    vertex(e.x, e.y - 40);
    vertex(e.x + 20, e.y - 20);
    endShape(CLOSE);

    // 碰撞偵測 (雷射 hit 敵人)
    for (let j = demoLasers.length - 1; j >= 0; j--) {
      let l = demoLasers[j];
      if (dist(l.x, l.y, e.x, e.y - 20) < 30) {
        // 產生爆炸粒子
        demoParticles.push({ x: e.x, y: e.y - 20, life: 255 });
        demoEnemies.splice(i, 1);
        demoLasers.splice(j, 1);
        break; // 該敵人已死，跳出雷射檢查迴圈
      }
    }
    // 若沒被打死但超出畫面，則移除
    if (demoEnemies[i] && demoEnemies[i].y > windowHeight + 50) {
      demoEnemies.splice(i, 1);
    }
  }

  // 5. 繪製爆炸粒子
  noStroke();
  for (let i = demoParticles.length - 1; i >= 0; i--) {
    let p = demoParticles[i];
    fill(255, 65, 0, p.life);
    ellipse(p.x, p.y, (255 - p.life) / 1.5); // 隨壽命變大
    p.life -= 15; // 漸漸消失
    if (p.life <= 0) demoParticles.splice(i, 1);
  }

  // 6. 繪製示範用戰鬥機
  imageMode(CENTER);
  // 繪製飛機圖片，可依據您實際素材的長寬比例調整大小 (這裡預設 100x100)
  image(planeImg, planeX, planeY, 100, 100); 

  // 7. 繪製登入介面文字 UI
  textFont('Courier New');
  textAlign(CENTER, CENTER);
  fill(0, 255, 65);
  textSize(54);
  text("FACE-TRACKING STRIKER", windowWidth / 2, windowHeight * 0.3);
  
  // 讓 DEMO MODE 文字產生街機般的閃爍效果
  if (frameCount % 60 < 30) {
    textSize(20);
    text("> DEMO MODE : SYSTEM ENGAGED <", windowWidth / 2, windowHeight * 0.38);
  }

  let cx = windowWidth / 2;
  let currentHover = null;
  let activeCursor = null;

  // 處理手部游標邏輯 (支援雙手)
  let cursors = [];
  if (predictions.length > 0 && capture.width > 0) {
    // 取出最多兩隻手的食指指尖 (keypoint 8)
    let handsCount = Math.min(predictions.length, 2);
    for (let i = 0; i < handsCount; i++) {
      let indexFinger = predictions[i].keypoints[8];
      // 將攝影機座標映射到全螢幕，X 軸加上反轉讓移動直覺如鏡子
      let cX = map(indexFinger.x, 0, capture.width, windowWidth, 0);
      let cY = map(indexFinger.y, 0, capture.height, 0, windowHeight);
      cursors.push({ x: cX, y: cY });
    }
  }

  if (gameState === "LOGIN") {
    // 繪製選單按鈕
    let btnStart = { x: cx - 150, y: windowHeight * 0.55, w: 300, h: 60, id: "START", label: "START GAME" };
    let btnSettings = { x: cx - 150, y: windowHeight * 0.7, w: 300, h: 60, id: "SETTINGS", label: "SETTINGS" };

    drawMenuButton(btnStart);
    drawMenuButton(btnSettings);

    // 檢查游標是否在按鈕內
    for (let c of cursors) {
      if (c.x > btnStart.x && c.x < btnStart.x + btnStart.w && c.y > btnStart.y && c.y < btnStart.y + btnStart.h) {
        currentHover = "START";
        activeCursor = c;
      } else if (c.x > btnSettings.x && c.x < btnSettings.x + btnSettings.w && c.y > btnSettings.y && c.y < btnSettings.y + btnSettings.h) {
        currentHover = "SETTINGS";
        activeCursor = c;
      }
    }
  } else if (gameState === "SETTINGS") {
    let panelY = windowHeight * 0.55;

    // 畫設定面板底框
    fill(0, 20, 0, 200);
    stroke('#00ff41');
    strokeWeight(2);
    rect(cx - 250, panelY - 50, 500, 200, 10);

    fill('#00ff41');
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text("是 (YES)", cx + 50, panelY - 15);
    text("否 (NO)", cx + 150, panelY - 15);

    textAlign(RIGHT, CENTER);
    text("音樂 (MUSIC)", cx - 20, panelY + 35);
    text("音效 (SFX)", cx - 20, panelY + 95);

    let musicYesBox = { x: cx + 30, y: panelY + 15, w: 40, h: 40 };
    let musicNoBox = { x: cx + 130, y: panelY + 15, w: 40, h: 40 };
    let sfxYesBox = { x: cx + 30, y: panelY + 75, w: 40, h: 40 };
    let sfxNoBox = { x: cx + 130, y: panelY + 75, w: 40, h: 40 };

    drawCheckbox(musicYesBox, isMusicOn);
    drawCheckbox(musicNoBox, !isMusicOn);
    drawCheckbox(sfxYesBox, isSfxOn);
    drawCheckbox(sfxNoBox, !isSfxOn);

    let btnBack = { x: cx - 150, y: panelY + 170, w: 300, h: 60, id: "BACK", label: "BACK TO MENU" };
    drawMenuButton(btnBack);

    // 檢查游標互動
    for (let c of cursors) {
      // 只要游標碰到方框，就改變設定 (無需停留)
      if (c.x > musicYesBox.x && c.x < musicYesBox.x + musicYesBox.w && c.y > musicYesBox.y && c.y < musicYesBox.y + musicYesBox.h) isMusicOn = true;
      if (c.x > musicNoBox.x && c.x < musicNoBox.x + musicNoBox.w && c.y > musicNoBox.y && c.y < musicNoBox.y + musicNoBox.h) isMusicOn = false;
      if (c.x > sfxYesBox.x && c.x < sfxYesBox.x + sfxYesBox.w && c.y > sfxYesBox.y && c.y < sfxYesBox.y + sfxYesBox.h) isSfxOn = true;
      if (c.x > sfxNoBox.x && c.x < sfxNoBox.x + sfxNoBox.w && c.y > sfxNoBox.y && c.y < sfxNoBox.y + sfxNoBox.h) isSfxOn = false;

      // Back 按鈕需要停留 3 秒
      if (c.x > btnBack.x && c.x < btnBack.x + btnBack.w && c.y > btnBack.y && c.y < btnBack.y + btnBack.h) {
        currentHover = "BACK";
        activeCursor = c;
      }
    }
  }

  // 根據懸停狀態更新計時器與繪製進度光圈
  if (currentHover !== null) {
    if (hoverButton !== currentHover) {
      hoverButton = currentHover;
      hoverStartTime = millis();
    }
    
    let hoverDuration = millis() - hoverStartTime;
    let progress = Math.min(hoverDuration / 3000, 1); // 停留 3 秒
    
    // 繪製光圈進度
    push();
    noFill();
    stroke(0, 255, 65, 80);
    strokeWeight(4);
    ellipse(activeCursor.x, activeCursor.y, 60, 60); // 底圓
    stroke(0, 255, 65);
    strokeWeight(6);
    strokeCap(ROUND);
    arc(activeCursor.x, activeCursor.y, 60, 60, -HALF_PI, -HALF_PI + TWO_PI * progress); // 旋轉光圈
    pop();

    if (progress >= 1) {
      // 觸發按鈕事件
      if (hoverButton === "START") {
        gameState = "PLAYING";
      } else if (hoverButton === "SETTINGS") {
        gameState = "SETTINGS";
      } else if (hoverButton === "BACK") {
        gameState = "LOGIN";
      }
      hoverButton = null;
    }
  } else {
    hoverButton = null;
  }

  // 繪製一般游標點 (所有手部)
  for (let c of cursors) {
    push();
    fill(0, 255, 65, 150);
    stroke(0, 255, 65);
    strokeWeight(2);
    ellipse(c.x, c.y, 15, 15);
    pop();
  }

  pop();
}

// 繪製單個選單按鈕的函式
function drawMenuButton(btn) {
  push();
  fill(0, 20, 0, 200);
  stroke('#00ff41');
  strokeWeight(2);
  rect(btn.x, btn.y, btn.w, btn.h, 10);
  
  // 滑鼠懸停時顯示反饋背景
  if (hoverButton === btn.id) {
    fill(0, 255, 65, 50);
    noStroke();
    rect(btn.x, btn.y, btn.w, btn.h, 10);
  }

  fill('#00ff41');
  noStroke();
  textSize(24);
  textFont('Courier New');
  textAlign(CENTER, CENTER);
  text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  pop();
}

// 繪製設定頁面核取方塊的函式
function drawCheckbox(box, isChecked) {
  push();
  stroke('#00ff41');
  strokeWeight(2);
  if (isChecked) {
    fill(0, 255, 65, 50);
  } else {
    fill(0, 20, 0, 200);
  }
  rect(box.x, box.y, box.w, box.h, 5);

  if (isChecked) {
    stroke('#00ff41');
    strokeWeight(4);
    noFill();
    strokeCap(ROUND);
    strokeJoin(ROUND);
    beginShape();
    vertex(box.x + 10, box.y + 20);
    vertex(box.x + 18, box.y + 30);
    vertex(box.x + 30, box.y + 10);
    endShape();
  }
  pop();
}

// 監聽鍵盤按下事件
function keyPressed() {
  if (gameState === "LOGIN" && keyCode === ENTER) {
    gameState = "PLAYING";
  } else if (gameState === "SETTINGS" && keyCode === ESCAPE) {
    gameState = "LOGIN";
  }
}
