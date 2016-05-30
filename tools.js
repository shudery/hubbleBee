//收集confluence种子信息
var arr = {};
var lists = $('.confluenceTable tbody tr')
for (var i = 3; i < lists.length; i++) {
  var list = lists.eq(i).find('td').eq(1).text().trim();
  var key = lists.eq(i).find('td').eq(0).text().trim();
  arr[key]= list
};
JSON.stringify(arr)

//重新审核内容 --- 预发布页面

(function batchToRetry(root) {
  var lists = $('.table tbody tr')
  for (var i = 1; i < lists.length; i++) {
    var list = lists.eq(i).find('td').eq(1).find('a')[3];
    list.click();
  }
})(window);


//一键重新抓取审核---抓取带审核页面
(function batchToRetry(root) {
  var list = $('.retry');
  for (var i = 0; i < list.length; i++) {
    $(list[i]).click();
  }
})(window);

//新添种子页复制粘贴
(function copy(root) {
  var form = document.forms['seedUpdateForm'].elements;
  var data = {};
  for (var key in form) {
    data[form[key].name] = form[key].value;
  }
  data.do = 'addupdate';
  data.id = '';
  saveToStorage(data);

  function isJSON(MyTestStr) {
    try {
      var MyJSON = JSON.stringify(MyTestStr);
      var json = JSON.parse(MyJSON);
      if (typeof(MyTestStr) == 'string')
        if (MyTestStr.length == 0)
          return false;
    } catch (e) {
      return false;
    }
    return true;
  }

  function saveToStorage(data) {
    if (!isJSON(data)) {
      return;
    }
    if (!window.localStorage) {
      alert('不支持复制功能，请保证浏览器支持localStorage');
      return;
    }
    var options = JSON.stringify(data);
    localStorage.setItem('clipboard', options);
    if (confirm('复制成功，是否跳转到种子添加页面')) {
      location.href = 'http://test.sm-tc.cn/quality/seed.php?do=add';
    }
  }
})();

// ===================================================================

(function paste(root) {
  if (!window.localStorage) {
    alert('不支持复制功能，请保证浏览器支持localStorage');
    return;
  }
  var data = localStorage.getItem('clipboard'),
    options;
  try {
    options = JSON.parse(data);
  } catch (e) {
    return;
  }
  var form = document.forms['seedUpdateForm'].elements;
  for (var i = 0; i < form.length; i++) {
    var key = form[i].name;
    if (key) {
      form[i].value = options[key];
    }
  }
})();