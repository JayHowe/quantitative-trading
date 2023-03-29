const https = require('https');
const talib = require('talib');

// 股票代码
const symbol = 'BABA';
// 数据范围
const range = '1000';
// API Key 通过 twelvedata.com 申请获得
const apiKey = 'your apiKey';

// 获取股票数据
function getStockData(callback) {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${range}&apikey=${apiKey}`;
    console.log('url:', url)
    https.get(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${range}&apikey=${apiKey}`, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                callback(parsedData);
            } catch (e) {
                console.error(e.message);
            }
        });
    }).on('error', (e) => {
        console.error(`获取数据时发生错误： ${e.message}`);
    });
}

// 计算移动平均线
function calculateMovingAverageSMA(data, period) {
    const result = talib.execute({
        name: 'SMA',
        startIdx: 0,
        endIdx: data.length - 1,
        inReal: data,
        optInTimePeriod: period,
    })

    return result.result.outReal
}

// // 计算RSI指标
// function calculateMovingAverageRSI(data, period) {
//     const result = talib.execute({
//         name: 'RSI',
//         startIdx: 0,
//         endIdx: data.length - 1,
//         inReal: data,
//         optInTimePeriod: period,
//     })
//     return result.result.outReal
// }

// 计算技术指标
function calculateIndicators(data) {
    const closePrices = data.map(d => parseFloat(d.close));
    const ma5 = calculateMovingAverageSMA(closePrices, 5);
    const ma10 = calculateMovingAverageSMA(closePrices, 10);

    return {
        closePrices,
        ma5,
        ma10,
        // ma20,
        // ma50,
        // rsi,
    };
}

// 制定交易策略-失败， 越做越亏
function evaluateStrategy(data) {
    let position = null; // 仓位
    let buyPrice = 0; // 买入价格
    let sellPrice = 0; // 卖出价格
    const { closePrices, ma5, ma10 } = calculateIndicators(data);
    let totalIncome = 0; //总收益
    let stopLoss = 0;
    let takeProfit = 0;


    for (let i = data.length - 1; i >= 0; i--) {
        if (ma5[i] > ma10[i] && position !== 'long') { // 5日均线上穿10日均线
            position = 'long';
            buyPrice = closePrices[i];
            // 设置止损为最近一个价格的5%以下
            stopLoss = buyPrice * 0.95;
            // 设置止盈为最近一个价格的10%以上
            takeProfit = buyPrice * 1.1;
            console.log(`在${data[i].datetime}买入，买入价格为${buyPrice}, 止盈价: ${takeProfit}, 止损价: ${stopLoss}`);
        } else if ((( ma5[i] < ma10[i] ) || (closePrices[i] >= takeProfit || closePrices[i] <= stopLoss)) && position === 'long') { // 5日均线下穿10日均线
            position = null;
            sellPrice = closePrices[i];
            //   console.log('买入:', buyPrice)
            //   console.log('卖出:', sellPrice)
            const profit = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);
            totalIncome += Number(profit);
            console.log(`在${data[i].datetime}卖出，卖出价格为${sellPrice}，盈利${profit}%, 累计收益：${totalIncome}%`);
        }
    }
}

// 开始交易
function startTrading() {
    getStockData((data) => {
        evaluateStrategy(data.values);
    });
}

startTrading();
