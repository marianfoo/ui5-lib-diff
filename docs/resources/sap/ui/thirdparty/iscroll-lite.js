/*!
 * iScroll Lite base on iScroll v4.1.6 ~ Copyright (c) 2011 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(){var t=Math,e=function(t){return t>>0},o=/webkit/i.test(navigator.appVersion)?"webkit":/firefox/i.test(navigator.userAgent)?"Moz":"opera"in window?"O":"",n=/android/gi.test(navigator.appVersion),i=/iphone|ipad/gi.test(navigator.appVersion),r=/playbook/gi.test(navigator.appVersion),s=/hp-tablet/gi.test(navigator.appVersion),l="WebKitCSSMatrix"in window&&"m11"in new WebKitCSSMatrix,a="ontouchstart"in window&&!s,c=o+"Transform"in document.documentElement.style,p=i||r,u=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(t){return setTimeout(t,17)}}(),f=function(){return window.cancelRequestAnimationFrame||window.webkitCancelAnimationFrame||window.webkitCancelRequestAnimationFrame||window.mozCancelRequestAnimationFrame||window.oCancelRequestAnimationFrame||window.msCancelRequestAnimationFrame||clearTimeout}(),m="onorientationchange"in window?"orientationchange":"resize",d=a?"touchstart":"mousedown",h=a?"touchmove":"mousemove",w=a?"touchend":"mouseup",b=a?"touchcancel":"mouseup",S="translate"+(l?"3d(":"("),x=l?",0)":")",y=function(t,e){var n=this,i=document,r;n.wrapper=typeof t=="object"?t:i.getElementById(t);n.wrapper.style.overflow="hidden";n.scroller=n.wrapper.children[0];n.options={hScroll:true,vScroll:true,x:0,y:0,bounce:true,bounceLock:false,momentum:true,lockDirection:true,useTransform:true,useTransition:false,onRefresh:null,onBeforeScrollStart:function(t){t.preventDefault()},onScrollStart:null,onBeforeScrollMove:null,onScrollMove:null,onBeforeScrollEnd:null,onScrollEnd:null,onTouchEnd:null,onDestroy:null};for(r in e)n.options[r]=e[r];n.x=n.options.x;n.y=n.options.y;n.options.useTransform=c?n.options.useTransform:false;n.options.hScrollbar=n.options.hScroll&&n.options.hScrollbar;n.options.vScrollbar=n.options.vScroll&&n.options.vScrollbar;n.options.useTransition=p&&n.options.useTransition;n.scroller.style[o+"TransitionProperty"]=n.options.useTransform?"-"+o.toLowerCase()+"-transform":"top left";n.scroller.style[o+"TransitionDuration"]="0";n.scroller.style[o+"TransformOrigin"]="0 0";if(n.options.useTransition)n.scroller.style[o+"TransitionTimingFunction"]="cubic-bezier(0.33,0.66,0.66,1)";if(n.options.useTransform)n.scroller.style[o+"Transform"]=S+n.x+"px,"+n.y+"px"+x;else n.scroller.style.cssText+=";position:absolute;top:"+n.y+"px;left:"+n.x+"px";n.refresh();n._bind(m,window);n._bind(d);if(!a)n._bind("mouseout",n.wrapper)};y.prototype={enabled:true,x:0,y:0,steps:[],scale:1,handleEvent:function(t){var e=this;switch(t.type){case d:if(!a&&t.button!==0)return;e._start(t);break;case h:e._move(t);break;case w:case b:e._end(t);break;case m:e._resize();break;case"mouseout":e._mouseout(t);break;case"webkitTransitionEnd":e._transitionEnd(t);break}},_resize:function(){this.refresh()},_pos:function(t,n){t=this.hScroll?t:0;n=this.vScroll?n:0;if(this.options.useTransform){this.scroller.style[o+"Transform"]=S+t+"px,"+n+"px"+x+" scale("+this.scale+")"}else{t=e(t);n=e(n);this.scroller.style.left=t+"px";this.scroller.style.top=n+"px"}this.x=t;this.y=n},_start:function(t){var e=this,n=a?t.touches[0]:t,i,r,s;if(!e.enabled)return;if(e.options.onBeforeScrollStart)e.options.onBeforeScrollStart.call(e,t);if(e.options.useTransition)e._transitionTime(0);e.moved=false;e.animating=false;e.zoomed=false;e.distX=0;e.distY=0;e.absDistX=0;e.absDistY=0;e.dirX=0;e.dirY=0;if(e.options.momentum){if(e.options.useTransform){i=getComputedStyle(e.scroller,null)[o+"Transform"].replace(/[^0-9-.,]/g,"").split(",");r=i[4]*1;s=i[5]*1}else{r=getComputedStyle(e.scroller,null).left.replace(/[^0-9-]/g,"")*1;s=getComputedStyle(e.scroller,null).top.replace(/[^0-9-]/g,"")*1}if(r!=e.x||s!=e.y){if(e.options.useTransition)e._unbind("webkitTransitionEnd");else f(e.aniTime);e.steps=[];e._pos(r,s)}}e.startX=e.x;e.startY=e.y;e.pointX=n.pageX;e.pointY=n.pageY;e.startTime=t.timeStamp||Date.now();if(e.options.onScrollStart)e.options.onScrollStart.call(e,t);e._bind(h);e._bind(w);e._bind(b)},_move:function(e){var o=this,n=a?e.touches[0]:e,i=n.pageX-o.pointX,r=n.pageY-o.pointY,s=o.x+i,l=o.y+r,c=e.timeStamp||Date.now();if(o.options.onBeforeScrollMove)o.options.onBeforeScrollMove.call(o,e);o.pointX=n.pageX;o.pointY=n.pageY;if(s>0||s<o.maxScrollX){s=o.options.bounce?o.x+i/2:s>=0||o.maxScrollX>=0?0:o.maxScrollX}if(l>0||l<o.maxScrollY){l=o.options.bounce?o.y+r/2:l>=0||o.maxScrollY>=0?0:o.maxScrollY}o.distX+=i;o.distY+=r;o.absDistX=t.abs(o.distX);o.absDistY=t.abs(o.distY);if(o.absDistX<6&&o.absDistY<6){return}if(o.options.lockDirection){if(o.absDistX>o.absDistY+5){l=o.y;r=0}else if(o.absDistY>o.absDistX+5){s=o.x;i=0}}o.moved=true;o._pos(s,l);o.dirX=i>0?-1:i<0?1:0;o.dirY=r>0?-1:r<0?1:0;if(c-o.startTime>300){o.startTime=c;o.startX=o.x;o.startY=o.y}if(o.options.onScrollMove)o.options.onScrollMove.call(o,e)},_end:function(o){var n=this,i=a?o.changedTouches[0]:o,r,s,l={dist:0,time:0},c={dist:0,time:0},p=(o.timeStamp||Date.now())-n.startTime,u=n.x,f=n.y,m;n._unbind(h);n._unbind(w);n._unbind(b);if(n.options.onBeforeScrollEnd)n.options.onBeforeScrollEnd.call(n,o);if(!n.moved){if(a){r=i.target;while(r.nodeType!=1)r=r.parentNode;if(r.tagName!="SELECT"&&r.tagName!="INPUT"&&r.tagName!="TEXTAREA"){s=document.createEvent("MouseEvents");s.initMouseEvent("click",true,true,o.view,1,i.screenX,i.screenY,i.clientX,i.clientY,o.ctrlKey,o.altKey,o.shiftKey,o.metaKey,0,null);s._fake=true;r.dispatchEvent(s)}}n._resetPos(200);if(n.options.onTouchEnd)n.options.onTouchEnd.call(n,o);return}if(p<300&&n.options.momentum){l=u?n._momentum(u-n.startX,p,-n.x,n.scrollerW-n.wrapperW+n.x,n.options.bounce?n.wrapperW:0):l;c=f?n._momentum(f-n.startY,p,-n.y,n.maxScrollY<0?n.scrollerH-n.wrapperH+n.y:0,n.options.bounce?n.wrapperH:0):c;u=n.x+l.dist;f=n.y+c.dist;if(n.x>0&&u>0||n.x<n.maxScrollX&&u<n.maxScrollX)l={dist:0,time:0};if(n.y>0&&f>0||n.y<n.maxScrollY&&f<n.maxScrollY)c={dist:0,time:0}}if(l.dist||c.dist){m=t.max(t.max(l.time,c.time),10);n.scrollTo(e(u),e(f),m);if(n.options.onTouchEnd)n.options.onTouchEnd.call(n,o);return}n._resetPos(200);if(n.options.onTouchEnd)n.options.onTouchEnd.call(n,o)},_resetPos:function(t){var e=this,o=e.x>=0?0:e.x<e.maxScrollX?e.maxScrollX:e.x,n=e.y>=0||e.maxScrollY>0?0:e.y<e.maxScrollY?e.maxScrollY:e.y;if(o==e.x&&n==e.y){if(e.moved){if(e.options.onScrollEnd)e.options.onScrollEnd.call(e);e.moved=false}return}e.scrollTo(o,n,t||0)},_mouseout:function(t){var e=t.relatedTarget;if(!e){this._end(t);return}while(e=e.parentNode)if(e==this.wrapper)return;this._end(t)},_transitionEnd:function(t){var e=this;if(t.target!=e.scroller)return;e._unbind("webkitTransitionEnd");e._startAni()},_startAni:function(){var e=this,o=e.x,n=e.y,i=Date.now(),r,s,l;if(e.animating)return;if(!e.steps.length){e._resetPos(400);return}r=e.steps.shift();if(r.x==o&&r.y==n)r.time=0;e.animating=true;e.moved=true;if(e.options.useTransition){e._transitionTime(r.time);e._pos(r.x,r.y);e.animating=false;if(r.time)e._bind("webkitTransitionEnd");else e._resetPos(0);return}l=function(){var a=Date.now(),c,p;if(a>=i+r.time){e._pos(r.x,r.y);e.animating=false;if(e.options.onAnimationEnd)e.options.onAnimationEnd.call(e);e._startAni();return}a=(a-i)/r.time-1;s=t.sqrt(1-a*a);c=(r.x-o)*s+o;p=(r.y-n)*s+n;e._pos(c,p);if(e.animating)e.aniTime=u(l)};l()},_transitionTime:function(t){this.scroller.style[o+"TransitionDuration"]=t+"ms"},_momentum:function(o,n,i,r,s){var l=6e-4,a=t.abs(o)/n,c=a*a/(2*l),p=0,u=0;if(o>0&&c>i){u=s/(6/(c/a*l));i=i+u;a=a*i/c;c=i}else if(o<0&&c>r){u=s/(6/(c/a*l));r=r+u;a=a*r/c;c=r}c=c*(o<0?-1:1);p=a/l;return{dist:c,time:e(p)}},_offset:function(t){var e=-t.offsetLeft,o=-t.offsetTop;while(t=t.offsetParent){e-=t.offsetLeft;o-=t.offsetTop}return{left:e,top:o}},_bind:function(t,e,o){(e||this.scroller).addEventListener(t,this,!!o)},_unbind:function(t,e,o){(e||this.scroller).removeEventListener(t,this,!!o)},destroy:function(){var t=this;t.scroller.style[o+"Transform"]="";t._unbind(m,window);t._unbind(d);t._unbind(h);t._unbind(w);t._unbind(b);t._unbind("mouseout",t.wrapper);if(t.options.useTransition)t._unbind("webkitTransitionEnd");if(t.options.onDestroy)t.options.onDestroy.call(t)},refresh:function(){var t=this,e;t.wrapperW=t.wrapper.clientWidth;t.wrapperH=t.wrapper.clientHeight;t.scrollerW=t.scroller.offsetWidth;t.scrollerH=t.scroller.offsetHeight;t.maxScrollX=t.wrapperW-t.scrollerW;t.maxScrollY=t.wrapperH-t.scrollerH;t.dirX=0;t.dirY=0;t.hScroll=t.options.hScroll&&t.maxScrollX<0;t.vScroll=t.options.vScroll&&(!t.options.bounceLock&&!t.hScroll||t.scrollerH>t.wrapperH);e=t._offset(t.wrapper);t.wrapperOffsetLeft=-e.left;t.wrapperOffsetTop=-e.top;t.scroller.style[o+"TransitionDuration"]="0";t._resetPos(200)},scrollTo:function(t,e,o,n){var i=this,r=t,s,l;i.stop();if(!r.length)r=[{x:t,y:e,time:o,relative:n}];for(s=0,l=r.length;s<l;s++){if(r[s].relative){r[s].x=i.x-r[s].x;r[s].y=i.y-r[s].y}i.steps.push({x:r[s].x,y:r[s].y,time:r[s].time||0})}i._startAni()},scrollToElement:function(e,o){var n=this,i;e=e.nodeType?e:n.scroller.querySelector(e);if(!e)return;i=n._offset(e);i.left+=n.wrapperOffsetLeft;i.top+=n.wrapperOffsetTop;i.left=i.left>0?0:i.left<n.maxScrollX?n.maxScrollX:i.left;i.top=i.top>0?0:i.top<n.maxScrollY?n.maxScrollY:i.top;o=o===undefined?t.max(t.abs(i.left)*2,t.abs(i.top)*2):o;n.scrollTo(i.left,i.top,o)},disable:function(){this.stop();this._resetPos(0);this.enabled=false;this._unbind(h);this._unbind(w);this._unbind(b)},enable:function(){this.enabled=true},stop:function(){f(this.aniTime);this.steps=[];this.moved=false;this.animating=false}};if(typeof exports!=="undefined")exports.iScroll=y;else window.iScroll=y})();
//# sourceMappingURL=iscroll-lite.js.map