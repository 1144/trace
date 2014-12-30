/*--
	线上使用的trace文件
	-author hahaboy | @攻城氏
	-github https://github.com/1144/trace
*/
window.trace || function(window){
	
	var logReceiver = '//count.cn/jslog?data='; //日志接收接口

	var _cache = [], //调试输出的数据缓存
		errMsg = '', //收集错误信息
		sendNow = false;

	function trace() {}

	trace.ok = trace.time = trace.timeEnd = trace.report = trace.show = function () {};

	trace.warn = function(msg){
		arguments.length>1 && (msg = _cache.join.call(arguments, '◆'));
		_cache.push('[2]:'+msg);
	};
	trace.error = function(msg){
		arguments.length>1 && (msg = _cache.join.call(arguments, ';'));
		errMsg += encodeURIComponent(msg) + '---'; //收集错误信息
		//信息的编码长度超过500，才向服务器发送日志
		if(sendNow || errMsg>500){
			sendLog(errMsg);
			errMsg = '';
		}
		_cache.push('[3]:'+msg);
	};
	trace.eq = function(actualValue, expectedValue, msg){
		actualValue===expectedValue || trace.error('EQ-ERROR:'+ (msg || ''));
	};
	trace.find = function(value, msg){
		value || trace.error('FIND-ERROR:'+ (msg || ''));
	};
	trace.assert = function(trueValue, msg){
		trueValue===true || trace.error('ASSERT-ERROR:'+ (msg || ''));
	};

	//msg必须是encodeURIComponent过的
	function sendLog(msg){
		var img = new Image();
		img.onload = img.onerror = function(){
			img = null;
		};
		//同样的错误2.78小时内只报一次。10000000ms = 2.78小时
		img.src = logReceiver + msg + '&t=' + String(new Date().getTime()).slice(0, 6);
		//还真不用保证全部发送成功，没必要
		//setTimeout(function(){}, 1000); //确保在firefox下页面关闭时也能发出img请求
	}
	
	//建议：这个只是为监控前端JS代码可用性的日志投递函数。
	//    产品类的用户行为统计、数据统计、布玛，请使用别的功能模块。
	//页面里所有js执行完毕后，调用这个函数，立即发送所有日志信息到服务器
	//并且此后再调用trace.error和trace.timeEnd都将立即向服务器发送日志
	//msg 如果传了这个参数，表示只是发送这个msg到服务器；
	//    没有的话则检查发送timeMsg和errMsg。
	trace.sendLog = function(msg){
		if(msg){
			sendLog(encodeURIComponent(msg));
			return;
		}
		if(errMsg){
			sendLog(errMsg);
			errMsg = '';
		}
		sendNow = true;
	};
	
	//如果url中含有&_TRACE_&，则1分钟后弹出日志信息，方便在线和用户联调
	if(location.search.indexOf('&_TRACE_&')>0){
		setTimeout(function(){
			alert(_cache.join('___'));
		}, 60000);
	}

	trace.cache = _cache; //挂到trace上，方便在线上直接查看错误信息
	window.trace = trace;

}(window);
