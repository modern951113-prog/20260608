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
let enemyPurpleImg;
let enemyYellowImg;
let enemyElitePurpleImg;     // 菁英怪素材 "小紫"
let enemyGreenImg;           // 成就怪素材 "小綠"
let bossImg;                 // 魔王素材 "大魔王"
let bossAttackImg;           // 魔王攻擊素材 "要轉"
let enemyObstacleImg;        // 無敵障礙物素材 "敵人"

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
let fadeOutStartTime = 0;    // 記錄淡出動畫的開始時間
let warpStartTime = 0;       // 記錄時空穿越動畫的開始時間
let warpParticles = [];      // 儲存穿越粒子的陣列
let bgm;                     // 戰鬥背景音樂
let lobbyBgm;                // 遊戲大廳背景音樂
let laserSfx;                // 射擊音效
let hoverSfx;                // 按鈕懸停提示音

// 遊戲進行中的變數
let playerLasers = [];
let enemies = [];
let obstacles = [];          // 儲存無敵障礙物的陣列
let particles = [];
let score = 0;
let playerHp = 5; // 玩家生命值
let enemiesDefeated = 0; // 記錄擊敗的普通敵人數量
let elitesDefeated = 0;  // 記錄擊敗的小紫(菁英怪)數量
let levelStage = 0;        // 遊戲階段: 0=普通怪, 1=小綠, 2=魔王, 3=勝利
let greenMonster = null;   // 小綠物件
let boss = null;           // 魔王物件
let greenMonsterDefeated = false; // 成就：擊殺小綠
let playerLevel = 1;       // 玩家當前等級 (最高 LV5)
let playerExp = 0;         // 玩家當前經驗值
let playerLastHitTime = 0; // 記錄玩家最後一次受傷的時間 (用來計算無敵時間)

function preload() {
  // 關閉 CPU 運算，讓瀏覽器使用 GPU (WebGL) 加速，大幅提升效能！
  // ml5.setBackend("cpu");
  // 使用新版 ml5.js (v1.0+) 的 handPose 模型，注意 P 是大寫
  handpose = ml5.handPose();
  // 加入 faceMesh 臉部網格模型
  facemesh = ml5.faceMesh();

  // 載入 png 圖片素材
  planeImg = loadImage("plane.png");
  bulletImg = loadImage("bullet.png");
  beamImg = loadImage("beam.png");
  enemyPurpleImg = loadImage("紫色.png");
  enemyYellowImg = loadImage("黃色.png");
  enemyElitePurpleImg = loadImage("小紫.png"); // 載入菁英怪
  enemyGreenImg = loadImage("小綠.png");       // 載入小綠
  bossImg = loadImage("大魔王.png");           // 載入大魔王
  bossAttackImg = loadImage("要轉.png");       // 載入魔王專屬攻擊
  enemyObstacleImg = loadImage("敵人.png");    // 載入無敵障礙物
  
  bgm = loadSound("音樂.mp3"); // 載入音樂檔案，請確認您的檔案名稱是否相符
  lobbyBgm = loadSound("音樂2.mp3"); // 載入大廳音樂檔案
  laserSfx = loadSound("Laser.mp3"); // 載入光束射擊音效
  hoverSfx = loadSound("提示音.mp3"); // 載入提示音效
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
  
  // 設定音效播放模式為 restart，避免 LV5 射速太快導致音效跟不上或重疊卡頓
  laserSfx.playMode('restart');
}

function draw() {
  // 如果是登入展示畫面、設定畫面或相關過場動畫，直接繪製並提早返回 (不畫攝影機)
  if (gameState === "LOGIN" || gameState === "SETTINGS" || gameState === "FADE_IN" || gameState === "FADE_OUT" || gameState === "WARPING") {
    
    if (gameState !== "WARPING") {
      drawLoginScreen();
    }

    if (gameState === "FADE_IN") {
      // 淡入黑幕 (透明度從 255 到 0)
      let alpha = map(millis() - fadeInStartTime, 0, 1000, 255, 0, true);
      fill(0, 0, 0, alpha);
      noStroke();
      rect(0, 0, windowWidth, windowHeight); // 覆蓋整個畫面

      if (alpha <= 0) {
        gameState = "LOGIN";
        if (isMusicOn && !lobbyBgm.isPlaying()) {
          lobbyBgm.loop(); // 進入大廳時開始循環播放大廳音樂
        }
      }
    } else if (gameState === "FADE_OUT") {
      // 淡出黑幕 (透明度從 0 到 255)
      let alpha = map(millis() - fadeOutStartTime, 0, 1000, 0, 255, true);
      fill(0, 0, 0, alpha);
      noStroke();
      rect(0, 0, windowWidth, windowHeight);

      if (alpha >= 255) {
        gameState = "WARPING";
        warpStartTime = millis();
        initWarpParticles();
      }
    } else if (gameState === "WARPING") {
      // 繪製時空穿越光束特效
      drawWarpScreen();
    }
    return; 
  }

  // 根據不同狀態給予不同的背景顏色
  if (gameState === "DETECTING" || gameState === "SUCCESS") {
    background(0); // 掃描時使用純黑背景增加科技感
  } else if (gameState === "PLAYING") {
    background(0, 5, 0); // 遊戲時使用深綠黑色背景，營造宇宙空間
  } else {
    background('#e7c6ff'); // 進入遊戲後的背景
  }

  // 在 PLAYING 狀態下繪製底層的宇宙航行星空背景 (往上飛行的效果)
  if (gameState === "PLAYING") {
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
  }

  const videoWidth = windowWidth * 0.85;
  const videoHeight = windowHeight * 0.85;
  const x = (windowWidth - videoWidth) / 2;
  const y = (windowHeight - videoHeight) / 2;

  push();
  translate(x + videoWidth, y);
  scale(-1, 1);
  imageMode(CORNER); // 確保視訊畫面對齊左上角，避免受其他物件設定影響
  
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
  } else if (gameState === "PLAYING") {
    // 遊戲進行時，將 Webcam 影像變暗且半透明，讓星空透出來
    tint(255, 80);
    image(capture, 0, 0, videoWidth, videoHeight);
    noTint();
  } else {
    // 正常遊戲影像
    image(capture, 0, 0, videoWidth, videoHeight);
  }
  
  // 當攝影機確實有畫面時，且非遊玩狀態，再開始繪製追蹤點 (保持遊戲畫面乾淨)
  if (capture.width > 0 && gameState !== "PLAYING") {
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
      // 遊戲進行中的邏輯
      let planeX = windowWidth / 2;
      let planeY = windowHeight - 150; // 預設於畫面下方

      // 將飛機綁定於臉部位置 (鼻尖)
      if (facePredictions.length > 0) {
        let nose = facePredictions[0].keypoints[1]; // 1 是鼻尖
        // 計算反映像後的畫面位置 (注意 X 軸因為鏡像被翻轉過，所以要反向對應)
        planeX = map(nose.x, 0, capture.width, x + videoWidth, x);
        planeY = map(nose.y, 0, capture.height, y, y + videoHeight);
      }

      // 根據等級決定射擊速度 (越高等射速越快)
      let shootInterval = 20; // LV1 初始射速較慢
      if (playerLevel === 2) shootInterval = 15;
      if (playerLevel === 3) shootInterval = 10;
      if (playerLevel === 4) shootInterval = 8;
      if (playerLevel >= 5) shootInterval = 5; // 滿級射速最快

      // 自動發射光束
      if (frameCount % shootInterval === 0) {
        if (playerLevel >= 5) {
          // LV5 以上：升級為六管光束發射 (追加左前斜與右前斜)
          playerLasers.push({ x: planeX - 50, y: planeY - 20, type: "beam", vx: -5, vy: -25 }); // 左斜射
          playerLasers.push({ x: planeX - 30, y: planeY - 30, type: "beam" });
          playerLasers.push({ x: planeX - 10, y: planeY - 40, type: "beam" });
          playerLasers.push({ x: planeX + 10, y: planeY - 40, type: "beam" });
          playerLasers.push({ x: planeX + 30, y: planeY - 30, type: "beam" });
          playerLasers.push({ x: planeX + 50, y: planeY - 20, type: "beam", vx: 5, vy: -25 });  // 右斜射
        } else if (playerLevel >= 3) {
          // LV3 以上：升級為四管光束發射
          playerLasers.push({ x: planeX - 30, y: planeY - 30, type: "beam" });
          playerLasers.push({ x: planeX - 10, y: planeY - 40, type: "beam" });
          playerLasers.push({ x: planeX + 10, y: planeY - 40, type: "beam" });
          playerLasers.push({ x: planeX + 30, y: planeY - 30, type: "beam" });
        } else {
          // LV1, LV2：雙管光束發射
          playerLasers.push({ x: planeX - 20, y: planeY - 40, type: "beam" });
          playerLasers.push({ x: planeX + 20, y: planeY - 40, type: "beam" });
        }
        if (isSfxOn) laserSfx.play(); // 播放射擊音效
      }

      // 自動產生敵人 (階段 0 才持續生怪)
      if (levelStage === 0) {
        if (frameCount % 30 === 0) {
          let eType = random() > 0.5 ? "purple" : "yellow"; // 亂數決定圖片樣式
          enemies.push({ 
            x: random(windowWidth * 0.1, windowWidth * 0.9), 
            y: -50, 
            hp: 50,
            type: eType,
            noiseOffsetX: random(1000) 
          });
        }
        
        // 當擊敗 3 隻菁英怪小紫，推進階段並產生小綠
        if (elitesDefeated >= 3) {
          levelStage = 1;
          greenMonster = { x: windowWidth / 2, y: 150, vx: 6, hp: 500, maxHp: 500, spawnTime: millis() };
        }
      }

      // 更新與繪製子彈
      imageMode(CENTER);
      for (let i = playerLasers.length - 1; i >= 0; i--) {
        let l = playerLasers[i];
        
        push();
        translate(l.x, l.y);
        // 針對斜向光束進行角度旋轉校正
        if (l.vx && l.vy) {
          rotate(atan2(l.vy, l.vx) + HALF_PI);
        }
        if (l.type === "beam") {
          image(beamImg, 0, 0, 25, 60);
        } else {
          image(bulletImg, 0, 0, 15, 30);
        }
        pop();
        
        l.x += l.vx || 0; // X 軸移動 (斜向)
        l.y += l.vy !== undefined ? l.vy : -25; // Y 軸快速往上飛行
        if (l.y < -50 || l.x < -100 || l.x > windowWidth + 100) playerLasers.splice(i, 1);
      }

      // 更新與繪製敵人及碰撞偵測
      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        if (e.type === "elite_purple") {
          // 改為使用 noise 映射絕對座標，並擴展到整個戰場域，避免卡在邊緣
          e.noiseOffsetX += 0.005; // 降低變化頻率，讓動作變平滑
          e.noiseOffsetY += 0.005;
          
          e.x = map(noise(e.noiseOffsetX), 0, 1, 100, windowWidth - 100);
          e.y = map(noise(e.noiseOffsetY), 0, 1, 100, windowHeight - 200); // 整個場地皆可移動，避開最下方 UI
          
          image(enemyElitePurpleImg, e.x, e.y, 200, 200); // 菁英怪體積改為 200
        } else {
          // 正常敵人的移動模式
          e.y += 2; // 往下飛
          e.x += map(noise(e.noiseOffsetX), 0, 1, -8, 8); // 左右漂移
          e.noiseOffsetX += 0.05;
          
          if (e.type === "purple") {
            image(enemyPurpleImg, e.x, e.y, 60, 60);
          } else {
            image(enemyYellowImg, e.x, e.y, 60, 60);
          }
        }

        // 碰撞偵測 (光束是否打到敵機)
        let hitRadius = e.type === "elite_purple" ? 90 : 35; // 配合 200x200 的體積調整判定
        for (let j = playerLasers.length - 1; j >= 0; j--) {
          let l = playerLasers[j];
          if (dist(l.x, l.y, e.x, e.y) < hitRadius) {
            particles.push({ x: l.x, y: l.y - 10, life: 100 }); // 擊中產生的小火花
            e.hp -= 10; // 扣除血量
            playerLasers.splice(j, 1);
            break; // 一發光束只能擊中一次
          }
        }

        // 判斷敵機血量是否歸零
        if (e.hp <= 0) {
          particles.push({ x: e.x, y: e.y, life: 255 }); // 大爆炸
          
          let expGained = 0;
          if (e.type === "elite_purple") {
            score += 200; // 菁英怪分數兩倍
            expGained = 100; // 菁英經驗
            elitesDefeated += 1; // 增加小紫擊敗數
          } else {
            score += 100;
            expGained = 20; // 普通怪經驗
            enemiesDefeated += 1; // 增加普通敵人擊敗數
            
            // 每次擊敗 10 隻普通敵人，生成一隻菁英怪小紫
            if (enemiesDefeated % 10 === 0) {
              enemies.push({ 
                x: random(windowWidth * 0.2, windowWidth * 0.8), 
                y: 50, 
                hp: 200,
                type: "elite_purple",
                noiseOffsetX: random(1000),
                noiseOffsetY: random(2000) 
              });
            }
          }
          
          // 處理經驗值與升級機制
          if (playerLevel < 5) {
            playerExp += expGained;
            let nextLevelExp = playerLevel * 100; // 升級所需經驗：LV1->100, LV2->200, LV3->300, LV4->400
            
            while (playerExp >= nextLevelExp && playerLevel < 5) {
              playerExp -= nextLevelExp;
              playerLevel++;
              nextLevelExp = playerLevel * 100;
              // 升級時在玩家位置產生光芒特效
              particles.push({ x: planeX, y: planeY, life: 255 }); 
            }
          }
          
          enemies.splice(i, 1);
          continue; // 已經擊毀，跳過下方畫圖與超出畫面的判斷
        }
        
        // 碰撞偵測 (敵機是否撞到玩家)
        let crashRadius = e.type === "elite_purple" ? 90 : 50; // 配合 200x200 的體積調整判定
        if (dist(planeX, planeY, e.x, e.y) < crashRadius) {
          // 判斷是否超過無敵時間 (3秒 = 3000毫秒)
          if (millis() - playerLastHitTime > 3000) {
            playerLastHitTime = millis(); // 更新受傷時間
            particles.push({ x: planeX, y: planeY, life: 255 }); // 玩家受損火花
            playerHp -= 1; // 扣除一顆愛心
            
            // 如果不是菁英怪，普通怪物撞到還是會爆炸並消失
            if (e.type !== "elite_purple") {
              particles.push({ x: e.x, y: e.y, life: 255 }); // 敵機爆炸
              enemies.splice(i, 1); // 移除敵機
            }
            
            if (playerHp <= 0) {
              // 生命值歸零，結束遊戲並回到大廳
              gameState = "LOGIN";
              bgm.stop(); // 停止戰鬥音樂
              if (isMusicOn && !lobbyBgm.isPlaying()) lobbyBgm.loop(); // 恢復大廳音樂
              playerLasers = [];
              enemies = [];
              obstacles = [];
              break; // 修正卡死錯誤：陣列清空後立即跳出迴圈，不再往下執行
            }
            if (e.type !== "elite_purple") continue; // 已經擊毀，跳過下方畫圖
          }
        }

        // 繪製血條 (依據怪物類型調整最大血量與長度)
        let maxHp = e.type === "elite_purple" ? 200 : 50;
        let barWidth = e.type === "elite_purple" ? 100 : 40; // 血條配合體積調整
        let yOffset = e.type === "elite_purple" ? -110 : -45; // 血條位置微調
        
        fill(255, 0, 0);
        noStroke();
        rect(e.x - barWidth/2, e.y + yOffset, barWidth * (e.hp / maxHp), 5);
        stroke(255, 0, 60);
        noFill();
        rect(e.x - barWidth/2, e.y + yOffset, barWidth, 5);

        // 敵機超出畫面移除
        if (e.y > windowHeight + 50) {
          enemies.splice(i, 1);
        }
      }

      // ----- 階段 1：小綠 (成就怪) 邏輯 -----
      if (levelStage === 1 && greenMonster) {
        let gm = greenMonster;
        gm.x += gm.vx;
        if (gm.x < 150 || gm.x > windowWidth - 150) gm.vx *= -1; // 碰到左右邊界反彈
        
        image(enemyGreenImg, gm.x, gm.y, 120, 120);
        
        // 小綠血條
        fill(255, 0, 0);
        noStroke();
        rect(gm.x - 60, gm.y - 70, 120 * (gm.hp / gm.maxHp), 8);
        stroke(255);
        noFill();
        rect(gm.x - 60, gm.y - 70, 120, 8);
        
        // 光束打擊小綠判定
        for (let j = playerLasers.length - 1; j >= 0; j--) {
          let l = playerLasers[j];
          if (dist(l.x, l.y, gm.x, gm.y) < 60) {
            particles.push({ x: l.x, y: l.y - 10, life: 100 });
            gm.hp -= 10;
            playerLasers.splice(j, 1);
            if (gm.hp <= 0) {
              particles.push({ x: gm.x, y: gm.y, life: 255 }); // 大爆炸
              greenMonsterDefeated = true; // 達成成就！
              score += 1000;
              levelStage = 2; // 進入魔王階段
              greenMonster = null;
              spawnBoss(windowWidth);
              break;
            }
          }
        }
        
        // 小綠存活 20 秒後飛走消失
        if (greenMonster && millis() - gm.spawnTime > 20000) {
          levelStage = 2; // 進入魔王階段
          greenMonster = null;
          spawnBoss(windowWidth);
        }
      }

      // ----- 階段 2：魔王邏輯 -----
      if (levelStage === 2 && boss) {
        // 魔王進場
        if (boss.y < boss.targetY) {
          boss.y += 2;
          boss.lastAttackTime = millis(); // 進場期間不攻擊
        } else {
          // 魔王隨機徘徊
          if (millis() > boss.nextMoveTime) {
            boss.vx = random([-6, -4, 0, 4, 6]); // 隨機改變移動速度與方向
            boss.nextMoveTime = millis() + random(500, 2000); // 下一次改變移動模式的時間
          }
          boss.x += boss.vx;
          if (boss.x < 250) { boss.x = 250; boss.vx = abs(boss.vx); }
          if (boss.x > windowWidth - 250) { boss.x = windowWidth - 250; boss.vx = -abs(boss.vx); }
          
          // 魔王發射專屬攻擊 (隨血量變快，最慢6秒=6000ms，最快3秒=3000ms)
          let attackInterval = map(boss.hp, 0, boss.maxHp, 3000, 6000);
          if (millis() - boss.lastAttackTime > attackInterval) {
            boss.lastAttackTime = millis();
            
            // 每次發射兩發往下的「要轉」
            obstacles.push({
              x: boss.x - 100,
              y: boss.y + 100,
              vx: 0,
              vy: 8,             // 往下射擊
              isBossBullet: true, // 標記為魔王專屬子彈
              rotation: 0
            });
            obstacles.push({
              x: boss.x + 100,
              y: boss.y + 100,
              vx: 0,
              vy: 8,             // 往下射擊
              isBossBullet: true, // 標記為魔王專屬子彈
              rotation: 0
            });
          }
        }
        
        image(bossImg, boss.x, boss.y, 400, 400); // 巨型魔王
        
        // 魔王大型血條 (置於畫面上方中央)
        let barW = windowWidth * 0.6;
        let barX = windowWidth / 2 - barW / 2;
        let barY = 60;
        fill(100, 0, 0, 150);
        noStroke();
        rect(barX, barY, barW, 20);
        fill(255, 0, 0);
        rect(barX, barY, barW * (boss.hp / boss.maxHp), 20);
        stroke(255);
        strokeWeight(2);
        noFill();
        rect(barX, barY, barW, 20);
        
        // 光束打擊魔王判定
        let hitRadius = 180;
        for (let j = playerLasers.length - 1; j >= 0; j--) {
          let l = playerLasers[j];
          if (dist(l.x, l.y, boss.x, boss.y) < hitRadius) {
            particles.push({ x: l.x, y: l.y - 10, life: 100 });
            boss.hp -= 10;
            playerLasers.splice(j, 1);
            if (boss.hp <= 0) {
              for (let k = 0; k < 30; k++) { // 華麗大爆炸
                particles.push({ x: boss.x + random(-150, 150), y: boss.y + random(-150, 150), life: 255 });
              }
              score += 5000;
              levelStage = 3; // 遊戲勝利
              boss = null;
              break;
            }
          }
        }
        
        // 玩家撞到魔王本體判定
        if (boss && dist(planeX, planeY, boss.x, boss.y) < 200) {
          if (millis() - playerLastHitTime > 3000) {
            playerLastHitTime = millis();
            particles.push({ x: planeX, y: planeY, life: 255 });
            playerHp -= 1;
            if (playerHp <= 0) {
              resetToLogin();
              return; // 這裡不是迴圈，改用 return 直接結束當前的 draw 函式
            }
          }
        }
      }

      // 自動產生無敵障礙物 (每 15 秒 = 15 * 60 = 900 幀)
      if (frameCount % 900 === 0) {
        for (let i = 0; i < 4; i++) {
          // 左側產生，往右飛
          obstacles.push({
            x: -50 - i * 150, // 錯開生成位置
            y: random(100, windowHeight - 200),
            vx: 3 // 慢速飛行
          });
          // 右側產生，往左飛
          obstacles.push({
            x: windowWidth + 50 + i * 150,
            y: random(100, windowHeight - 200),
            vx: -3 // 慢速飛行
          });
        }
      }

      // 更新與繪製無敵障礙物
      for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x += obs.vx || 0;
        obs.y += obs.vy || 0; // 如果有 Y 速度代表是魔王發射的子彈
        
        if (obs.isBossBullet) {
          push();
          translate(obs.x, obs.y);
          obs.rotation = (obs.rotation || 0) + 0.2; // 不斷旋轉
          rotate(obs.rotation);
          image(bossAttackImg, 0, 0, 70, 70); // 繪製旋轉的專屬攻擊圖案
          pop();
        } else {
          image(enemyObstacleImg, obs.x, obs.y, 80, 80); // 一般障礙物
        }

        // 玩家撞擊障礙物偵測 (扣血，但障礙物不消失)
        if (dist(planeX, planeY, obs.x, obs.y) < 50) {
          if (millis() - playerLastHitTime > 3000) {
            playerLastHitTime = millis();
            particles.push({ x: planeX, y: planeY, life: 255 });
            playerHp -= 1;
            if (playerHp <= 0) {
              resetToLogin();
              break;
            }
          }
        }

        // 飛出螢幕範圍後移除
        if (obs.x < -800 || obs.x > windowWidth + 800 || obs.y > windowHeight + 100) {
          obstacles.splice(i, 1);
        }
      }

      // 繪製爆炸粒子
      noStroke();
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        fill(255, 65, 0, p.life);
        ellipse(p.x, p.y, (255 - p.life) / 1.5);
        p.life -= 20; // 逐漸淡出
        if (p.life <= 0) particles.splice(i, 1);
      }

      // 繪製玩家戰鬥機 (蓋在最上方)
      imageMode(CENTER);
      
      // 受傷無敵狀態的閃爍特效
      if (millis() - playerLastHitTime < 3000) {
        if (frameCount % 10 < 5) {
          tint(255, 100); // 讓飛機變半透明
        }
      }
      image(planeImg, planeX, planeY, 100, 100);
      noTint(); // 復原濾鏡

      // 分數 UI
      fill('#00ff41');
      noStroke();
      textSize(28);
      textAlign(LEFT, TOP);
      text("SCORE: " + score, 30, 30);

      // 繪製等級與經驗值 UI
      textSize(20);
      text("LV: " + playerLevel, 30, 70);
      if (playerLevel < 5) {
        text("EXP: " + playerExp + " / " + (playerLevel * 100), 30, 100);
      } else {
        text("EXP: MAX", 30, 100);
      }
      
      // 成就顯示
      if (greenMonsterDefeated) {
        fill(255, 215, 0); // 金色
        text("🏆 隱藏成就：擊殺小綠", 30, 130);
      }
      
      // 勝利畫面文字
      if (levelStage === 3) {
        fill(255, 215, 0);
        textSize(60);
        textAlign(CENTER, CENTER);
        text("MISSION ACCOMPLISHED!", windowWidth / 2, windowHeight / 2);
        textSize(30);
        text("BOSS DEFEATED", windowWidth / 2, windowHeight / 2 + 60);
      }

      // 繪製玩家血量 (右上角愛心)
      textAlign(RIGHT, TOP);
      textSize(32);
      let heartStr = "";
      for (let i = 0; i < playerHp; i++) {
        heartStr += "❤️ "; // 使用 Emoji 愛心
      }
      text(heartStr, windowWidth - 30, 30);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 魔王生成函式
function spawnBoss(wWidth) {
  boss = {
    x: wWidth / 2,
    y: -200,      // 從畫面外上方飛入
    targetY: 200, // 最終停留在畫面上半部
    vx: 4,
    hp: 2000,
    maxHp: 2000,
    nextMoveTime: 0,
    lastAttackTime: 0
  };
}

// 將玩家返回大廳的處理函式
function resetToLogin() {
  gameState = "LOGIN";
  bgm.stop();
  if (isMusicOn && !lobbyBgm.isPlaying()) lobbyBgm.loop();
  playerLasers = [];
  enemies = [];
  obstacles = [];
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
    if (weaponType === "beam") {
      demoLasers.push({ x: planeX - 20, y: planeY - 30, type: weaponType });
      demoLasers.push({ x: planeX + 20, y: planeY - 30, type: weaponType });
    } else {
      demoLasers.push({ x: planeX, y: planeY - 30, type: weaponType });
    }
  }

  // 自動產生敵人 (每 40 幀產生一台)
  if (frameCount % 40 === 0) {
    let eType = random() > 0.5 ? "purple" : "yellow";
    demoEnemies.push({ x: random(windowWidth * 0.2, windowWidth * 0.8), y: -50, type: eType });
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
    
    if (e.type === "purple") {
      image(enemyPurpleImg, e.x, e.y, 60, 60);
    } else {
      image(enemyYellowImg, e.x, e.y, 60, 60);
    }

    // 碰撞偵測 (雷射 hit 敵人)
    for (let j = demoLasers.length - 1; j >= 0; j--) {
      let l = demoLasers[j];
      if (dist(l.x, l.y, e.x, e.y) < 35) {
        // 產生爆炸粒子
        demoParticles.push({ x: e.x, y: e.y, life: 255 });
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
      if (c.x > musicYesBox.x && c.x < musicYesBox.x + musicYesBox.w && c.y > musicYesBox.y && c.y < musicYesBox.y + musicYesBox.h) {
        isMusicOn = true;
        if (!lobbyBgm.isPlaying()) lobbyBgm.loop(); // 設定開啟時，如果沒播放就播放
      }
      if (c.x > musicNoBox.x && c.x < musicNoBox.x + musicNoBox.w && c.y > musicNoBox.y && c.y < musicNoBox.y + musicNoBox.h) {
        isMusicOn = false;
        if (lobbyBgm.isPlaying()) lobbyBgm.stop(); // 設定關閉時，立刻停止音樂
      }
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
      if (isSfxOn) hoverSfx.play(); // 播放提示音
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
        gameState = "FADE_OUT";
        fadeOutStartTime = millis();
        lobbyBgm.stop(); // 準備進入關卡前停止大廳音樂
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
    gameState = "FADE_OUT";
    fadeOutStartTime = millis();
    lobbyBgm.stop(); // 準備進入關卡前停止大廳音樂
  } else if (gameState === "SETTINGS" && keyCode === ESCAPE) {
    gameState = "LOGIN";
  }
}

// 初始化時空穿越特效的粒子
function initWarpParticles() {
  warpParticles = [];
  for (let i = 0; i < 300; i++) {
    warpParticles.push({
      x: random(-windowWidth / 2, windowWidth / 2),
      y: random(-windowHeight / 2, windowHeight / 2),
      z: random(windowWidth) // 深度 Z 軸
    });
  }
}

// 繪製時空穿越 (Warp Speed) 特效
function drawWarpScreen() {
  background(0);
  push();
  translate(windowWidth / 2, windowHeight / 2); // 將原點移至畫面中心
  
  let elapsed = millis() - warpStartTime;
  // 粒子飛行速度隨時間加速 (模擬穿越感)
  let speed = map(elapsed, 0, 2500, 5, 200, true); 
  
  for (let i = 0; i < warpParticles.length; i++) {
    let p = warpParticles[i];
    p.z -= speed; // 粒子往畫面方向(觀看者)飛過來
    
    if (p.z < 1) {
      p.z = windowWidth; // 若飛過頭，則回到遠方重新產生
      p.x = random(-windowWidth / 2, windowWidth / 2);
      p.y = random(-windowHeight / 2, windowHeight / 2);
    }
    
    // 將 3D 座標投影到 2D 螢幕 (當前位置 與 殘影位置)
    let sx = map(p.x / p.z, 0, 1, 0, windowWidth);
    let sy = map(p.y / p.z, 0, 1, 0, windowHeight);
    let pz = p.z + speed;
    let px = map(p.x / pz, 0, 1, 0, windowWidth);
    let py = map(p.y / pz, 0, 1, 0, windowHeight);
    
    // 離攝影機越近(z 越小)，光束越粗
    let weight = map(p.z, 0, windowWidth, 4, 0, true);
    stroke(0, 255, 65, 200); 
    strokeWeight(weight);
    line(sx, sy, px, py); // 畫出速度殘影
  }
  pop(); // 恢復座標系，準備畫全螢幕的閃光
  
  // 動畫尾聲 (大於 2 秒時)：畫面爆閃白光
  if (elapsed > 2000) {
    let whiteAlpha = map(elapsed, 2000, 2500, 0, 255, true);
    fill(255, 255, 255, whiteAlpha);
    noStroke();
    rect(0, 0, windowWidth, windowHeight);
  }

  // 穿越經過 2.5 秒後，正式進入遊戲
  if (elapsed > 2500) {
    gameState = "PLAYING";
    playerHp = 5; // 每次進入關卡重置血量為 5
    score = 0;    // 重置分數
    enemiesDefeated = 0; // 重置擊殺數
    elitesDefeated = 0;  // 重置小紫擊殺數
    levelStage = 0;      // 遊戲階段歸零
    greenMonster = null; // 清空小綠
    boss = null;         // 清空魔王
    greenMonsterDefeated = false; // 成就重置
    playerLevel = 1;     // 重置等級
    playerExp = 0;       // 重置經驗值
    playerLastHitTime = 0; // 重置受傷時間
    playerLasers = []; // 清空子彈
    enemies = [];      // 清空敵人
    obstacles = [];    // 清空障礙物
    particles = [];    // 清空粒子
    // 如果設定開啟了音樂，且音樂還沒播放，就開始循環播放
    if (isMusicOn && !bgm.isPlaying()) {
      bgm.loop();
    }
  }
}
