var http = require('http');
var cheerio = require('cheerio')
var fs = require('fs');
var domain = 'http://doc.ucweb.local/display/IMDXXL/'
	/*------------------种子信息设置---------------------------*/
	//种子标识
var seedName = 'emalwa';
//默认抽链区域，黑白名单
var seed_xpath = "//div[@class='blog-list style-1']";
var white_pattern = "http://emalwa.com/.*%.*";
var black_pattern = "";
//种子名称
var task = [];
var seedNames = [

'emalwa-business',
'emalwa-desh',
'emalwa-entertainment-bollywood',
'emalwa-health',
'emalwa-international',
'emalwa-madhyapradesh',
'emalwa-ratlam',
'emalwa-sports',
'emalwa-technology',
'emalwa-vividha'

]


/*--------------------------------------------------------*/
//
var datas = []
var option = {
	hostname: 'doc.ucweb.local',
	path: '',
	method: 'POST',
	headers: {
		//需要登录，所以设置Cookie
		'Cookie': 'confluence-sidebar.width=410; crowd.token_key=Dx26f0YlIOA5I0r0wxDE4A00; JSESSIONID=2D319D24265A1DC956DE2334E0AF9EE1'
	}
};

getDatas();

function getDatas() {
	//每个种子地址对应一个爬取任务
	for (var i = 0; i < seedNames.length; i++) {
		(function(i) {
				//处理种子名中的空格
			seedNames[i] = seedNames[i].replace(/\s/g, '+');
			//种子信息confluence地址
			var url = domain + seedNames[i];
			//设置option
			var host = url.match(/http:\/\/.*?\/(.*)/)[1]
			option.path = '/' + host
				//发出爬取请求
			var req = http.request(option, function(res) {
				//爬到页面数据
				var html = ''
				res.on('data', function(data) {
					html += data;
				});
				res.on('end', function() {
					//保存页面相关的种子信息
					var $ = cheerio.load(html)
					var arr = {};
					var lists = $('.confluenceTable tbody tr')
					for (var i = 3; i < lists.length; i++) {
						var list = lists.eq(i).find('td').eq(1).text().trim();
						var key = lists.eq(i).find('td').eq(0).text().trim();
						arr[key] = list;
					};
					JSON.stringify(arr);
					datas.push(arr);
					if(datas.length === seedNames.length){
						dealDatas();
					}
				});

			});
			req.on('error', function(e) {
				console.log('error:' + e.message)
			})
			req.end();
		})(i)

	}

};


function dealDatas() {
	var seed = []; //存储单个种子信息
	var seedAll = []; //存储所有种子信息
	var seedAllStr = ''; //转成批量导入的字符串格式
	var message = []; //任务信息
	var warn = false;
	var daoliuType = false;
	var styleMedi = false;
	for (var i = 0; i < datas.length; i++) {
		var data = datas[i];
		//特殊需求报警
		if (!daoliuType && data["媒体类型"] && data["媒体类型"] === "自媒体") {
			daoliuType = true;
			message.push('\n' + 'it is own media' + '\n')
		}
		if (!styleMedi && data["导流模式"] && data["导流模式"] !== "不导流") {
			styleMedi = true;
			message.push('\n' + 'it need daoliu' + '\n')
		}
		if (!warn && data["内容类型"] && data["内容类型"] !== "新闻") {
			warn = true;
			message.push('\n' + 'its content type' + '\n')
		}
		if (data["数据类型"] && data["数据类型"] !== "普通图文") {
			warn = true;
			message.push('\n' + 'its data type' + '\n')
		}

		//频道映射
		if (data["频道"]) {
			var channel = checkChannel(data["频道"])
		}
		//分类映射
		if (data["一级分类"]) {
			var cate_1 = checkCate_1(data["一级分类"])
		}
		if (data["二级分类"]) {
			var cate_2 = checkCate_2(data["二级分类"])
		}
		//整合分类编码
		if (cate_2) {
			data.category = cate_1 + ',' + cate_2;
		} else {
			data.category = cate_1;
		}
		//种子管理平台与confluence种子需求字段映射
		data.name = data["种子源名称"];
		data.url = data["种子源地址"];
		data.is_cp = data["合作"] === "是" ? 1 : 0;
		data.site = data["对应站点"];
		data.list_article_from = data["列表页显示文章来源"]
		data.country = data["国家"] === "印度" ? "india" : ''
		data.city = data["城市"]
		data.language = data["语言"] === "en" ? "english" : "hindi"
		data.authority = data["权威性"] === "高" ? 3 : 2; //权威性低忽略
		data.porn_sensitivity = 0 //色情敏感默认无
		data.politics_sensitivity = 0 //政治敏感默认无
		data.seed_icon_desc = data["种子图标文案"];
		data.classifyMethod = data.category ? 1 : 0; //是否手动分类

		//输入种子信息
		seed[0] = data.name // 0seedName|
		seed[1] = data.url // 1seedUrl|
		seed[2] = data.is_cp // 2isCp|
		seed[3] = data.site // 3seedSite|
		seed[4] = data.list_article_from // 4listArticleFrom|
		seed[5] = 0 // 5seedType |
		seed[6] = data.country // 6country|
		seed[7] = data.city // 7city|
		seed[8] = data.language // 8language|
			// 媒体类型/暂时没有添加！！！
		seed[9] = data.authority // 9authority|
		seed[10] = data.porn_sensitivity // 10pornSensitivity|
		seed[11] = data.politics_sensitivity // 11politicsSensitivity|
		seed[12] = 1 // 12seedDeliverStatus| 种子下发状态
		seed[13] = channel || '' // 13channel|
		seed[14] = data.classifyMethod; // 14classifyMethod|
		seed[15] = data.category || '' // 15categoryId|
		seed[16] = 0 // 16itemType|
		seed[17] = 0 // 17contentType|
		seed[18] = 0 // 18daoliuType|  是否导流
		seed[19] = data.seed_icon_desc || 'India News' // 19seedIconDesc|
		seed[20] = data.seed_icon_url || 'http://img.ucweb.com/s/uae/g/1p/India%20News.png' // 20seedIconUrl|
		seed[21] = '' // 21seedClickUrl|
		seed[22] = 0 // 22styleType|
		seed[23] = '' // 23gaId|
		seed[24] = '' // 24unionId|
		seed[25] = '' // 25business_extend|
		seed[26] = '' //26seedNeedJs|
		seed[27] = 5 // 27refresh_interval| 抽取间隔
		seed[28] = seed_xpath || "" // 28seed_xpath|
		seed[29] = black_pattern || '' // 29black_pattern|
		seed[30] = white_pattern || '' // 30white_pattern|
		seed[31] = 'a' // 31crawl_range|  抓取范围
		seed[32] = 1 // 32crawl_depth|  抓取深度
		seed[33] = 1 // 33seed_need_linkfollow|  需要抽链
		seed[34] = 0 // 34seedFormat| 
		seed[35] = '' // 35crawl_extent

		//批量导入字符串格式，字段分隔符|, 不同种子分隔符\n
		seedAll.push(seed.join('|'))
	}
	seedAllStr = seedAll.join('\n')
		//任务信息
	message.push("     seedname:" + seedName);
	message.push(" datas.length:" + datas.length);
	message.push("   seed_xpath:" + seed_xpath);
	message.push("white_pattern:" + white_pattern);
	if (warn || styleMedi || daoliuType) {
		message.push('\n' + "!!!warning!!!warning!!!warning!!!" + '\n')
	}
	message = message.join('\n');
	console.log("<task.message>" + '\n' + message + '\n')
		//写入到文件
	fs.writeFile('./seedInfo/seedInfoStr_' + seedName + '.js', seedAllStr, function(err, data) {
		if (err) {
			console.log('ERROR!' + err);
		}
		console.log('<task.message>' + '\n' + 'seedInfo/seedInfoStr_' + seedName + '.js' + ' already create!')
	})
}

function checkChannel(dataChannel) {
	switch (dataChannel.replace(/（/, '(').replace(/）/, ')').trim()) {
		case "自动":
			channel = '';
			break;
		case "推荐频道(Headline)":
			channel = '001';
			break;
		case "Trending":
			channel = '002';
			break;
		case "娱乐(Entertainment)":
			channel = '003';
			break;
		case "教育求职（Edu&Job Edu & Job)":
			channel = '004';
			break;
		case "板球(Cricket)":
			channel = '005';
			break;
		case "奇闻异事(Offbeat)":
			channel = '006';
			break;
		case "电子产品(Gadgets)":
			channel = '007';
			break;
		case "生活(Lifestyle)":
			channel = '008';
			break;
		case "印度(India)":
			channel = '009';
			break;
		case "世界(World)":
			channel = '010';
			break;
		case "城市(Cities)":
			channel = '011';
			break;
		case "体育(Sports)":
			channel = '012';
			break;
		case "电影(Movie)":
			channel = '013';
			break;
		case "电视(TV)":
			channel = '014';
			break;
		case "科技(Tech)":
			channel = '015';
			break;
		case "健康(Health)":
			channel = '016';
			break;
		case "汽车(Auto)":
			channel = '017';
			break;
		case "饮食(Food)":
			channel = '018';
			break;
		case "星象命理(Astrology)":
			channel = '019';
			break;
		case "政治(Politics)":
			channel = '020';
			break;
		case "财经(Economics)":
			channel = '021';
			break;
		case "人际关系(Relationship)":
			channel = '022';
			break;
		case "女性(Women)":
			channel = '023';
			break;
		case "旅游(Travel)":
			channel = '024';
			break;
		case "时尚(Fashion)":
			channel = '025';
			break;
		case "犯罪(Crime)":
			channel = '026';
			break;
		default:
			channel = '';
			break;
	}
	return channel;
}

function checkCate_1(dataCate_1) {
	var cate_1 = '';
	switch (dataCate_1.replace(/（/, '(').replace(/）/, ')').trim()) {
		case "政治(Politics)":
			cate_1 = "001";
			break;
		case "社会(Society)":
			cate_1 = "002";
			break;
		case "观点(Opinion)":
			cate_1 = "003";
			break;
		case "娱乐(Entertainment)":
			cate_1 = "004";
			break;
		case "经济(Economics)":
			cate_1 = "005";
			break;
		case "体育(Sports)":
			cate_1 = "006";
			break;
		case "科学(Science)":
			cate_1 = "007";
			break;
		case "科技(Tech)":
			cate_1 = "008";
			break;
		case "游戏(Gaming)":
			cate_1 = "009";
			break;
		case "教育(Education)	":
			cate_1 = "010";
			break;
		case "求职(Jobs)":
			cate_1 = "011";
			break;
		case "健康(Health)":
			cate_1 = "012";
			break;
		case "人际关系(Relationship)	":
			cate_1 = "013";
			break;
		case "生活(Lifestyle)":
			cate_1 = "014";
			break;
		case "时尚(Fashion)":
			cate_1 = "015";
			break;
		case "汽车(Auto)":
			cate_1 = "016";
			break;
		case "历史(History)":
			cate_1 = "017";
			break;
		case "食物(Food)":
			cate_1 = "018";
			break;
		case "视听类":
			cate_1 = "019";
			break;
		case "旅游(Travel)":
			cate_1 = "020";
			break;
		case "宗教(Religion)":
			cate_1 = "021";
			break;
		case "购物(Shopping)":
			cate_1 = "022";
			break;
		case "奇闻异事（Offbeat)	":
			cate_1 = "023";
			break;
		case "图片(Gallery)":
			cate_1 = "024";
			break;
		case "幽默(Humor)":
			cate_1 = "025";
			break;
		case "占星术(Astrology)":
			cate_1 = "026";
			break;
		case "生活服务(Services)":
			cate_1 = "028";
			break;
		case "育儿(Parenting)":
			cate_1 = "029";
			break;
		case "心灵鸡汤(Inspirational)":
			cate_1 = "030";
			break;
		case "艺术(Art)":
			cate_1 = "031";
			break;
		default:
			cate_1 = "";
			break;
	}
	return cate_1
}

function checkCate_2(dataCate_2) {
	var cate_2 = '';
	switch (dataCate_2.replace(/（/, '(').replace(/）/, ')').trim()) {
		case "电影(Movie)":
			cate_2 = "004001";
			break;
		case "音乐(Music)":
			cate_2 = "004002";
			break;
		case "电视剧(TV)":
			cate_2 = "004003";
			break;
		case "电视综艺(TVshow)":
			cate_2 = "004004";
			break;
		case "名人(Celebrity)":
			cate_2 = "004005";
			break;
		case "宝莱坞(Bollywood)":
			cate_2 = "004006";
			break;
		case "好莱坞(Hollywood)":
			cate_2 = "004007";
			break;
		case "戏剧(Theatre)":
			cate_2 = "004008";
			break;

		case "股票(Stock)":
			cate_2 = "005001";
			break;
		case "预算(Budget)":
			cate_2 = "005002";
			break;
		case "期货(Commodity)":
			cate_2 = "005003";
			break;
		case "广告(Advertising)":
			cate_2 = "005004";
			break;
		case "零售(Retail)":
			cate_2 = "005005";
			break;
		case "创业(Startup)":
			cate_2 = "005006";
			break;
		case "银行(Banking)":
			cate_2 = "005007";
			break;
		case "基础设施(Infrastructure)":
			cate_2 = "005008";
			break;
		case "房地产(Real estate)":
			cate_2 = "005009";
			break;
		case "税收(Tax)":
			cate_2 = "005010";
			break;
		case "农业(agriculture)":
			cate_2 = "005011";
			break;
		case "企业经营管理(Company)":
			cate_2 = "005012";
			break;
		case "工业(Industry)":
			cate_2 = "005013";
			break;
		case "制造业(Manufacturing)":
			cate_2 = "005014";
			break;
		case "通信(Telecom)":
			cate_2 = "005015";
			break;
		case "能源(energy)":
			cate_2 = "005016";
			break;
		case "保险(Insurance)":
			cate_2 = "005017";
			break;
		case "市场(marketing)":
			cate_2 = "005018";
			break;

		case "板球(Cricket)":
			cate_2 = "006001";
			break;
		case "曲棍球(Hockey)":
			cate_2 = "006002";
			break;
		case "网球(Tennis)":
			cate_2 = "006003";
			break;
		case "足球(Football)":
			cate_2 = "006004";
			break;
		case "赛跑(Races)":
			cate_2 = "006005";
			break;
		case "羽毛球(Badminton)":
			cate_2 = "006006";
			break;
		case "拳击(Boxing)":
			cate_2 = "006007";
			break;
		case "国际象棋(Chess)":
			cate_2 = "006008";
			break;
		case "一级方程式(F1)":
			cate_2 = "006009";
			break;
		case "高尔夫(Golf)":
			cate_2 = "006010";
			break;
		case "卡巴迪(Kabaddi)":
			cate_2 = "006011";
			break;
		case "美国职业男篮(NBA)":
			cate_2 = "006012";
			break;
		case "游泳(Swimming)":
			cate_2 = "006013";
			break;

		case "电子产品(Gadget)":
			cate_2 = "008001";
			break;
		case "创业(Startup)":
			cate_2 = "008002";
			break;
		case "社交（Social）":
			cate_2 = "008003";
			break;
		case "信息技术（IT）":
			cate_2 = "008004";
			break;
		case "小技巧（How to）":
			cate_2 = "008005";
			break;
		case "应用软件(App)	":
			cate_2 = "008006";
			break;

		case "MBA":
			cate_2 = "010001";
			break;
		case "JEE":
			cate_2 = "010002";
			break;
		case "CBSE":
			cate_2 = "010003";
			break;
		case "留学":
			cate_2 = "010004";
			break;
		case "医学":
			cate_2 = "010005";
			break;
		case "工学":
			cate_2 = "010006";
			break;
		case "法学":
			cate_2 = "010007";
			break;
		case "管理学":
			cate_2 = "010008";
			break;

		case "government job":
			cate_2 = "011001";
			break;
		case "bank job":
			cate_2 = "011002";
			break;
		case "railway job":
			cate_2 = "011003";
			break;
		case "SSC":
			cate_2 = "011004";
			break;
		case "UPSC":
			cate_2 = "011005";
			break;
		case "Defence":
			cate_2 = "011006";
			break;
		case "PSU":
			cate_2 = "011007";
			break;
		case "teacher job":
			cate_2 = "011008";
			break;
		case "police job":
			cate_2 = "011009";
			break;
		case "IAS":
			cate_2 = "011010";
			break;
		case "科技求职(Tech Jobs)":
			cate_2 = "011011";
			break;

		case "两性(Men and women)":
			cate_2 = "013001";
			break;
		case "父母(Parent-child relationship)":
			cate_2 = "013002";
			break;
		case "同事(Work)":
			cate_2 = "013003";
			break;
		case "宠物(Pets)":
			cate_2 = "013004";
			break;
		case "装修(Decoration)":
			cate_2 = "014001";
			break;

		case "风水(Vaastu)":
			cate_2 = "014002";
			break;
		case "手相(Palmistry)":
			cate_2 = "014003";
			break;
		case "宝石运势(Gemstone)":
			cate_2 = "014004";
			break;
		case "小贴士(Tips)":
			cate_2 = "014005";
			break;
		case "婚礼(Wedding)":
			cate_2 = "014006";
			break;

		case "美容(Beauty)":
			cate_2 = "015001";
			break;
		case "摩托车(Bike)":
			cate_2 = "016001";
			break;
		case "汽车(Car)":
			cate_2 = "016002";
			break;

		case "素食(vegetarian)":
			cate_2 = "018001";
			break;
		case "肉食(non-vegetarian)":
			cate_2 = "018002";
			break;
		case "音乐":
			cate_2 = "019001";
			break;
		case "视频":
			cate_2 = "019002";
			break;
		case "产前(prenatal)":
			cate_2 = "029001";
			break;
		case "产后(postnatal)":
			cate_2 = "029002";
			break;
		case "婴儿(baby)":
			cate_2 = "029003";
			break;
		case "幼儿(toddler)":
			cate_2 = "029004";
			break;

		case "建筑(Architecture)":
			cate_2 = "031001";
			break;
		case "设计(design)":
			cate_2 = "031002";
			break;
		default:
			cate_2 = '';
			break;
	}
	return cate_2;
}