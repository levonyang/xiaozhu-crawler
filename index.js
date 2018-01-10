const Crawl = require('./xiaozhu-crawler');

const source = new Crawl({
    interval: 10000,
});

// 推送列表数据
const list$$ = source.list$.subscribe(info => {
    console.log(info, 'list$');
});

// 推送详情数据
const detail$$ = source.detail$.subscribe(info => {
    console.log(info, 'detail$');
});

// list$$.unsubscribe();
// source.list$.clear();