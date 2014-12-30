/*--
	本地调试时使用的trace文件，暴露到window全局下的唯一变量名为trace
	-author hahaboy | @攻城氏
	-github https://github.com/1144/trace
*/
window.trace || function(window, document){
	
	var _Trace, //调试框对象，上线后不能使用这个对象！！！
		tracePrefix = 'trace', //调试框命名前缀
		cssPrefix = '#'+tracePrefix+'_box '; //样式前缀

	var _time = {},
		_cache = [], //调试输出数据
		join = _cache.join;

	//type: 0 white for trace, 1 green for ok, 2 yellow for warn, 3 red for err
	function pushData(type, args){
		args = args.length===1 ? args[0] : join.call(args, '◆'); //不要用' | '之类有空格的
		_cache.push([type, args]);
		_Trace.inited && _Trace.showThisData(type, args);
	}
	function trace(data){
		//对trace单独处理，因为绝大多数时候是调用trace
		arguments.length>1 && (data = join.call(arguments, '◆'));
		_cache.push([0, data]);
		_Trace.inited && _Trace.showThisData(0, data);
	}
	trace.ok = function(){
		pushData(1, arguments);
	};
	trace.warn = function(){
		pushData(2, arguments);
	};
	trace.error = function(){
		pushData(3, arguments);
	};
	trace.time = function(label){
		_time[label] && _cache.push([2, label+' is timing!']);
		_time[label] = new Date().getTime();
	};
	trace.timeEnd = function(label){
		//_time[label] && trace.error( label+' time: '+(+new Date()-_time[label]) );
		//不必判断_time[label]存不存在，number-undefined=NaN，正好是一种报错
		_cache.push([1, label+'\'s time: '+(new Date().getTime() - _time[label])]);
		delete _time[label];
	};
	var _testCount = 0, //测试用例总数
		_testErrorCount = 0; //测试未通过的总数
	trace.eq = function(actualValue, expectedValue, msg){
		_testCount++;
		if(actualValue !== expectedValue){
			trace.error('EQ-ERROR: '+ (msg || '测试用例失败'));
			trace.warn('测试期望值：'+expectedValue+' ('+(typeof expectedValue)+')');
			trace.warn('测试实际值：'+actualValue+' ('+(typeof actualValue)+')');
			_testErrorCount++;
		}
	};
	trace.find = function(value, msg){
		_testCount++;
		if(!value){
			trace.error('FIND-ERROR: '+ (msg || '测试用例失败'));
			trace.warn('测试实际值：'+(value===''?'[空字符串]':value)+' ('+(typeof value)+')');
			_testErrorCount++;
		}
	};
	trace.assert = function(trueValue, msg){
		_testCount++;
		if(trueValue !== true){
			trace.error('ASSERT-ERROR: '+ (msg || '测试用例失败') );
			trace.warn('测试期望值：true');
			_testErrorCount++;
		}
	};
	trace.report = function(){
		if(_testCount){
			trace('本次报告时测试用例总数：'+_testCount);
			if(_testErrorCount){
				trace.error('　　测试失败总数：'+_testErrorCount);
				trace.ok('　　测试成功总数：'+(_testCount - _testErrorCount));
				_testErrorCount = 0;
			}else{
				trace.ok('　　测试全部通过。');
			}
			_testCount = 0;
		}
	};
	trace.sendLog = function (msg) {
		msg && trace.warn('send log: ' + msg);
	};
	trace.show = function () {
		_Trace.showing || _Trace.toggleDisplay();
	};

	window.trace = trace;

	//trace.time('trace_self');
	//以下为本地调试时用到的东东
	var _ua = window.navigator.userAgent.toLowerCase();
	var _ie = _ua.match(/msie (\d+)/) || false;
	var isIE6 = _ie && _ie[1]==='6';

	//给指定对象增加HTML[不会破坏这个对象已有节点的事件]
	var addHTML = function(parent, html){
		parent.insertAdjacentHTML('BeforeEnd', html);
	};
	/*if(isIE){
		addHTML = function(parent, html){
			parent.insertAdjacentHTML('BeforeEnd', html);
		};
	}else{
		addHTML = function(parent, html){
			var range = parent.ownerDocument.createRange();
			range.setStartBefore(parent);
			parent.appendChild(range.createContextualFragment(html));
		};
	}*/

	var toString = Object.prototype.toString;

	var byId = function(id){
		return typeof id==='string' ? document.getElementById(id) : id;
	};
	var createElement = function(tagName){
		return document.createElement(tagName);
	};
	//把一段html字符串创建成一个HTML节点
	//注意html字符串只能包含一个节点
	var toNode = function(){
		var node = createElement('div');
		return function(html){
			node.innerHTML = html;
			return node.firstChild;
		};
	}();
	var addEvent, removeEvent, stopEvent;
	if (document.addEventListener) {
		//标准浏览器
		addEvent = function(elem, handle, type){
			typeof elem==='string' && (elem = document.getElementById(elem));
			if(elem && elem.addEventListener){
				elem.addEventListener(type||'click', handle, false);
			}
		};
		removeEvent = function(elem, handle, type){
			if(elem && elem.removeEventListener){
				elem.removeEventListener(type, handle, false);
			}
		};
		stopEvent = function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
		};
	} else {
		//低版本IE
		addEvent = function(elem, handle, type){
			typeof elem==='string' && (elem = document.getElementById(elem));
			if(elem && elem.attachEvent){
				elem.attachEvent('on'+(type||'click'), handle);
			}
		};
		removeEvent = function(elem, handle, type){
			if(elem && elem.detachEvent){
				elem.detachEvent('on'+type, handle);
			}
		};
		stopEvent = function(evt) {
			evt = evt || window.event;
			evt.cancelBubble = true;
			evt.returnValue = false;
		};
	}
	
	//绑定调用对象
	var bind = function(fn, context, args){
		return args ? function(){
			return fn.apply(context, args);
		} : function(){
			return fn.apply(context, arguments);
		};
	};
	var special_rep = {' ':'&nbsp;', '<':'&lt;', '&':'&amp;'};
	//将字符串的标签符号转义。
	var encodeHTML = function(str){
		if(typeof str==='string'){
			str = str==='' ? '[空字符串]' : str.replace(/ |<|&/g, function(m){
				return special_rep[m];
			});
		}
		return str;
	};
	//支持最简单的本地存储，记录关闭调试框当时的：运行过的命令、上边距、右边距、宽、高。
	var LStorage = function(){
		if(typeof JSON==='undefined'){
			var JSON = {
				parse: function(str){
					try{
						return (new Function('return '+str))();
					}catch(e){return null}
				},
				stringify: function(obj){
					//在这里只支持一层深度的对象
					if(typeof obj==='object' && obj){
						var ret = [],
							k, v;
						for (k in obj) {
							v = obj[k];
							ret.push(k + ":" + (typeof v==='string' ? "'"+v.replace(/'/g,"\\\'")+"'" : v));
						}
						return "{" + ret.join(",") + "}";
					}else{
						return ''+obj;
					}
				}
			};
		}

		var proxy = {};
		var saver = window.localStorage || (window.globalStorage && globalStorage[location.host]);
		if(saver){
			proxy.setItem = function(key, value){
				try {
					saver.setItem(key, JSON.stringify(value));
				}catch(e){}
			};
			proxy.getItem = function(key){
				var value = saver.getItem(key);
				return value ? JSON.parse(value)||value : value;
			};
		}else{
			saver = createElement('div');
			saver.addBehavior("#default#userData");
			(document.body || document.getElementsByTagName('head')[0]).appendChild(saver);
			var dbName = tracePrefix + '_LStore_u7m5i';
			proxy.setItem = function(key, value){
				try {
					saver.load(dbName);
					saver.setAttribute(key, JSON.stringify(value));
					saver.save(dbName);
				}catch(e){}
			};
			proxy.getItem = function(key){
				saver.load(dbName);
				var value = saver.getAttribute(key);
				return value ? JSON.parse(value)||value : value;
			};
		}
		return proxy;
	}();
	
	//做最大最小化用到：.content的宽高为280、360时，整个调试框的宽高为283、399。CMD宽302
	//调试框的样式。
	var trace_css = '<style type="text/css">' + //&#00;
		cssPrefix + '{margin:0;padding:0;display:block;top:5px;right:5px;position:fixed;z-index:100000;_width:282px;' +
			'background:#000;border:1px solid #000;font-size:12px;font-family:Verdana;}' +
		cssPrefix + 'div{margin:0;padding:0;border-width:0;}' +
		cssPrefix + 'li{display:block;background-color:#000;}' +
		cssPrefix + '.bg-333{background-color:#333;}' +
		cssPrefix + '.floatLeft{float:left;clear:none;}' +
		cssPrefix + 'a{outline:none;}' +
		cssPrefix + 'a:link{color:#FFF;text-decoration:none;}' +
		cssPrefix + 'a:active{color:#FFF;text-decoration:none;}' +
		cssPrefix + 'a:visited{color:#FFF;text-decoration:none;}' +
		cssPrefix + 'a:hover{color:#FFF;text-decoration:underline;}' +
		cssPrefix + '.trace_cnt{border:1px solid #FFF;padding:0px;}' +
		cssPrefix + '.menu{position:absolute;color:#CCC;top:2px;right:4px;width:160px;height:20px;}' +
		cssPrefix + '.menu .item{color:#666;margin-right:12px;line-height:20px;}' +
		cssPrefix + '.close a{line-height:20px;}' +
		cssPrefix + '.close a:hover{color:#F00;}' +
		cssPrefix + '.titlebar{color:#000;font-weight:600;line-height:22px;' +
			'background-color:#AAA;padding:0 5px;cursor:move;}' +
		cssPrefix + '.content{width:280px;height:360px;overflow:auto;overflow-y:scroll;overflow-x:auto;' +
			'color:#FFF;background:#000;}' +
		cssPrefix + '.content ul{margin:0;padding:0;}' +
		cssPrefix + '.content li{word-break:break-all;padding:4px 3px 4px 5px;list-style-type:none;}' +
		cssPrefix + '.resize{height:10px;background-color:#AAA;cursor:sw-resize;}' +
		cssPrefix + '.btn{height:23px;padding:2px 5px;color:#FFF;background:#666;' +
			'border-left:1px solid #CCC;border-top:1px solid #CCC;' +
			'border-right:1px solid #000;border-bottom:1px solid #000;cursor:pointer;}' +
		cssPrefix + '.command_area{position:absolute;left:-302px;top:-1px;background-color:#999;' +
			'width:300px;height:397px;border:1px solid #000;}' +
		cssPrefix + '.command_cnt{padding:0 5px;}' +
		cssPrefix + '.command_textarea{width:286px;height:328px;}' +
		cssPrefix + '.command_title{line-height:24px;color:#333;}' +
		cssPrefix + '.right{text-align:right;padding-top:6px;}' +
		cssPrefix + '.right span{margin-left:15px;}' +
		cssPrefix + '.fold{color:#0099FF;cursor:pointer;}' +
		cssPrefix + '.dir div{line-height:14px;margin:0;padding:0;zoom:1;overflow:hidden;}' +
		cssPrefix + '.line_num{float:right;font-size:10px;}' +
		//['#FFFFFF', '#00FF00', '#FFFF00', '#FF0000']; //白，绿，黄，红
		cssPrefix + '.color-0{color:#FFF;}' +
		cssPrefix + '.color-1{color:#0F0;}' +
		cssPrefix + '.color-2{color:#FF0;}' +
		cssPrefix + '.color-3{color:#F00;}' +
	'</style>';
	//调试框的HTML
	var trace_html = ''
		+'<div id="{prefix}_cmd_area" class="command_area" style="display:none;">'
			+'<div class="command_cnt">'
				+'<div class="command_title">输入JS脚本 (Ctrl+Enter 运行)</div>'
				+'<textarea id="{prefix}_cmd_textarea" class="command_textarea"></textarea>'
				+'<div class="right">'
					+'<span><input id="{prefix}_cmd_run" type="button" value="运行" class="btn" /></span>'
					+'<span><input id="{prefix}_cmd_hide" type="button" value="隐藏" class="btn" /></span>'
					+'<span><input id="{prefix}_cmd_clear" type="button" value="清除" class="btn" /></span>'
				+'</div>'
			+'</div>'
		+'</div>'
		+'<div class="trace_cnt">'
			+'<div class="menu">'
				+'<div class="floatLeft item">'
					+'<a id="{prefix}_clear" href="javascript:;" hidefocus="true" title="清空 Alt+#">Clear</a>'
				+'</div>'
				+'<div class="floatLeft item">'
					+'<a id="{prefix}_cmd_show" href="javascript:;" hidefocus="true" title="命令行">CMD</a>'
				+'</div>'
				+'<div class="floatLeft item">'
					+'<a id="{prefix}_help" href="javascript:;" hidefocus="true" title="帮助">Help</a>'
				+'</div>'
				+'<div class="floatLeft item">'
					+'<a id="{prefix}_zoom" href="javascript:;" hidefocus="true" title="最大化 Alt+!">O</a>'
				+'</div>'
				+'<div class="floatLeft close">'
					+'<a id="{prefix}_close" href="javascript:;" hidefocus="true" onclick="return false;" title="关闭">X</a>'
				+'</div>'
				+'<div style="clear:both;"></div>'
			+'</div>'
			+'<div id="{prefix}_titlebar" class="titlebar" title="隐藏 Alt+~">trace</div>'
			+'<div>'
				+'<div class="content">'
					+'<ul id="{prefix}_list"></ul>'
					+'<ul style="display:none;font-family:serif,caption;padding:5px 0;">' //help
						+'<li><strong style="font-size:14px;">快捷键：</strong></li>'
						+'<li>　Alt + ~(`)　显示/隐藏控制台</li>'
						+'<li>　Alt + !(1)　最大化/还原大小</li>'
						+'<li>　Alt + @(2)　刷新页面自动/不自动显示控制台</li>'
						+'<li>　Alt + #(3)　清空/重显内容</li>'
						+'<li>　Alt + %(5)　清空缓存</li>'
						+'<li>　Alt + ↓　　让控制台更透明</li>'
						+'<li>　Alt + ↑　　让控制台更不透明</li>'
						+'<li><strong style="font-size:14px;">功能说明：</strong></li>'
						+'<li>　拖拽标题栏可以移动控制台；</li>'
						+'<li>　双击标题栏可最大化或还原控制台大小；</li>'
						+'<li>　点击“×”关闭按钮时，浏览器会记住控制台当前状态：宽高、位置、透明度；</li>'
						+'<li>　向左下方拖拽控制台底部的灰色区，可改变控制台大小。</li>'
						+'<li>　再次点击“Help”关闭本页。</li>'
					+'</ul>'
				+'</div>'
				+'<div id="{prefix}_resize" class="resize"></div>'
			+'</div>'
		+'</div>';

	_Trace = {
	opacity: 100, //调试框透明度：100不透明，最小10非常透明
	//创建调试框节点并绑定事件
	initDebugPanel: function () {
		var debugPanel = createElement("div");
		debugPanel.id = tracePrefix + "_box";
		debugPanel.innerHTML = trace_html.replace(/{prefix}/g, tracePrefix);
		document.body.appendChild(debugPanel);

		this.box = byId(tracePrefix + "_box");
		this.list = byId(tracePrefix + "_list");
		this.list_container = this.list.parentNode;
		this.cmd_textarea = byId(tracePrefix + "_cmd_textarea");
		
		var _this = this;
		//关闭按钮绑定事件
		addEvent(tracePrefix + "_close", function(){
			var box_style = _this.box.style,
				container_style = _this.list_container.style,
				showInfo;

			box_style.display = 'none';
			//trace(_this.list_container.scrollTop);
			showInfo = {
				top: isIE6 ? _Trace.ie6top : box_style.top,
				right: box_style.right,
				width: container_style.width,
				height: container_style.height,
				cmd: _this.cmd_textarea.value
				//scroll: _this.list_container.scrollTop || 1,
				//opacity: 100
			};
			_this.opacity<100 && (showInfo.opacity=_this.opacity);
			LStorage.setItem(tracePrefix+'_showInfo', showInfo);
		});
		// 清理按钮绑定事件
		addEvent(tracePrefix+"_clear", function(){
			_this.clearConsole();
		});
		// help
		addEvent(tracePrefix+"_help", function(){
			if( _this.list.style.display==='none' ){
				_this.list.nextSibling.style.display = 'none';
				_this.list.style.display = '';
			}else{
				_this.list.style.display = 'none';
				_this.list.nextSibling.style.display = '';
			}
		});
		// 检测脚本区域的 Ctrl+Enter 按键
		addEvent(this.cmd_textarea, function(evt){
			evt = evt || window.event;
			if(evt.ctrlKey){
				(evt.keyCode||evt.which)===13 && _this.execJsCode();
			}
		}, "keyup");
		//按钮执行命令
		addEvent(tracePrefix+"_cmd_run", function(){
			_this.execJsCode();
		});
		//显示命令行
		addEvent(tracePrefix+"_cmd_show", function(){
			_this.commandArea();
		});
		addEvent(tracePrefix+"_cmd_hide", function(){
			_this.commandArea();
		});
		addEvent(tracePrefix+"_cmd_clear", function(){
			_this.cmd_textarea.value = '';
		});

		this.firstShow();
		this.showCacheData();
		this.inited = true;

		this.dragable(); //可拖拽
		this.resizable(); //可改变大小
		//放大缩小控制台
		addEvent(tracePrefix+"_zoom", function(){
			_this.zoom(true);
		});
		//双击titlebar放大缩小控制台
		addEvent(tracePrefix+"_titlebar", function(){
			_this.zoom();
		}, 'dblclick');
		isIE6 && this.ie6FixPosition();
	},
	firstShow: function () {
		var box_style = this.box.style,
			container_style = this.list_container.style,
			showInfo = LStorage.getItem(tracePrefix+'_showInfo');
		if(showInfo){
			showInfo.top && (box_style.top=showInfo.top);
			showInfo.right && (box_style.right=showInfo.right);
			if(showInfo.width){
				container_style.width = showInfo.width;
				isIE6 && (box_style.width=(parseInt(showInfo.width)+2)+'px');
			}
			showInfo.height && (container_style.height=showInfo.height);
			showInfo.cmd && (this.cmd_textarea.value=showInfo.cmd);
			//showInfo.scroll && (this.scroll=showInfo.scroll);
			showInfo.opacity && this.setOpacity(showInfo.opacity);
		}
	},
	showing: false,
	//显示/隐藏调试框，如果不存在，就直接创建节点
	toggleDisplay: function () {
		//如果节点不存在就创建，否则直接控制显示隐藏
		if (this.box) {
			this.showing = !this.showing; //this.box.style.display === 'none';
			this.box.style.display = this.showing ? 'block' : 'none';
		} else {
			this.showing = true;
			//创建样式表到head中
			var css = toNode(trace_css), //IE678创建不了style节点，并且要加&#00;
				head = document.head || document.getElementsByTagName("head")[0];
			css ? head.appendChild(css) : addHTML(head, '&#00;'+trace_css);
			setTimeout(function(){_Trace.initDebugPanel()}, 1);
		}
	},
	//IE6 的纵向滚动条跟随
	ie6FixPosition: function () {
		var scrtimer = 0,
			box = this.box;
		box.style.position = "absolute";
		this.ie6top = parseInt(box.style.top)||5;
		var cmdarea_style = byId(tracePrefix+"_cmd_area").style;
		cmdarea_style.left = "1px";
		cmdarea_style.top = "26px";
		cmdarea_style.height = "370px";
		var winScroll = function(){
			var scrtop = document.documentElement.scrollTop;// || document.body.scrollTop;
			box.style.top = (scrtop + _Trace.ie6top) + 'px';
		};
		winScroll();

		addEvent(window, function(){
			clearTimeout(scrtimer);
			scrtimer = setTimeout(winScroll, 200);
		}, 'scroll');
	},
	//在控制台打印对象（JS对象及 HTML 节点）的数据结构
	printObject: function (obj, lineNum) {
		var debugItem = toNode('<li class="dir'+(lineNum&1?' bg-333':'')+
			'"><span class="line_num">#'+lineNum+'</span>'+toString.call(obj)+': </li>');
		debugItem.appendChild( this.parseObject(obj,2) );
		this.list.appendChild(debugItem);
	},
	//解析 object 对象，并生成相应节点
	parseObject: function (obj, index) {
		var line = new Array(index).join("&nbsp;├─ ");// + '&nbsp;';| —
		//var isArray = Object.prototype.toString.call(obj)==='[object Array]';
		var level1 = createElement('div'),
			level2,
			key,
			val;
		for(key in obj){
			val = obj[key];
			level2 = createElement('div');
			if(typeof val==='object' && val){
				level2.innerHTML = line;
				var foldNode = createElement('span');
				foldNode.className = 'fold';
				foldNode.onclick = bind(this.foldObjNode, this, [val, foldNode, index]);
				foldNode.innerHTML = key + ' : '+ toString.call(val); //val会变成[object Object]之类
				level2.appendChild(foldNode);
			}else{
				level2.innerHTML = line + key + ' : ' + encodeHTML(val);
			}
			level1.appendChild(level2);
		}
		level2 = null;
		if(typeof key==='undefined'){
			level1.innerHTML = line + encodeHTML(': ' + obj); //正则里含<符号就不好了
		}
		return level1;
	},
	//展开/收起可展开的节点
	foldObjNode: function (obj, node, index) {
		var nodes = node.parentNode.getElementsByTagName('div');
		if(nodes.length===0){
			node.parentNode.appendChild( this.parseObject(obj, index+1) );
		}else{
			nodes = nodes[0];
			nodes.style.display = nodes.style.display==="none" ? "block" : "none";
		}
	},
	//显示缓存数据
	showCacheData: function () {
		var i = 0,
			len = _cache.length,
			itype, idata;
		// 遍历所有缓存的数据
		for(; i < len; i++){
			itype = _cache[i][0];
			idata = _cache[i][1];
			if(typeof idata==='object' && idata){
				this.printObject(idata, i);
			}else{
				this.list.appendChild(toNode('<li class="color-'+itype+(i&1?' bg-333':'')+
					'"><span class="line_num">#'+i+'</span>'+encodeHTML(idata)+'</li>'));
			}
		}
		this.len = len; //为后续showThisData使用
		//数据渲染完毕，跳转到面板底部
		this.scrollToBottom();
	},
	//显示当前产生的调试信息
	showThisData: function (itype, idata) {
		var i = this.len;
		if(typeof idata==="object" && idata){
			this.printObject(idata, i);
		}else{
			this.list.appendChild(toNode('<li class="color-'+itype+(i&1 ? ' bg-333' : '')+
				'"><span class="line_num">#'+i+'</span>'+encodeHTML(idata)+'</li>'));
		}
		this.len++;
		this.scrollToBottom();
	},
	//滚动调试窗到最底部
	scrollToBottom: function () {
		this.list_container.scrollTop = this.list_container.scrollHeight;
	},
	//显示/隐藏脚本输入框
	commandArea: function (isShow) {
		var cmd_style = byId(tracePrefix + "_cmd_area").style;
		if(cmd_style.display==='none'){
			cmd_style.display = '';
			this.cmd_textarea.focus();
		}else{
			cmd_style.display = 'none';
		}
	},
	execJsCode: function () {
		var scriptText = this.cmd_textarea.value;
		try{
			eval(scriptText);
		}catch(e){
			trace.error("Execute JS error: " + e.message);
		}
	},
	//清空所有调试信息，仅是控制台的呈现，不包括缓存的 JS 数组
	clearConsole: function () {
		this.list.innerHTML = "";
		this.len = 0;
	},
	//drag title bar
	dragable: function () {
		var box = this.box,
			startRight, startTop,
			startX, startY;
		
		var mouseMove = function(evt){
			//evt = evt || window.event;
			stopEvent(evt);
			var newRight = startRight - (evt.pageX || evt.x || 0) + startX,
				newTop = startTop + (evt.pageY || evt.y || 0) - startY;
			
			box.style.right = newRight+"px";
			box.style.top = newTop+"px";
		};
		var mouseUp = function(evt){
			stopEvent(evt);
			removeEvent(document.body, mouseMove, "mousemove");
			removeEvent(document.body, mouseUp, "mouseup");
			isIE6 && (_Trace.ie6top=parseInt(box.style.top)-document.documentElement.scrollTop);
		};
		addEvent(tracePrefix+'_titlebar', function(evt){
			//evt = evt || window.event;
			stopEvent(evt);
			
			startRight = parseInt(box.style.right)||0;
			startTop = parseInt(box.style.top)||0;
			startX = evt.pageX || evt.x || 0;
			startY = evt.pageY || evt.y || 0;
			
			addEvent(document.body, mouseMove, "mousemove");
			addEvent(document.body, mouseUp, "mouseup");
		}, "mousedown");
	},
	//resize panel
	resizable: function () {
		var container = this.list_container,
			startH, startW,
			startX, startY;
		
		var mouseMove = function(evt){
			evt = evt || window.event;
			//stopEvent(evt);
			var newH = startH + (evt.pageY || evt.y || 0) - startY,
				newW = startW - (evt.pageX || evt.x || 0) + startX;
			//trace(newH, newW);
			if( newH>359 ){
				container.style.height = newH+'px';
			}
			if( newW>279 ){
				container.style.width = newW+'px';
				isIE6 && (_Trace.box.style.width=(newW+2)+'px');
			}
		};
		var mouseUp = function(evt){
			//stopEvent(evt);
			removeEvent(document.body, mouseMove, "mousemove");
			removeEvent(document.body, mouseUp, "mouseup");
		};
		addEvent(tracePrefix+'_resize', function(evt){
			//evt = evt || window.event;
			stopEvent(evt);
			startH = parseInt(container.style.height)||360;
			startW = parseInt(container.style.width)||280;
			startX = evt.pageX || evt.x || 0;
			startY = evt.pageY || evt.y || 0;
			
			addEvent(document.body, mouseMove, "mousemove");
			addEvent(document.body, mouseUp, "mouseup");
		}, "mousedown");
	},
	zoomInfo: {},
	//isMin 是否单击最小化按钮，否则返回原大小
	zoom: function (isMin) {
		var zoom = byId(tracePrefix+"_zoom"),
			zoomInfo = this.zoomInfo,
			box_style = this.box.style,
			container_style = this.list_container.style;
		if(zoom.innerHTML==='O'){
			//要放大
			zoom.innerHTML = 'Θ';
			zoom.title = '最小化';
			zoomInfo.top = box_style.top||'5px';
			zoomInfo.right = box_style.right||'5px';
			zoomInfo.width = container_style.width||'280px';
			zoomInfo.height = container_style.height||'360px';

			//计算当前窗口大小
			var winW = document.documentElement.clientWidth || document.body.clientWidth,
				winH = document.documentElement.clientHeight || document.body.clientHeight;
			container_style.width = (winW-305)+'px'; //除去命令行的302以及调试框边界宽3
			container_style.height = (winH-39)+'px'; //除去调试框边界高等值39
			box_style.top = box_style.right = '0px';
			if(isIE6){
				box_style.top = document.documentElement.scrollTop+'px';
				//box_style.display = 'none';
				//box_style.display = '';
				box_style.width = (winW-305+2)+'px';
			}
		}
		else{
			//要缩小
			zoom.innerHTML = 'O';
			zoom.title = '最大化';
			box_style.top = zoomInfo.top;
			box_style.right = zoomInfo.right;
			container_style.width = isMin ? '280px' : zoomInfo.width;
			container_style.height = isMin ? '360px' : zoomInfo.height;
			if(isIE6){
				//box_style.display = 'none';
				//box_style.display = '';
				box_style.width = isMin ? '282px' : (parseInt(zoomInfo.width)+2)+'px';
			}
		}
	},
	setOpacity: function (val, offest) {
		if(offest){
			val = this.opacity + offest;
		}
		if(val>9 && val<=100){
			this.opacity = val;
			this.box.style.filter = "alpha(opacity="+val+")";
			this.box.style.opacity = val/100;
		}
	}
	}; //_Trace end
	
	//在页面上绑定快捷键
	//Alt+~(`) 显示/隐藏控制台
	//Alt+!(1) 最大化/最小化控制台
	//Alt+@(2) 刷新页面自动/不自动显示控制台
	//Alt+#(3) 清空/重显内容
	//Alt+%(5) 清空缓存
	//Alt+↑ 更不透明；Alt+↓ 更透明。
	addEvent(document, function(evt){
		evt = evt || window.event;
		if (evt.altKey) {
			var key = evt.keyCode || evt.which;
			if (key === 192) {
				_Trace.toggleDisplay();
			} else if (_Trace.showing && _Trace.box) {
				switch (key) {
					case 49: //Alt+!
						_Trace.zoom();
						break;
					case 50: //Alt+@
						if(LStorage.getItem(tracePrefix+'_autoShow')==='y'){
							LStorage.setItem(tracePrefix+'_autoShow', 'n');
							alert('刷新页面时将 不自动显示 trace控制台。');
						}else{
							LStorage.setItem(tracePrefix+'_autoShow', 'y');
							alert('刷新页面时将 自动显示 trace控制台。');
						}
						break;
					case 51: //Alt+#
						_Trace.len ? _Trace.clearConsole() : _Trace.showCacheData();
						break;
					case 53: //Alt+%
						_cache = [];
						alert('trace缓存已清空。');
						break;
					case 38: //Alt+↑
						_Trace.setOpacity(0, 10);
						break;
					case 40: //Alt+↓
						_Trace.setOpacity(0, -10);
						break;
				}
			}
		}
	}, "keydown");
	
	LStorage.getItem(tracePrefix + '_autoShow')==='y' &&
		addEvent(window, trace.show, 'load');

	//trace.timeEnd('trace_self');
	
}(window, document);
