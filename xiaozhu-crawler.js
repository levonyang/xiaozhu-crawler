const puppeteer = require('puppeteer');

class Crawler {
    constructor ({ interval = 10000 }) {
        this.list$ = new Observer();
        this.detail$ = new Observer();
        this._browser = null;
        this._list = [];
        this._list._listIndex = 0; // 当前抓取页码
        this._interval = interval;
        this.start();
    }
    async start () {
        console.log(`start`);
        this._browser = await puppeteer.launch({
            executablePath: 'C:\\Users\\S\\Desktop\\chrome-win32\\chrome.exe', // chromium安装路径
            headless: false, // 是否隐藏浏览器
        });
        clearInterval(this._listTimer);
        clearInterval(this._detailTimer);

        // 定时获取列表
        this._listTimer = setInterval(async () => {
            this._list._listIndex++;
            let list = await this.getList(this._list._listIndex);
            if (!list || !list.length) return;
            this._list.push(...list);
            this.list$.emit(list);
        }, this._interval * 5);

        // 定时获取详情页
        this._detailTimer = setInterval(async () => {
            let item = this._list.shift();
            if (!item) return;
            let detail = await this.getDetail(item.url, item);
            this.detail$.emit(detail);
        }, this._interval);

        // 先获取一次列表
        let list = await this.getList();
        if (!list || !list.length) return;
        this._list.push(...list);
        this.list$.emit(list);
    }
    async stop () {
        clearInterval(this._listTimer);
        clearInterval(this._detailTimer);
        this._browser && await this._browser.close();
    }
    // 获取列表
    async getList (index) {
        let page = await this._browser.newPage();
        await page.goto(`http://sh.xiaozhu.com/search-duanzufang-p${index}-0/`);
        let ret;
        try {
            ret = await page.evaluate(() => {
                let itemLi = [].slice.call(document.querySelectorAll('#page_list .pic_list > li'));
                return itemLi.map(li => {
                    let urlEl = li.querySelector('.resule_img_a');
                    let titleEl = li.querySelector('.result_title');
                    let priceEl = li.querySelector('.result_price i');
                    let ownerEl = li.querySelector('.result_img a');
                    return {
                        url: urlEl && urlEl.getAttribute('href'),
                        title: titleEl && titleEl.innerText,
                        price: +(priceEl && priceEl.innerText) || -1,
                        owner: ownerEl && ownerEl.getAttribute('href'),
                    }
                });
            });
            ret.index = index;
        } catch (e) {
            console.error(e);
            ret = null;
        }
        page.close();
        return ret;
    }
    // 获取详情页
    async getDetail (url, mergeItem) {
        let page = await this._browser.newPage();
        await page.goto(url);
        let ret;
        try {
            ret = await page.evaluate(() => {
                let addressEl = document.querySelector('.pho_info .pr5');
                let descEl = (document.querySelector('.detail_intro_item:nth-child(2) .intro_item_content') || document.querySelector('.detail_intro_item:nth-child(2) .info_text_mid'));
                let houseEl = document.querySelector('#introducePart .house_info li:nth-child(1) p');
                let houseText = houseEl && houseEl.innerText || '';
                let trafficEl = (document.querySelector('.detail_intro_item:nth-child(4) .intro_item_content') || document.querySelector('.detail_intro_item:nth-child(4) .info_text_mid'));
                let aroundEl = (document.querySelector('.detail_intro_item:nth-child(5) .intro_item_content') || document.querySelector('.detail_intro_item:nth-child(5) .info_text_mid'));
                let previewEl = document.querySelector('#curBigImage');
                return {
                    address: addressEl && addressEl.innerText,
                    desc: descEl && descEl.innerText,
                    square: +houseText.match(/\d+(?=平米)/g)[0] || -1,
                    rooms: {
                        bed: +houseText.match(/\d+(?=室)/g)[0] || -1,
                        sitting: +houseText.match(/\d+(?=厅)/g)[0] || -1,
                        bath: +houseText.match(/\d+(?=卫)/g)[0] || -1,
                        kitchen: +houseText.match(/\d+(?=厨)/g)[0] || -1,
                        balcony: +houseText.match(/\d+(?=阳台)/g)[0] || -1,
                    },
                    traffic: trafficEl && trafficEl.innerText,
                    around: aroundEl && aroundEl.innerText,
                    preview: previewEl && previewEl.getAttribute('src'),
                }
            });
            Object.assign(ret, mergeItem);
        } catch (e) {
            console.error(e);
            ret = null;
        }
        page.close();
        return ret;
    }
}

// 订阅推送模型
class Observer {
    constructor () {
        this._sub = new Set();
    }
    subscribe (fn) {
        if (typeof fn !== 'function') throw new TypeError('invalid function');
        this._sub.add(fn);
        return {
            unsubscribe: () => {
                this._sub.delete(fn);
            }
        };
    }
    clear () {
        this._sub.clear();
    }
    emit (...arg) {
        for (let fn of this._sub) {
            fn(...arg);
        }
    }
}

module.exports = Crawler;