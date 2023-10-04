// 載入express模組 
const express = require('express');
// 使用express.Router類別建構子來建立路由物件
const router = express.Router();

//************ 根據Client端利用GET送來之不同路由，回傳相對應的網頁 ************
// 回傳給Client端首頁及該網頁之標題
router.get('/', (req, res) => {
	res.render('index.ejs', { title: "專案首頁" });
});
router.get('/speedTransform', (req, res) => {
	res.render('speedTransform.ejs', { title: "速率轉換" });
});
router.get('/profitCalculation', (req, res) => {
	res.render('profitCalculation.ejs', { title: "獲利計算" });
});

//** 速率轉換服務 */
router.post('/speedTransform/:num/:unit1/:unit2', (req, res) => {
	var num = req.params.num;
	let unit1 = req.params.unit1;
	let unit2 = req.params.unit2;
	if (unit1 == unit2) { value = num; res.send({ result: value }) }
	else {
		//	將num字串轉成浮點數
		num = parseFloat(num);
		switch (unit1) {
			case 'kmh': num *= 3.6; break;
			case 'mph': num *= 0.44704; break;
			case 'knots': num *= 0.514444; break;
		}
		switch (unit2) {
			case 'ms': value = num.toFixed(2); break;
			case 'kmh': value = (num / 3.6).toFixed(2); break;
			case 'mph': value = (num / 0.44704).toFixed(2); break;
			case 'knots': value = (num / 0.514444).toFixed(2); break;
			case 'c': value = (num / 299792458).toPrecision(5); break;
		}
		res.send({ result: value });
	}
})
//** 獲利計算服務 */
router.post('/profitCalculation', (req, res) => {
	let num1 = req.body.num1;
	let num2 = req.body.num2;
	let n1 = req.body.n1;
	let n2 = req.body.n2;
	let p1 = req.body.p1;
	let p2 = req.body.p2;
	if (num1 == '' || n1 == '' || num2 == '' || n2 == '') { res.json({ r1: '個股價或股數不可為空', r2: '個股價或股數不可為空', r3: '', r4: '' }) }
	else if (num1 < 0 || n1 < 0 || num2 < 0 || n2 < 0) { res.json({ r1: '個股價或股數不可為負值', r2: '個股價或股數不可為負值', r3: '', r4: '' }) }
	else {
		num1 = parseFloat(num1);
		num2 = parseFloat(num2);
		n1 = parseInt(n1);
		n2 = parseInt(n2);
		p1 = parseFloat(p1);
		p2 = parseFloat(p2);

		let r1 = (num1 * n1 + num1 * n1 * 0.001425 * p1).toFixed(0);
		let r2 = (num2 * n2 - num2 * n2 * 0.001425 * p2 - num2 * n2 * 0.003).toFixed(0);
		res.json({ r1: r1, r2: r2, r3: (r2 - r1), r4: `${((r2 / r1 - 1) * 100).toFixed(2)}%` });
	}
});

// 匯出路由物件router
module.exports = router;