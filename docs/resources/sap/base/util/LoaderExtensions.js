/*!
 * OpenUI5
 * (c) Copyright 2009-2023 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/util/XMLHelper","sap/base/Log","sap/base/assert","sap/base/util/extend","sap/base/util/fetch","sap/base/util/mixedFetch"],function(e,r,t,s,n,a){"use strict";var i={};var o={js:["controller","designtime","fragment","support","view"],json:["fragment","view"],html:["fragment","view"],xml:["fragment","view"]};var u=new RegExp("\\.("+Object.keys(o).join("|")+")$");i.getKnownSubtypes=function(){return o};i.getAllRequiredModules=function(){var e=[],r=sap.ui.loader._.getAllModules(true),t;for(var s in r){t=r[s];if(t.ui5&&t.state!==-1){e.push(t.ui5)}}return e};var l=Object.create(null);i.registerResourcePath=function(e,t){if(!t){t={url:null}}if(!l[e]){var s;if(typeof t==="string"||t instanceof String){s=t}else{s=t.url;if(t.final){l[e]=t.final}}var n=sap.ui.require.toUrl(e);var a;if(s!==n||t.final){a={paths:{}};a.paths[e]=s;sap.ui.loader.config(a);r.info("LoaderExtensions.registerResourcePath ('"+e+"', '"+s+"')"+(t["final"]?" (final)":""))}}else{r.warning("LoaderExtensions.registerResourcePath with prefix "+e+" already set as final. This call is ignored.")}};i.resolveUI5Url=function(e){if(e.startsWith("ui5:")){var r=e.replace("ui5:","");if(!r.startsWith("//")){throw new Error("URLs using the 'ui5' protocol must be absolute. Relative and server absolute URLs are reserved for future use.")}r=r.replace("//","");return sap.ui.loader._.resolveURL(sap.ui.require.toUrl(r))}else{return e}};i.loadResource=function(o,l){var f,c,d,p=function(){},h;if(typeof o==="string"){l=l||{}}else{l=o||{};o=l.name}l=s({failOnError:true,async:false},l);f=l.dataType;if(f==null&&o){f=(f=u.exec(o||l.url))&&f[1]}t(/^(xml|html|json|text)$/.test(f),"type must be one of xml, html, json or text");function g(r){switch(f){case"json":return JSON.parse(r);case"xml":return e.parse(r);default:return r}}c=sap.ui.loader._.getModuleContent(o,l.url);if(c!=undefined){c=g(c);if(l.async){return Promise.resolve(c)}else{return c}}else{h=sap.ui.loader._.getSyncCallBehavior();if(!l.async&&h){if(h>=1){r.error("[nosync] loading resource '"+(o||l.url)+"' with sync XHR")}else{throw new Error("[nosync] loading resource '"+(o||l.url)+"' with sync XHR")}}var v={};if(f){v["Accept"]=n.ContentTypes[f.toUpperCase()]}d=l.url||sap.ui.loader._.getResourcePath(o);if(i.notifyResourceLoading){p=i.notifyResourceLoading()}n=a?a:n;var y=n(d,{headers:Object.assign(v,l.headers)},!l.async).then(function(e){if(e.ok){return e.text().then(function(e){return{data:g(e)}})}else{var r=new Error("resource "+o+" could not be loaded from "+d+". Check for 'file not found' or parse errors. Reason: "+e.statusText||e.status);r.status=e.statusText;r.statusCode=e.status;throw r}}).catch(function(e){return{data:null,error:e}}).then(function(e){p();if(e.data!==null){return e.data}else if(l.failOnError){r.error(e.error);throw e.error}else{return null}});if(l.async){return y}else{return y.unwrap()}}};i.notifyResourceLoading=null;return i});
//# sourceMappingURL=LoaderExtensions.js.map