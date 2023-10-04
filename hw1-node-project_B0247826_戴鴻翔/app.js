// 引用相關模組
const createError = require('http-errors');
const express = require('express'); // express模組
const  path = require('path');

const  partials = require('express-partials');

// 設定路由檔變數
const  indexRouter = require('./routes/index.js');

// 建立express物件稱為app
const  app = express();

// 設定views路徑和視圖引擎(view engine)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// 使用部分頁面中介軟體(middleware)
app.use(partials());
// 使用相關中介軟體(middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// 設定public為網站靜態檔所在目錄
app.use(express.static(path.join(__dirname, 'public')));

// 設定路由處理路徑
app.use('/', indexRouter); // 設定'/'開頭由./routes/index.js路由檔處理


// 抓取404例外並傳給錯誤處理函數 (catch 404 and forward to error handler)
app.use( (req, res, next) => {
  next(createError(404));
});

// 錯誤處理函數 (error handler)
app.use( (err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // 產生顯示錯誤的頁面 (render the error page)
  res.status(err.status || 500);
  res.render('error');
});
// 匯出 app 物件
module.exports = app; 
