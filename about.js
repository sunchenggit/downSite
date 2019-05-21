var fs = require("fs");
var path = require('path');
var cheerio = require('cheerio');
var async = require("async");
var request = require('request');

// 域名
var requestUrl = 'http://218.4.132.130:7955/xypt/';
//架构编号
var tplNum = 'k610195';
// 下载地址, 老站为空，新站要加域名
var domain = 'http://218.4.132.130:7955/'

// 创建初始目录 包含images 目录(因为下面下载图片的时候无法没有提前生成目录)
fs.mkdir(tplNum+"/images/", { recursive: true }, (err) => {
    if (err) { console.log(err) };
});

// 导航类名
var navClass = '.xy-menu a';
var htmlPath = [{url: tplNum, name: 'index.html'}];

// 获取文件名
function getFileName($url) {
    var pos = $url.lastIndexOf('/');
    var poss = $url.lastIndexOf('?');
    if ( poss !== -1) {
        return $url.substring(pos+1, poss)
    } else {
        return $url.substr(pos+1)
    }
}

function createHtml (src) {
    if (src.indexOf('.html') !== -1) {
        return src.split('/')[src.split('/').length - 1]
    } else {
        return src.split('/')[src.split('/').length - 2]+'.html'
    }
}


request(requestUrl, function(error, response, body) {
    if (!error && response && response.statusCode == 200) {
        var $ = cheerio.load(body, {decodeEntities: false});

        // 将导航中包含的链接，存储到数组中
        $(navClass).each(function(){
            var href = $(this).attr('href')
            if (href !== '/') {
                htmlPath.push({url: href, name: createHtml(href)})
            }
        })

        htmlPath.forEach(function(item,index,arr){
            request(domain+item.url, function(error, response, body) {
                if (!error && response && response.statusCode == 200) {
                    var $ = cheerio.load(body, {decodeEntities: false});
                        
                    $('a[href="/"]').attr('href', tplNum)

                    // 替换导航路径
                    for (var x = 0; x < arr.length; x++) {
                        $('a[href="'+arr[x].url+'"]').attr('href',arr[x].name).addClass('replace');
                    }
                    $('a[href]').each(function () { 
                        if (!$(this).hasClass("replace")) {
                            $(this).attr('href', 'javascript:;');
                        }
                     })
            
                    /* 下载图片 */
                    var imageLinks = []
                    $('img[src]').each(function(){
                        var src = $(this).attr('src');
                        // 替换路径
                        var newSrc = "./images/"+getFileName(src);
                        $(this).attr('src', newSrc);
                    })
            
                    // 保存文件函数
                    function saveFile(el, dir, attr) {
                        // 判断目录是否存在，如果不存在则创建该目录
                        fs.mkdir(tplNum+"/"+dir, { recursive: true }, (err) => {
                            if (err) { console.log(err) };
                        });
            
                        // 保存并修改文件路径
                        $(el).each(function(i){
                            // 获取路径
                            var urls = $(this).attr(attr);
                            // 更新路径
                            var newUrl = "./"+dir+"/"+getFileName(urls);
                            $(this).attr(attr,newUrl);
                        })
                    }
                    
                    saveFile("script[src]", "js", "src");
                    saveFile("link[href]", "style", "href");
            
                    fs.writeFile(path.join(__dirname, tplNum, item.name), $.html(), 'utf8', (err) => {
                        if (err) console.log(err);
                        console.log(item.name+'已保存');
                    });
                }
            });
        })
    }
});
