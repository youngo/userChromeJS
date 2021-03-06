// ==UserScript==
// @name           SITEINFO_Writer.uc.js
// @description    AutoPagerize の SITEINFO を書くためのスクリプト
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @include        main
// @compatibility  Firefox 5 - firefox 23a1
// @charset        UTF-8
// @version        下書き1
// @note           增加下一页中文选择xpath By ywzhaiqi@gmail.com
// @note           fix compatibility for firefox 23a1 by lastdream2013
// @note           まだこれからつくり込む段階
// @note           ツールメニューから起動する
// ==/UserScript==

(function(css){

if (window.siteinfo_writer) {
	window.siteinfo_writer.destroy();
	delete window.siteinfo_writer;
}

window.siteinfo_writer = {
	init: function() {
      	this.style = addStyle(css);

	  	var overlay = '\
	      <overlay xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" \
	               xmlns:html="http://www.w3.org/1999/xhtml"> \
	        <window id="main-window">\
				<vbox id="sw-container" class="sw-add-element" hidden="true">\
				    <hbox id="sw-hbox">\
				      <toolbarbutton label="查看规则" oncommand="siteinfo_writer.toJSON();"/>\
				      <toolbarbutton label="查看规则(SP)" oncommand="siteinfo_writer.toSuperPreLoaderFormat();"/>\
				      <toolbarbutton id="sw-curpage-info" label="读取当前页面规则" oncommand="siteinfo_writer.getCurPageInfo();"/>\
				      <toolbarbutton label="从剪贴板读取规则" oncommand="siteinfo_writer.readFromClipboard();"/>\
				      <toolbarbutton id="sw-launch" label="启动规则" tooltiptext="启动uAutoPagerize" oncommand="siteinfo_writer.launch();"/>\
				      <spacer flex="1"/>\
				      <toolbarbutton class="tabs-closebutton" oncommand="siteinfo_writer.hide();"/>\
				    </hbox>\
				    <grid id="sw-grid">\
				      <columns>\
				        <column />\
				        <column />\
				        <column flex="1"/>\
				        <column />\
				      </columns>\
				      <rows>\
				        <row>\
				          <label value="siteName" />\
                          <toolbarbutton class="inspect"\
                                         tooltiptext="提取网站名称"\
                                         oncommand="siteinfo_writer.siteName.value = content.document.title;"/>\
				          <textbox id="sw-siteName"/>\
                          <hbox />\
				        </row>\
				        <row>\
				          <label value="url" />\
                          <toolbarbutton class="inspect"\
                                         tooltiptext="提取地址"\
                                         oncommand="siteinfo_writer.setUrl();"/>\
				          <textbox id="sw-url" oninput="siteinfo_writer.onInput(event);"/>\
                          <hbox />\
				        </row>\
				        <row>\
				          <label value="nextLink" />\
                          <toolbarbutton class="inspect"\
                                         tooltiptext="提取XPath"\
                                         oncommand="siteinfo_writer.inspect(\'nextLink\');"/>\
				          <textbox id="sw-nextLink" multiline="true"/>\
				          <toolbarbutton class="check"\
				                         tooltiptext="测试XPath"\
				                         oncommand="siteinfo_writer.xpathTest(\'nextLink\');"/>\
				        </row>\
				        <row>\
				          <label value="pageElement" />\
                          <toolbarbutton class="inspect"\
                                         tooltiptext="提取XPath"\
                                         oncommand="siteinfo_writer.inspect(\'pageElement\');"/>\
				          <textbox id="sw-pageElement" multiline="true"/>\
				          <toolbarbutton class="check"\
				                         tooltiptext="测试XPath"\
				                         oncommand="siteinfo_writer.xpathTest(\'pageElement\');"/>\
				        </row>\
				        <row>\
				          <label value="insertBefore" />\
                          <toolbarbutton class="inspect"\
                                         tooltiptext="提取XPath"\
                                         oncommand="siteinfo_writer.inspect(\'insertBefore\');"/>\
				          <textbox id="sw-insertBefore"/>\
				          <toolbarbutton class="check"\
				                         tooltiptext="测试XPath"\
				                         oncommand="siteinfo_writer.xpathTest(\'insertBefore\');"/>\
				        </row>\
				      </rows>\
				    </grid>\
				  </vbox>\
			</window>\
	      </overlay>';
    	overlay = "data:application/vnd.mozilla.xul+xml;charset=utf-8," + encodeURI(overlay);
    	window.userChrome_js.loadOverlay(overlay, window.siteinfo_writer);

    	this.addListener();
	},
	observe : function (aSubject, aTopic, aData) {
		if (aTopic == "xul-overlay-merged")
		{
			this.popup = $("mainPopupSet").appendChild($C("menupopup",
					{
						id : "sw-popup",
						class : "sw-add-element",
					}
					));

			var menuitem = $C("menuitem",
				{
                    id: "sw-menuitem",
					class : "sw-add-element",
					label : "辅助定制翻页规则",
					oncommand : "siteinfo_writer.show();",
				}
				);
			$("devToolsSeparator").parentNode.insertBefore(menuitem, $("devToolsSeparator"));

			setTimeout(function ()
			{
				if (!window.uAutoPagerize)
				{
					$("sw-launch").hidden = true;
					return;
				};

				let aupPopup = $("uAutoPagerize-popup");
				if (aupPopup)
				{
					// aupPopup.appendChild(document.createElement("menuseparator")).setAttribute("class", "sw-add-element");
					let newMenuItem = menuitem.cloneNode(false);
					newMenuItem.setAttribute("id", "sw-popup-menuitem");
					aupPopup.appendChild(newMenuItem);
				}
			}, 2000);

			this.container = $("sw-container");
			this.url = $("sw-url");
			this.siteName =  $("sw-siteName");
			this.nextLink = $("sw-nextLink");
			this.pageElement = $("sw-pageElement");
			this.insertBefore = $("sw-insertBefore");

			this.nextLink.addEventListener("popupshowing", siteinfo_writer.pps, false);
			this.pageElement.addEventListener("popupshowing", siteinfo_writer.pps, false);
			this.insertBefore.addEventListener("popupshowing", siteinfo_writer.pps, false);
		}
	},
	uninit : function ()  {
		this.removeListener();
	},
	addListener: function() {
		gBrowser.mPanelContainer.addEventListener('DOMContentLoaded', this, true);
	},
	removeListener: function() {
		gBrowser.mPanelContainer.removeEventListener('DOMContentLoaded', this, true);
	},
	handleEvent: function(event){
		switch(event.type){
			case "DOMContentLoaded":
				var doc = event.target,
					win = doc.defaultView,
					self = this;
				if(win.location.hostname == 'ap.teesoft.info'){
					this.addStyle(doc, ".install{ display: block !important; }\
                        #need-ap { display: none !important;  }");
					this.fixAutoPagerBug(doc);

                    var doc = win.wrappedJSObject.document;
					// 点击 install 自动安装
					var evt = doc.createEvent("Events");
				    doc.addEventListener(evt, function(event){
				    	var ids = event.target.textContent;
				    	self.requestInfoFromAP(ids);
				    }, false);
				}
				break;
		}
	},
	// autopager 查询网站 install(a36122) 没有引号的错误。
	fixAutoPagerBug: function(doc){
		var link, links, onclick;
		links = doc.querySelectorAll("a.install");
		for (var i = links.length - 1; i >= 0; i--) {
			link = links[i];
			onclick = link.getAttribute("onclick").replace(/install\((\w+)\)/, "install('$1')");
			link.setAttribute("onclick", onclick);
		}
	},
	addStyle: function(doc, css) {
		var heads = doc.getElementsByTagName('head');
		if (heads.length > 0) {
			var node = doc.createElement('style');
			node.type = 'text/css';
			node.innerHTML = css;
			heads[0].appendChild(node);
		}
	},
	pps: function(event) {
		event.currentTarget.removeEventListener(event.type, arguments.callee, false);
		var popup = event.originalTarget;
		var type = event.currentTarget.id.replace("sw-", "");

	    popup.appendChild($C("menuseparator",{}));
	    popup.appendChild($C("menuitem", {
	 	label: '@class="xxx" → contains()',
		oncommand: "siteinfo_writer.class2contains('"+ type +"');",
	 }));
	    popup.appendChild($C("menuitem",{
	 	label: 'contains() → @class="xxx"',
		oncommand: "siteinfo_writer.contains2class('"+ type +"');",
	 }));
	},
	destroy: function() {
		$A(document.getElementsByClassName("sw-add-element")).forEach(function(e){
			e.parentNode.removeChild(e);
		})
		this.style.parentNode.removeChild(this.style);

		this.uninit();
	},
	setUrl: function() {
		this.url.value = "^" + content.location.href.replace(/[()\[\]{}|+.,^$?\\]/g, '\\$&');
		this.url.className = "";
	},
	show: function() {
		this.setUrl();
		this.siteName.value = content.document.title;
		this.nextLink.value = "";
		this.pageElement.value = "";
		this.insertBefore.value = "";
		this.container.hidden = false;
	},
	hide: function() {
		this.container.hidden = true;
	},
	toJSON: function() {
		var json = "\t{";
		json += "siteName: '" + this.siteName.value + "',\n";
		json += "\t\turl: '" + this.url.value.replace(/\\/g, "\\\\") + "',\n";
		json += "\t\tnextLink: '" + this.nextLink.value.replace(/'/g, '"') + "',\n";
		json += "\t\tpageElement: '" + this.pageElement.value.replace(/'/g, '"') + "',\n";
		if ( this.insertBefore.value != '' ) {json += "\t\tinsertBefore: '" + this.insertBefore.value + "',\n";}
		json += "\t\texampleUrl: '" + content.location.href + "',\n";
		json += "\t},";
		var r=confirm("翻页规则（按确定键将其复制到剪贴板）："+'\n\n' + json);
		if(r){
			try{
				Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(json);
			}
			catch(e){
				alert(e);
			}
		}
	},
	toSuperPreLoaderFormat: function() {
		var spdb = "\t{";
		spdb += "siteName: '" + this.siteName.value + "',\n";
		spdb += "\t\turl: /" + this.url.value.replace(/\//g, "\\\/") + "/i,\n";
		spdb += "\t\texampleUrl: '" + content.location.href + "',\n";
		spdb += "\t\tnextLink: '" + this.nextLink.value + "',\n";
		spdb += "\t\tautopager: {\n";
		// spdb += "\t\t\tuseiframe: true,\n";
		spdb += "\t\t\tpageElement: '" + this.pageElement.value + "',\n";
		if ( this.insertBefore.value != '' ) {spdb += "\t\t\tHT_insert: ['" + this.insertBefore.value + "', 1],\n";}
		spdb += "\t\t}\n";
		spdb += "\t},";
		var r=confirm("翻页规则(SuperPreLoader格式)（按OK键将其复制到剪贴板）："+'\n\n' + spdb);
		if(r==true){
			try{
				Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(spdb);
			}
			catch(e){
				alert(e);
			}
		}
	},
	getCurPageInfo: function(){
		if(!uAutoPagerize) return;
		var list = uAutoPagerize.getInfoFromURL();
		if(!list) return;

		var self = this;
		if(list.length == 1){
			this.setValueFromCurPage(list[0]);
		}else{
			this.curPageInfos = list;

			let range = document.createRange();
			range.selectNodeContents(self.popup);
			range.deleteContents();
			range.detach();
			for (let [i, info] in Iterator(list)) {
				let menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", info.siteName || info.name || info.url);
				menuitem.setAttribute("oncommand", "siteinfo_writer.setValueFromCurPage(" + i + ")");
				self.popup.appendChild(menuitem);
			}
			self.popup.openPopup($("sw-curpage-info"), "before_after");
		}
	},
	setValueFromCurPage: function(info){
		if(typeof info == 'number'){
			info = this.curPageInfos[info];
		}

		this.siteName.value = info.siteName || info.site || info.name || content.document.title;
		this.nextLink.value = info.nextLink;
		this.pageElement.value = info.pageElement;
		this.insertBefore.value = info.insertBefore || "";

		let url = info.url;
		if(typeof url == 'string'){
			this.url.value = url.replace(/\\\//g, '/').replace(/\\\\/g, '\\');
		}else{
			this.url.value = String(url).replace(/^\//, '').replace(/\/[img]*$/, '')
				.replace(/\\\//g, '/');
		}
	},
	requestInfoFromAP: function(ids){
		var url;
		// json 格式
		if(ids.indexOf('a') == 0){
			url = "http://wedata.net/items/" + ids.slice(1) + ".json"
		}else{
			url = "http://www.teesoft.info/autopager/down/" + ids;
		}

		log("Request: " + url);
		var xhr = new XMLHttpRequest();
		var self = this;
		xhr.onload = function(){
			self.parseInfoFromAP(xhr);
		};
		xhr.open("GET", url, true);
		xhr.send(null);
	},
	parseInfoFromAP: function(xhr){
		if(this.container.hidden == true){
			this.container.hidden = false;
		}

		if(xhr.responseXML){
			log("parseInfoFromAP: XML");
			var xml = xhr.responseXML.documentElement;
			var site = getFirstElementByXPath("/autopager/site", xml);

			var urlPattern = getFirstElementByXPath("//urlPattern", site).textContent;
			var urlIsRegex = getFirstElementByXPath("//urlIsRegex", site).textContent;
			this.url.value = (urlIsRegex == 'false') ? wildcardToRegExpStr(urlPattern) : urlPattern;

			this.siteName.value = getFirstElementByXPath("//desc", site).textContent.replace("AutoPager rule for ", "");
			this.nextLink.value = getFirstElementByXPath("//linkXPath", site).textContent;
			this.pageElement.value = getFirstElementByXPath("//contentXPath", site).textContent;
		}else{
			log("parseInfoFromAP: JSON");
			var info = JSON.parse(xhr.responseText);

			this.siteName.value = info.name;
			this.url.value = info.data.url;
			this.nextLink.value = info.data.nextLink;
			this.pageElement.value = info.data.pageElement;
		}
	},
	readFromClipboard: function(){
		var dataStr = readFromClipboard();
		if(dataStr){
			var data = this.parseInfo(dataStr);
			if(data){
				var url;
				if(data.url.match(/^\/(.*)\/[igm]?$/)){
					url = RegExp.$1.replace(/\\\/\\\//g, '\/\/');
				}else{
					url = data.url.replace(/\\\\/g, '\\');
				}
				this.url.value = url;
				this.siteName.value = data.siteName || data.name;
				this.nextLink.value = data.nextLink;
				this.pageElement.value = data.pageElement;
				this.insertBefore.value = data.insertBefore || '';
			}else{
				alert("剪贴板的数据格式不正确");
			}
		}
	},
	parseInfo: function(str) {
	    var lines = str.split(/\r\n|\r|\n/)
	    var re = /(^[^:]*?):(.*)$/
	    var strip = function(str) {
	        return str.replace(/^[\s\t{'"]*/, '').replace(/[\s,}'"]*$/, '')
	    }
	    var info = {}
	    for (var i = 0; i < lines.length; i++) {
	    	lines[i] = strip(lines[i]);
	        if (lines[i].match(re)) {
	            info[RegExp.$1.trim()] = strip(RegExp.$2).trim();
	        }
	    }
	    var isValid = function(info) {
	        var infoProp = ['url', 'nextLink', 'pageElement']
	        for (var i = 0; i < infoProp.length; i++) {
	            if (!info[infoProp[i]]) {
	                return false
	            }
	        }
	        return true
	    }
	    return isValid(info) ? info : null
	},
	launch: function() {
		if(content.ap){
			var r = confirm("已经运行，是否重新启动？");
			if(r){
				content.ap.destroy(true);
			}else{
				return;
			}
		}

		var i = {};
		["url", "nextLink", "pageElement", "insertBefore"].forEach(function(type) {
			if (this[type].value)
				i[type] = this[type].value
		}, this);
		if (!i.url || !i.nextLink || !i.pageElement)
			return alert("指定的值无效");

		let [index, info] = uAutoPagerize.getInfo([i], content);

		if (index === 0) {
			if (content.AutoPagerize && content.AutoPagerize.launchAutoPager)
				content.AutoPagerize.launchAutoPager([i]);
			else alert("翻页规则语法正确，但uAutoPagerize无法执行，可能uAutoPagerize被禁用或没有安装脚本");
		} else {
			alert("翻页规则不匹配");
		}
	},
	inspect: function(aType) {
		if (this._inspect)
			this._inspect.uninit();
		var self = this;
		this._inspect = new Inspector(content, function(xpathArray) {
			if (xpathArray.length) {
				let range = document.createRange();
				range.selectNodeContents(self.popup);
				range.deleteContents();
				range.detach();
				for (let [i, x] in Iterator(xpathArray)) {
					let menuitem = document.createElement("menuitem");
					menuitem.setAttribute("label", x);
					menuitem.setAttribute("oncommand", "siteinfo_writer['"+ aType +"'].value = this.getAttribute('label')");
					self.popup.appendChild(menuitem);
				}
				self.popup.openPopup(self.container, "before_start");
			}
			self._inspect = null;
		});
	},
	xpathTest: function(aType) {
		var textbox = this[aType]
		if (!textbox || !textbox.value) return;

        var selector = textbox.value;
		try {
            var elements;
            if(selector.startsWith("css;")){
                elements = content.document.querySelectorAll(selector.slice(4));
            }else{
                elements = getElementsByXPath(selector, content.document);
            }
		} catch (e) {
			alert(e);
		}

		for (let [i, elem] in Iterator(elements)) {
			if (!("orgcss" in elem))
				elem.orgcss = elem.style.cssText;
			elem.style.backgroundImage = "-moz-linear-gradient(magenta, plum)";
			elem.style.outline = "1px solid magenta";
		}

		var self = this;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.timer = setTimeout(function() {
			for (let [i, elem] in Iterator(elements)) {
				if ("orgcss" in elem) {
					elem.orgcss?
						elem.style.cssText = elem.orgcss:
						elem.removeAttribute("style");
					delete elem.orgcss;
				}
			}
		}, 5000);
	},
	urlTest: function() {
		var url = this.url.value;
		try {
			var regexp = new RegExp(this.url.value);
			if (regexp.test(content.location.href))
				this.url.classList.remove("error");
			else
				this.url.classList.add("error");
		} catch (e) {
			this.url.classList.add("error");
		}
	},
	inputTimer: null,
	onInput: function(event) {
		if (this.inputTimer) {
			clearTimeout(this.inputTimer);
		}
		var self = this;
		this.inputTimer = setTimeout(function() {
			self.urlTest();
		}, 100);
	},
	class2contains: function(aType) {
		this[aType].value = this.splitClass(this[aType].value);
	},
	contains2class: function(aType) {
		this[aType].value = this.normalClass(this[aType].value);
	},
	splitClass: function(xpath) {
		return xpath.replace(/@class=\"(.+?)\"/g, function(str, cls) {
			cls = cls.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").split(" ");
			for (var i = 0, l = cls.length; i < l; i++) {
				cls[i] = 'contains(concat(" ",normalize-space(@class)," "), " '+ cls[i] +' ")';
			}
			return cls.join(" and ");
		});
	},
	normalClass: function(xpath) {
		let r = /(?:contains\(concat\(\" \"\,normalize\-space\(@class\)\,\" \"\)\, \" .+? \"\)(?: and )?)+/g;
		return xpath.replace(r, function(str) {
			let cls = str.split(' and ').map(function(c) c.replace(/.*\" (.*) \".*/i, '$1') );
			return '@class="'+ cls.join(' ') +'"';
		});
	},
};

window.siteinfo_writer.init();

function Inspector(aWindow, aCallback) {
	this.win = aWindow;
	this.doc = this.win.document;
	this.callback = aCallback;
	this.init();
}
Inspector.prototype = {
	init : function(){
		this.doc.addEventListener('mousedown', this, true);
		this.doc.addEventListener('click', this, true);
		this.doc.addEventListener('mouseover', this, true);
	},
	uninit : function(){
		var self = this;
		this.lowlight();
		this.doc.removeEventListener('mouseover', this, true);
		setTimeout(function(){
			self.doc.removeEventListener('mousedown', self, true);
			self.doc.removeEventListener('click', self, true);
		}, 500);
		XULBrowserWindow.statusTextField.label = "";
	},
	handleEvent : function(event){
		switch(event.type){
			case 'mousedown':
				event.preventDefault();
				event.stopPropagation();
				this.uninit();
				if (event.button == 0)
					this.callback(this.getXPath(this.target));
				break;
			case 'mouseover':
				if (this.target)
					this.lowlight();
				this.target = event.target;
				this.highlight();
				break;
			case "click":
				event.preventDefault();
				event.stopPropagation();
				break;
		}
	},
	highlight : function(){
		if (this.target.mozMatchesSelector('html, body'))
			return;
		if (!("orgcss" in this.target))
			this.target.orgcss = this.target.style.cssText;
		this.target.style.outline = "magenta 2px solid";
		this.target.style.outlineOffset = "-1px";
		XULBrowserWindow.statusTextField.label = this.getElementXPath(this.target, this.ATTR_FULL);
	},
	lowlight : function() {
		if ("orgcss" in this.target) {
			this.target.orgcss?
				this.target.style.cssText = this.target.orgcss:
				this.target.removeAttribute("style");
			delete this.target.orgcss;
		}
	},
	ATTR_CLASSID: 0,
	ATTR_ID: 1,
	ATTR_CLASS: 2,
	ATTR_NOT_CLASSID: 3,
	ATTR_FULL: 4,
	TEXT: 5,
	NEXT_REG: /[下后][一]?[页张个篇章节步]/,
	NEXT_REG_A: /^[下后][一]?[页张个篇章节步]$/,
	getXPath: function(originalTarget) {
		var nodes = getElementsByXPath(
			'ancestor-or-self::*[not(local-name()="html" or local-name()="HTML" or local-name()="body" or local-name()="BODY")]', originalTarget).reverse();
		if (nodes.length == 0) return [];

		var current = nodes.shift();
		var obj = {};
		obj.localnames       = current.localName;
		obj.self_classid     = this.getElementXPath(current, this.ATTR_CLASSID);
		obj.self_id          = this.getElementXPath(current, this.ATTR_ID);
		obj.self_class       = this.getElementXPath(current, this.ATTR_CLASS);
		obj.self_attr        = this.getElementXPath(current, this.ATTR_NOT_CLASSID);
		obj.self_full        = this.getElementXPath(current, this.ATTR_FULL);
		obj.self_text        = this.getElementXPath(current, this.TEXT);
		obj.ancestor_classid = obj.self_classid;
		obj.ancestor_id      = obj.self_id;
		obj.ancestor_class   = obj.self_class;
		obj.ancestor_attr    = obj.self_attr;
		obj.ancestor_full    = obj.self_full;
		obj.ancestor_text    = obj.self_text;

		var hasId = current.getAttribute("id");
		for (let [i, elem] in Iterator(nodes)) {
			obj.localnames = elem.localName + "/" + obj.localnames;

			if (!hasId) {
				hasId = elem.getAttribute("id");
				obj.ancestor_classid = this.getElementXPath(elem, this.ATTR_CLASSID) + "/" + obj.ancestor_classid;
				obj.ancestor_id = this.getElementXPath(elem, this.ATTR_ID) + "/" + obj.ancestor_id;
				obj.ancestor_full = this.getElementXPath(elem, this.ATTR_FULL) + "/" + obj.ancestor_full;
				obj.ancestor_text = this.getElementXPath(elem, this.ATTR_ID) + "/" + obj.ancestor_text;
			}
			obj.ancestor_class = this.getElementXPath(elem, this.ATTR_NOT_CLASS) + "/" + obj.ancestor_class;
			obj.ancestor_attr = this.getElementXPath(elem, this.ATTR_NOT_CLASSID) + "/" + obj.ancestor_attr;
		}

		for (let [key, val] in Iterator(obj)) {
			if (val.substr(0, 4) !== 'id("')
				obj[key] = val = "//" + val;
		}
		var res = [x for each(x in obj)].filter(function(e, i, a) a.indexOf(e) === i).sort(function(a, b){
			let aa = a.substr(0, 4) == 'id("';
			let bb = b.substr(0, 4) == 'id("';
			if ((aa && bb) || (!aa && !bb))
				return b.length - a.length;
			return bb? 1 : -1;
		});
		//var res = [[x, obj[x]] for(x in obj)].sort(function([a,], [b,]) a >= b);
		////inspectObject([x for each(x in res)]);
		//res = [x for each([,x] in res)].filter(function(e, i, a) a.indexOf(e) === i);
		////inspectObject(res);
		return res;
	},
	getElementXPath: function(elem, constant) {
		if (!elem.getAttribute)
			return "";

		if (this.ATTR_CLASSID == constant) {
			if (elem.getAttribute("id"))
				return 'id("'+ elem.getAttribute('id') +'")';
			if (elem.getAttribute("class"))
				return elem.nodeName.toLowerCase() + '[@class="' + elem.getAttribute("class") + '"]';
			return elem.nodeName.toLowerCase();
		}
		if (this.ATTR_ID == constant) {
			if (elem.getAttribute("id"))
				return 'id("'+ elem.getAttribute('id') +'")';
			return elem.nodeName.toLowerCase();
		}
		if (this.ATTR_CLASS == constant) {
			if (elem.getAttribute("class"))
				return elem.nodeName.toLowerCase() + '[@class="' + elem.getAttribute("class") + '"]';
			return elem.nodeName.toLowerCase();
		}
		if(this.TEXT == constant){
			var text = elem.textContent;
			if(text.length < 20  && text.match(this.NEXT_REG)){
				if(text.match(this.NEXT_REG_A)){
					return elem.nodeName.toLowerCase() + '[text()="' + text + '"]';
				}
				return elem.nodeName.toLowerCase() + '[contains(text(), "' + text + '")]';
			}
			return elem.nodeName.toLowerCase();
		}

		var xpath = elem.nodeName.toLowerCase();
		if (this.ATTR_FULL == constant) {
			let x = [];
			if (elem.hasAttribute("id"))
				x[x.length] = '@id="' + elem.getAttribute("id") + '"';
			if (elem.hasAttribute("class"))
				x[x.length] = '@class="' + elem.getAttribute("class") + '"';
			if (x.length)
				xpath += '['+ x.join(" and ") +']';
		}

        /*
		var attrs = elem.attributes;
		var arr = [];
		for (var i = 0, len = attrs.length; i < len; i++) {
			var name = attrs[i].nodeName;
			if (name === "style" || name === "id" || name === "class") continue;
			var value = attrs[i].nodeValue;
			arr[arr.length] = '@' + name + '="' + value + '"';
		};
        */
		var arr = [
			"@"+ x.nodeName +'="'+ x.nodeValue +'"'
				for each(x in $A(elem.attributes))
					if (!/^(?:id|class|style)$/i.test(x.nodeName))
		];
		if (arr.length > 0)
			xpath += '[' + arr.join(" and ") + ']';
		return xpath;
	},
};



function log(arg){ Application.console.log("[SITEINFO_Writer] " + arg); }
function $(id) document.getElementById(id);
function $A(arr) Array.slice(arr);
function $C(name, attr) {
	var el = document.createElement(name);
	if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
	return el;
}

function wildcardToRegExpStr(urlstr) {
	if (urlstr.source) return urlstr.source;
	let reg = urlstr.replace(/[()\[\]{}|+.,^$?\\]/g, "\\$&").replace(/\*+/g, function(str){
		return str === "*" ? ".*" : "[^/]*";
	});
	return "^" + reg + "$";
}

function addStyle(css) {
	var pi = document.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return document.insertBefore(pi, document.documentElement);
}

function getElementsByXPath(xpath, node) {
	var nodesSnapshot = getXPathResult(xpath, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
	var data = [];
	for (var i = 0, l = nodesSnapshot.snapshotLength; i < l; i++) {
		data[i] = nodesSnapshot.snapshotItem(i);
	}
	return data;
}

function getFirstElementByXPath(xpath, node) {
	var result = getXPathResult(xpath, node, XPathResult.FIRST_ORDERED_NODE_TYPE);
	return result.singleNodeValue;
}

function getXPathResult(xpath, node, resultType) {
	var doc = node.ownerDocument || node
	var resolver = doc.createNSResolver(node.documentElement || node)
	// Use |node.lookupNamespaceURI('')| for Opera 9.5
	var defaultNS = node.lookupNamespaceURI(null)
	if (defaultNS) {
		const defaultPrefix = '__default__'
		xpath = addDefaultPrefix(xpath, defaultPrefix)
		var defaultResolver = resolver
		resolver = function (prefix) {
			return (prefix == defaultPrefix)
				? defaultNS : defaultResolver.lookupNamespaceURI(prefix)
		}
	}
	return doc.evaluate(xpath, node, resolver, resultType, null)
}

function addDefaultPrefix(xpath, prefix) {
	const tokenPattern = /([A-Za-z_\u00c0-\ufffd][\w\-.\u00b7-\ufffd]*|\*)\s*(::?|\()?|(".*?"|'.*?'|\d+(?:\.\d*)?|\.(?:\.|\d+)?|[\)\]])|(\/\/?|!=|[<>]=?|[\(\[|,=+-])|([@$])/g
	const TERM = 1, OPERATOR = 2, MODIFIER = 3
	var tokenType = OPERATOR
	prefix += ':'
	function replacer(token, identifier, suffix, term, operator, modifier) {
		if (suffix) {
			tokenType =
				(suffix == ':' || (suffix == '::' &&
				 (identifier == 'attribute' || identifier == 'namespace')))
				? MODIFIER : OPERATOR
		}
		else if (identifier) {
			if (tokenType == OPERATOR && identifier != '*') {
				token = prefix + token
			}
			tokenType = (tokenType == TERM) ? OPERATOR : TERM
		}
		else {
			tokenType = term ? TERM : operator ? OPERATOR : MODIFIER
		}
		return token
	}
	return xpath.replace(tokenPattern, replacer)
};

function readFromClipboard() {
	var url;
	try {
		// Create transferable that will transfer the text.
		var trans = Components.classes["@mozilla.org/widget/transferable;1"]
						.createInstance(Components.interfaces.nsITransferable);
		trans.init(getLoadContext());
		trans.addDataFlavor("text/unicode");
		// If available, use selection clipboard, otherwise global one
		if (Services.clipboard.supportsSelectionClipboard())
			Services.clipboard.getData(trans, Services.clipboard.kSelectionClipboard);
		else
			Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);
		var data = {};
		var dataLen = {};
		trans.getTransferData("text/unicode", data, dataLen);
		if (data) {
			data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
			url = data.data.substring(0, dataLen.value / 2);
		}
	} catch (ex) {}
	return url;
}

})('\
\
#sw-grid row > label {\
  margin: 1px !important;\
}\
  #sw-grid row > textbox {\
  -moz-appearance: none !important;\
  margin: 1px !important;\
  padding: 1px !important;\
  border-width: 1px !important;\
}\
  #sw-grid row > textbox[multiline="true"] {\
  height: 4em;\
}\
\
  #sw-grid .inspect {\
  list-style-image: url("chrome://global/skin/icons/Search-glass.png");\
  -moz-image-region: rect(0px, 16px, 16px, 0px);\
}\
\
  #sw-grid .check {\
  list-style-image: url("chrome://global/skin/icons/find.png");\
  -moz-image-region: rect(0px, 48px, 16px, 32px);\
}\
\
  #sw-url.error {\
  outline: 1px solid red !important;\
}\
  #sw-popup > * {\
  max-width: none !important;\
}\
#sw-launch{\
	font-weight: 700;\
}\
');
