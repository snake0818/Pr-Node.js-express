// 載入express模組 
const express = require('express');
// 使用express.Router類別建構子來建立路由物件
const router = express.Router();
// 載入fs模組，以便存取檔案 
const fs = require('fs');
const fsExtra = require('fs-extra');
// 載入request模組，以便呼叫Web API
const request = require('request');

// lock用以紀錄目前操控按鈕是否已被鎖住：若lock==0，代表操控按鈕沒有鎖住;若lock==1，代表操控按鈕已被鎖住，
let lock = 0; // 初始設為0，代表操控按鈕沒有鎖住

// 建立Web Video Streaming的狀態儲存檔wvs_status.txt(初始值為off)
fs.writeFileSync('./wvs-status.txt', 'off');
console.log('The wvs-status.txt is created!');
// 建立Web Video Streaming的pid儲存檔wvs_pid.txt(初始值為0)
fs.writeFileSync('./wvs-pid.txt', '0');
console.log('The wvs-pid.txt is created!');

//=================== 回傳網頁 ===========================================//
//========= 根據Client端利用GET送來之不同路由，回傳相對應的網頁 =============//
//=======================================================================//
// 回傳專案首頁及網頁標題到前端
router.get('/', (req, res) => {
  // 宣告區域變數
  let wvs_status, wvs_pid, error_message;

  // 讓前端顯示首頁時，關閉Web視訊串流
  try {
    // 讀取Web Video Streaming的狀態
    wvs_status = fs.readFileSync('./wvs-status.txt', 'utf8');

    // 若Web視訊串流已經開啟，則將其關閉
    if (wvs_status == 'on') {
      // 讀取pid of Web Video Streaming
      wvs_pid = fs.readFileSync('./wvs-pid.txt', 'utf8');

      // 透過pid關閉(殺掉)Web Video Streaming
      exec = require('child_process').exec;
      exec('sudo kill ' + wvs_pid);
      console.log('The wvs process of ' + wvs_pid + ' is killed!');

      // 將off存入Web Video Streaming的狀態檔中
      fs.writeFileSync('./wvs-status.txt', 'off');
      console.log("即時網路視訊串流已經關閉!");
    }
  } catch (error) {
    error_message = "關閉即時網路視訊串流時發生例外，原因如下:\n" + error;
    console.log(error_message);
  }
  // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
  res.set({ 'charset': 'utf-8' });
  // 回傳專案首頁及網頁標題到前端	
  res.render('index.ejs', { title: "專案首頁" });
});
//此路由方法會回傳[Web遠端監控]操作網頁、網頁標題及後端IP到前端
router.get('/webcontrol', (req, res) => {
  // 宣告區域變數
  let wvs_status, web_vs, wvs_pid, message, error_message;

  // 讓遠端監控網頁載入時，就顯示Web視訊串流
  try {
    // 讀取Web Video Streaming的狀態，存入wvs_status變數
    wvs_status = fs.readFileSync('./wvs-status.txt', 'utf8');
    console.log('wvs_status= ' + wvs_status);

    // 若影像串流關閉著，則將其開啟
    if (wvs_status == 'off') {
      // 生成一個可以執行Shell命令的方法
      const exec = require('child_process').exec;
      // 執行web-vs-server.py
      web_vs = exec('python3 ./web-vs-server.py', shell = false);
      // 取得執行中web-vs-server.py的process id (pid)，
      // 以便事後可以透過此pid刪除此程式
      wvs_pid = web_vs.pid + 1;
      console.log('pid= ' + wvs_pid);

      // 將pid of Web Video Streaming存入檔案中
      fs.writeFileSync('./wvs-pid.txt', String(wvs_pid));

      // 將on存入Web Video Streaming的狀態檔中
      fs.writeFileSync('./wvs-status.txt', 'on');
      console.log('The pid and status of web video streaming is saved!');
      console.log("即時網路視訊串流已經開啟!");
    }
  } catch (error) {
    error_message = "開啟即時網路視訊串流時發生例外，原因如下:\n" + error;
    console.log(error_message);

    // 透過pid關閉(殺掉)Web Video Streaming
    exec = require('child_process').exec;
    exec('sudo kill ' + wvs_pid);
    console.log('The wvs process of ' + wvs_pid + ' is killed!');
  }
  // 回傳[遠程監控操作網頁]、網頁標題及後端IP到前端
  res.render('webcontrol.ejs', { title: "Web遠端監控操作網頁", serverip: req.app.locals.serverip });
});
// 顯示查詢天氣操作網頁
router.get('/weather', (req, res) => { res.render('weather.ejs', { title: '天氣' }) })
router.get('/queryweather', (req, res) => { res.render('queryweather.ejs', { title: "查詢天氣操作網頁" }); });
// 回傳給Client務操作網影像辨識頁及該網頁之標題
router.get('/image-recognition', (req, res) => { res.render('image-recognition.ejs', { title: "影像辨識操作網頁" }); });

//========================================================================//
//==== 此區段根據Client端利用POST送來之不同路由，執行相對應之服務方法 ========//
//========================================================================//

//=== 如果客戶端傳來 POST /web_video_streaming/:cmd 請求時，
//=== 此路由方法會根據命令(cmd)來啟動(cmd=='on)或關閉(cmd=='off')Web視訊串流 
router.post('/web_video_streaming/:cmd', (req, res) => {
  // 宣告區域變數
  let wvs_status, web_vs, wvs_pid, message, error_message;
  let cmd = req.params.cmd; // 由路由參數取得前端傳來的命令

  // 假如收到的命令為'on'，則開啟Web視訊串流
  if (cmd == 'on') {
    try {
      // 讀取Web Video Streaming的狀態
      wvs_status = fs.readFileSync('./wvs-status.txt', 'utf8');

      // 若影像串流關閉著，則將其開啟
      if (wvs_status == 'off') {
        // 生成一個可以執行Shell命令的方法
        exec = require('child_process').exec;
        // 執行web-vs-server.py
        web_vs = exec('python3 ./web-vs-server.py', shell = false);
        // 取得執行中web-vs-server.py的process id (pid)，
        // 以便事後可以透過此pid刪除此程式
        wvs_pid = web_vs.pid + 1;
        console.log('The current wvs_pid: ' + wvs_pid);

        // 將pid of Web Video Streaming存入檔案中
        fs.writeFileSync('./wvs-pid.txt', String(wvs_pid));

        // 將on存入Web Video Streaming的狀態檔中
        fs.writeFileSync('./wvs-status.txt', 'on');
        console.log('The pid and status of web video streaming is saved!');
        console.log("Web視訊串流已經開啟!");
      }
      // 設定擬回傳給前端網頁的訊息
      message = { 'message': 'Web視訊串流已經開啟!' };

      // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
      res.set({
        'charset': 'utf-8'
      });
      // 回傳訊息給前端網頁
      res.send(message);
    }
    catch (error) {
      // 設定擬回傳給前端網頁的訊息
      error_message = "'開啟即時網路視訊串流時發生例外，原因如下:\n" + error;
      console.log(error_message);
      message = { 'message': error_message };

      // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
      res.set({
        'charset': 'utf-8'
      });
      // 回傳訊息給前端網頁
      res.send(message);
    }
  }

  // 假如收到的命令為'off'，則關閉Web視訊串流
  if (cmd == 'off') {
    try {
      // 讀取Web Video Streaming的狀態
      wvs_status = fs.readFileSync('./wvs-status.txt', 'utf8');

      // 若Web視訊串流已經開啟，則將其關閉
      if (wvs_status == 'on') {
        // 讀取pid of Web Video Streaming
        wvs_pid = fs.readFileSync('./wvs-pid.txt', 'utf8');

        // 透過pid關閉(殺掉)Web Video Streaming
        exec = require('child_process').exec;
        exec('sudo kill ' + wvs_pid);
        console.log('The wvs process of ' + wvs_pid + ' is killed!');

        // 將off存入Web Video Streaming的狀態檔中
        fs.writeFileSync('./wvs-status.txt', 'off');
      }

      // 設定擬回傳給前端網頁的訊息
      message = { 'message': '即時網路視訊串流已經關閉!' };
      console.log("即時網路視訊串流已經關閉!");

      // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
      res.set({
        'charset': 'utf-8'
      });
      // 回傳訊息給前端網頁
      res.send(message);
    }
    catch (error) {
      // 設定擬回傳給前端網頁的訊息
      error_message = "關閉即時網路視訊串流時發生例外，原因如下:\n" + error;
      console.log(error_message);
      message = { 'message': error_message };

      // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
      res.set({
        'charset': 'utf-8'
      });
      // 回傳訊息給前端網頁
      res.send(message);
    }
  }
});

//=== 如果客戶端傳來 POST /control8leds/:cmd 請求時，
//=== 此路由方法會根據命令(cmd)來控制8顆LED燈的閃爍模式
router.post('/control8leds/:cmd', (req, res) => {
  //載入python-shell模組
  const ps = require('python-shell');
  // 宣告區域變數
  let cmd = req.params.cmd;
  console.log("cmd= " + cmd);

  // cmd_flag用以紀錄命令是否有效(本範例只有4個有效命令："1"，"2"，"3"，"4" )，
  // 若cmd_flag==1，代表命令有效，若cmd_flag==0，代表命令無效
  let cmd_flag;

  if (cmd == "1" && lock == 0) {
    cmd_flag = 1;
    message = { "message": "LED燈正在跑馬燈閃爍!" };
  }
  else if (cmd == "2" && lock == 0) {
    cmd_flag = 1;
    message = { "message": "LED燈正在奇偶數閃爍!" };
  }
  else if (cmd == "3" && lock == 0) {
    cmd_flag = 1;
    message = { "message": "LED燈正在Binary閃爍!" };
  }
  else if (cmd == "4" && lock == 0) {
    cmd_flag = 1;
    message = { "message": "正在用PWM驅動LED燈!" };
  }
  else if (lock == 0) {
    cmd_flag = 0;
    message = { "message": "無效的命令!" };
  }
  else { }

  // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
  res.set({
    'charset': 'utf-8'
  });
  // 將JSON格式訊息回傳給前端網頁
  res.send(message);

  // 若命令有效且控制按鈕沒有被鎖住，則將命令傳給python程式
  if (cmd_flag == 1 && lock == 0) {
    // 鎖住控制按鈕，以確保在執行命令期間，不會執行其他命令 
    lock = 1;

    // 設定傳給python程式的參數:
    // 執行control-leds.py，以文字模式(text)傳入控制命令(cmd)，
    // 並即時取得python程式透過print命令印出的回傳字串('-u') 
    let options = {
      pythonOptions: ['-u'],
      mode: 'text',
      args: [cmd]
    };

    // 利用python-shell的PythonShell.run方法執行control-leds.py，傳入設定參數options
    // err: 若err存在則表示有錯誤; 否則results存放python程式透過print命令印出的JSON格式字串
    ps.PythonShell.run('./control-leds.py', options, function (err, results) {
      if (err)
        console.log("Python回傳錯誤訊息" + err);
      else {
        // 將JSON格式字串轉換成JSON物件
        results = JSON.parse(results);
        // 列印出Python程式control-leds.py回傳的訊息
        console.log(results.message);
      }
      lock = 0;  // 解鎖控制按鈕，以可以再接收與執行Client端送來的命令
    });
  }
});

//=== 當客戶端傳來POST /store_email/:email 請求時，此路由方法會透過路由參數email取出Email清單 
router.post('/store_email/:email', (req, res) => {
  // 透過路由參數取得前端傳來的Email帳號清單
  let email = req.params.email;

  // 建立接收告警email清單(每個email用逗號隔開)，第1個預設為老師的email帳號，請改為你自己的
  let emails = "B0247826@ulive.pccu.edu.tw" + ", " + email;

  // 將emails清單字串存alert_emails.txt中
  fs.writeFileSync('./alert-emails.txt', emails);

  // 設定擬回傳給前端網頁的JSON訊息	
  let message = { "message": emails };
  console.log("接收告警訊息的Email帳號清單如下: " + message.message);
  // 將JSON格式訊息回傳前端網頁
  res.send(message);
});

//=== 當客戶端傳來POST /take_picture_send_alertemails 請求時，
//=== 此路由方法會停止Web視訊串流、接著拍照，然後傳送告警Email
router.post('/take_picture_send_alertemails', (req, res) => {
  // 宣告區域變數
  let wvs_status, wvs_pid, web_vs, error_message;

  try {
    // 讀取Web Video Streaming的狀態
    wvs_status = fs.readFileSync('./wvs-status.txt', 'utf8');

    // 若Web視訊串流開著，先把它關掉
    if (wvs_status == 'on') {
      // 讀取pid of Web Video Streaming
      wvs_pid = fs.readFileSync('./wvs-pid.txt', 'utf8');

      // 透過pid關閉(殺掉)Web Video Streaming
      exec = require('child_process').exec;
      exec('sudo kill ' + wvs_pid);
      console.log('The wvs process of ' + wvs_pid + ' is killed!');

      // 將off存入Web Video Streaming的狀態檔中
      fs.writeFileSync('./wvs-status.txt', 'off');
    }

    //=== 建立日期時間時間戳記字串
    // 匯入dateformat模組
    const dateformat = require('dateformat');
    //產生格式如2016-12-04_21:17:58之日期字串
    let datestring = dateformat(Date().toString(), "yyyy-mm-dd_HH-MM-ss");

    //以時間戳記當作檔名的一部分，使檔名具有唯一性
    let picture_name = `img${datestring}.jpg`;

    // === 以下程式碼用於執行拍攝一張照片 ===
    // 建立可以使用同步方式執行Shell命令的方法
    execSync = require('child_process').execSync;
    // 設定拍照命令： 攝像頭先預覽50ms才拍照; 照片大小：640x480; 將照片存入專案目錄下之photos子目錄
    let command = `sudo libcamera-still -n -t 50 --width 640 --height 480 -o ./photos/${picture_name}`;
    // 用同步方式進行拍照，以確保在傳送Email之前就有照片了
    execSync(command);
    // 使用sharp旋轉照片
    const sharp = require('sharp');
    sharp(`./photos/${picture_name}`)
      .rotate(180) // 旋轉180度
      .toFile(`./photos/temp.jpg`) // 將旋轉後的圖像保存為temp.jpg
      .then(() => { fs.renameSync(`./photos/temp.jpg`, `./photos/${picture_name}`); }) // 重新命名覆蓋原本檔案
    console.log('像片' + picture_name + '已經拍攝!');

    //=== 以下程式碼使用nodemailer傳送告警email(含拍攝的照片) ====
    // 載入nodemailer模組
    const nodemailer = require("nodemailer");
    // 傳送者資訊 ***(請改為你的姓名與email帳號)***
    let emailsender = "戴鴻翔<cs081807@gmail.com>";

    // 讀取警訊接收者email清單
    let emailreceivers = fs.readFileSync('./alert-emails.txt', 'utf8');

    console.log("emailreceivers: " + emailreceivers);
    // 設定附件照片檔名與路徑
    let attachedimage = picture_name;
    let attachedimagepath = "./photos/" + picture_name;
    // 郵件主旨
    let subjectstring = "即時影像擷取!";
    // 郵件內容
    let emailcontent = `"影像擷取時間：${datestring}，請看照片!`;


    // 建立transporter物件(預設使用SMTP通訊協定)
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",        // gmail之SMTP伺服器
      port: 587,                     // gmail使用TLS時之連接埠號碼
      secure: false,                 // false代表使用其他連接埠，例如，587 (使用TLS); true代表使用連接埠465 (使用SSL); 
      auth: {
        user: "cs081807@gmail.com",  // 設定傳送郵件帳號之使用者帳號完整名稱 (這是老師教學測試用的gmail帳號，你可以改為自己的)
        pass: "hjdu afjw cmuz xwsj"    // 設定傳送郵件帳號之密碼 (這是上面gmail帳號之應用程式登入密碼，你可以改為自己的)
      }
    });
    // 利用上面建立之transporter物件之sendMail方法傳送告警email
    // sendMail方法利用JSON格式參數進行告警email之設定
    transporter.sendMail({
      from: emailsender,          // 設定傳送者之資訊 
      to: emailreceivers,         // 設定接收告警之email清單
      subject: subjectstring,     // 設定告警email之主旨
      text: emailcontent,         // 設定告警email之內容
      attachments: [{   // 設定告警email之附件(take_picture服務所拍的照片)
        filename: attachedimage,
        path: attachedimagepath,
        cid: 'A'
      }]
    });
    console.log("已經發送至電郵!");//*/

    //=== 再次打開影像串流 ====
    // 生成一個可以執行Shell命令的方法
    exec = require('child_process').exec;
    // 執行web-vs-server.py
    web_vs = exec('python3 ./web-vs-server.py', shell = false);
    // 取得執行中web-vs-server.py的process id (pid)，
    // 以便事後可以透過此pid刪除此程式
    wvs_pid = web_vs.pid + 1;
    console.log('The current wvs_pid: ' + wvs_pid);

    // 將pid of Web Video Streaming存入檔案中
    fs.writeFileSync('./wvs-pid.txt', String(wvs_pid));

    // 將on存入Web Video Streaming的狀態檔中
    fs.writeFileSync('./wvs-status.txt', 'on');
    console.log('The pid and status of web video streaming is saved!');
    console.log("Web視訊串流已經開啟!");

    // 設定擬回傳給前端網頁的訊息
    message = { 'message': '已經拍照並傳送電郵!' };
    console.log("已經拍照並傳送電郵!");

    // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
    res.set({
      'charset': 'utf-8'
    });
    // 回傳訊息給前端網頁
    res.send(message);

  }
  catch (error) {
    // 設定擬回傳給前端網頁的訊息
    error_message = "拍照並傳送至電郵時發生例外，原因如下:\n" + error;
    console.log(error_message);
    message = { 'message': error_message };

    // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
    res.set({
      'charset': 'utf-8'
    });
    // 回傳訊息給前端網頁
    res.send(message);
  }
});

//=== 當客戶端傳來POST /readDHT22 請求時，此路由方法會讀取DHT22的溫度及溼度值，並回傳給前端 ===
router.post('/readDHT22', (req, res) => {
  // 載入node-dht-sensor套件
  const dhtsensor = require('node-dht-sensor');
  try {
    //初始化dhtsensor物件，22 代表 DHT22, 12 代表 GPIO12 
    dhtsensor.initialize(22, 12);
    // 讀取DHT22感測值  
    let readout = dhtsensor.read();
    console.log("已經讀取DHT22數位溫溼度感測器：");
    // 讀取溫度值，取到小數點1位
    let temperature = readout.temperature.toFixed(1);
    console.log("  溫度(℃): " + temperature);
    // 讀取濕度值，取到小數點1位
    let humidity = readout.humidity.toFixed(1);
    console.log("  濕度(%): " + humidity);
    // 將溫、溼度值打包成JSON物件
    let result = { "temperature": temperature, "humidity": humidity };

    // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
    res.set({
      'charset': 'utf-8'
    });
    // 將JSON物件回傳給前端網頁
    res.send(result);
  }
  catch (error) {
    // 設定擬回傳給前端的訊息
    let error_message = "讀取DHT22數位溫溼度感測器時時發生例外，原因如下:\n" + error;
    console.log(error_message);
    let message = { 'message': error_message };

    // 設定回傳結果之編碼為utf-8，網頁端才能正常顯示中文
    res.set({
      'charset': 'utf-8'
    });
    // 回傳訊息給前端網頁
    res.send(message);
  }
});


// 引用multer模組，用於接收與儲存前端傳來的檔案
const multer = require('multer');
// 全域變數
let sourceimagefilename;
//設定multer之儲存檔案格式
let storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, './public/photos'); },
  filename: function (req, file, cb) {
    let str = file.originalname.split('.');
    cb(null, Date.now() + '.' + str[1]);
    sourceimagefilename = 'sourceimage' + '.' + str[1];
    cb(null, sourceimagefilename);
  }
});
let upload = multer({ storage: storage });

fsExtra.emptyDirSync('./public/photos');

// 上傳與分析照片服務
router.post("/upload-analyze-image", upload.single("file"), (req, res) => {
  // 讀取來源照片檔成為位元組流(陣列)(octet stream);
  let imgoctet = fs.readFileSync('./public/photos/' + sourceimagefilename);

  // 分析照片API之選項設定
  let apioptions_analyze = {
    url: 'https://southeastasia.api.cognitive.microsoft.com/vision/v3.1/analyze',
    qs: {
      visualFeatures: 'Categories,Description,Objects,Faces',
      details: '',
      language: 'zh'
    },
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': '077993e7a6b64bcfb3c7555c32e7133b'
    },
    body: imgoctet,
    method: 'POST'
  };

  request(apioptions_analyze, (error, response, body) => {
    if (error) {
      console.log(error);
      return;
    }
    // 將回傳的結果JSON字串轉換成JSON物件
    let resultobj = JSON.parse(body);
    // 在終端機中以階層格式印出結果JSON物件
    //console.log(`分析結果：${resultobj}`);
    // 將分析結果訊息打包成JSON物件
    let message = { "status": 0, "result": resultobj };
    // 將JSON格式之結果訊息回傳到前端網頁
    res.json(message);
  });


});

// 上傳與分析照片服務
router.post("/upload-ocr-image", upload.single("file"), (req, res) => {
  // 讀取來源照片檔成為位元組流(陣列)(octet stream);
  let imgoctet = fs.readFileSync('./public/photos/' + sourceimagefilename);

  // 辨識物件API之選項設定
  let apioptions_detect = {
    url: 'https://southeastasia.api.cognitive.microsoft.com/vision/v3.1/ocr',
    qs: {
      detectOrientation: true,
      language: 'zh-Hant'
    },
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': '077993e7a6b64bcfb3c7555c32e7133b'
    },
    body: imgoctet,
    method: 'POST'
  };

  request(apioptions_detect, (error, response, body) => {
    if (error) {
      console.log(error);
      return;
    }
    // 在終端機中印出結果JSON格式結果
    //console.log(`光學字符識別(OCR)API回傳的結果：\n${body}`);

    // 將回傳的結果JSON字串轉換成JSON物件
    let resultobj = JSON.parse(body);
    let regions = resultobj.regions;
    let result = "";
    for (i = 0; i < regions.length; i++) {
      let lines = regions[i].lines;
      for (j = 0; j < lines.length; j++) {
        let words = lines[j].words;
        for (k = 0; k < words.length; k++) { result = result + words[k].text; }
      }
    }
    //console.log("光學字符識別(OCR)結果: " + result);


    // 將檢測結果訊息打包成JSON物件
    let message = { "status": 0, "result": result };
    // 將JSON格式之結果訊息回傳到前端網頁
    res.json(message);
  });
});
//*********************** 使用中央氣象局開放天氣Web API查詢天氣狀況之服務方法******************
//******* 客戶端提出 POST /cwbweather/:selectedcity 請求時，執行此服務方法(匿名式函數) ********
router.post('/queryweather/:selectedcity', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); //  允許其他網站的網頁存取此服務
  let selectedcity = req.params.selectedcity;  // 從路由參數中取出城市名稱
  //console.log(selectedcity);

  // create the url for querying cwb weather API
  let baseurl = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?";
  let AuthCode = "CWB-F92136A9-0AA3-4E52-8C2B-95B598005F6E"; // 請抽換成你的中央氣象局授權碼
  // encodeURIComponent(str) method performs URL percent-encoding on the given str
  // 將URL之中文字進行%編碼
  let cwbweatherurl = `${baseurl}locationName=${encodeURIComponent(selectedcity)}&elementName=T,RH,WeatherDescription,MaxT,MinT&format=JSON`;
  //console.log("URL: " + cwbweatherurl);

  request(
    {
      url: cwbweatherurl,
      headers: { Authorization: AuthCode },
      method: 'GET',
    },
    function (err, response, body) {
      if (err) {
        console.log("讀取天氣資料時發生錯誤，原因如下: " + err);
        city_data = {};
      } else {
        try {
          //console.log(`city:${selectedcity}`);
          // 將回傳的JSON字串轉成javascript的JSON物件
          sdata = JSON.parse(body);
          // 取得最新一筆平均溫度(攝氏度)
          temperature = sdata.records.locations[0].location[0].weatherElement[0].time[0].elementValue[0].value;
          //console.log(`temperature:${temperature}`);
          // 取得最新一筆平均相對溼度
          humidity = sdata.records.locations[0].location[0].weatherElement[1].time[0].elementValue[0].value;
          //console.log(`humidity:${humidity}`);
          // 取得最新一筆平均相對溼度
          // 取的最新一筆天氣預報綜合描述
          condition = sdata.records.locations[0].location[0].weatherElement[3].time[0].elementValue[0].value;
          //console.log(`condition:${condition}`);
          // 取得天氣資訊建立時間
          time = sdata.records.locations[0].location[0].weatherElement[0].time[0].startTime;
          //
          var hightemps = [];
          var lowtemps = [];
          // 取得未來一週最高溫度及最低溫度預報值(攝氏，間隔12小時)
          for (i = 0; i <= 13; i++) {
            hightemp = sdata.records.locations[0].location[0].weatherElement[4].time[i].elementValue[0].value;
            hightemps.push(hightemp);
            lowtemp = sdata.records.locations[0].location[0].weatherElement[2].time[i].elementValue[0].value;
            lowtemps.push(lowtemp);
          }
          // 建立城市簡單天氣資訊之JSON物件
          city_data = { 'city': selectedcity, 'temperature': temperature, 'humidity': humidity, 'condition': condition, 'time': time, 'hightemps': hightemps, 'lowtemps': lowtemps };
        } catch (ex) {
          console.log("解析天氣資料時發生例外，原因如下: " + ex);
          city_data = {};
        }
      }
      res.send(city_data);	// 將城市之天氣資料回傳給Client端	
    }
  );
});

module.exports = router;