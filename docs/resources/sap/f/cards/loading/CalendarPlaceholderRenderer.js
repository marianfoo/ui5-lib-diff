/*!
 * OpenUI5
 * (c) Copyright 2009-2023 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/Renderer","./PlaceholderBaseRenderer"],function(e,a){"use strict";var t=e.extend(a);t.apiVersion=2;t.CSS_CLASS_PLACEHOLDER="sapFCardContentCalendarPlaceholder";t.renderTextRow=function(e){e.openStart("div").class("sapFCardListPlaceholderRow").class("sapFCardListPlaceholderTextRow").class("sapFCardLoadingShimmer");e.openEnd().close("div")};t.renderRow=function(e,a){e.openStart("div").class("sapFCardListPlaceholderRow").class("sapFCardLoadingShimmer");if(a){e.class("sapFCardListPlaceholderRowCombined")}e.openEnd().close("div")};t.renderContent=function(e,a){var t=e.getMinItems(),s=e.getMaxLegendItems(),d=e.getItem(),r=e.getLegendItem(),o;a.openStart("div").class("sapFCalCardPlaceholderLeftSide").attr("tabindex","0");a.openEnd();a.openStart("div").class("sapFCardContentCalendarPartPlaceholder").class("sapFCardLoadingShimmer").attr("tabindex","0");a.openEnd();a.close("div");a.openStart("div").class("sapFCardContentListPlaceholder").class("sapFCardContentLegendItemsListPlaceholder").attr("tabindex","0");a.openEnd();for(o=0;o<s;o++){a.openStart("div").class("sapFCardListPlaceholderLegendItem").class("sapFCardListPlaceholderItem").style("height",e.getItemHeight()).openEnd();if(r){a.openStart("div").class("sapFCardListPlaceholderImg").class("sapFCardLoadingShimmer").openEnd().close("div");a.openStart("div").class("sapFCardListPlaceholderRows").openEnd();this.renderRow(a);a.close("div")}a.close("div")}a.close("div");a.close("div");a.openStart("div").class("sapFCardContentListPlaceholder").class("sapFCardContentItemsListPlaceholder").class("sapFCalCardPlaceholderRightSide").attr("tabindex","0");a.openEnd();for(o=0;o<t;o++){a.openStart("div").class("sapFCardListPlaceholderItem").style("height",e.getItemHeight()).openEnd();a.openStart("div").class("sapFCardListPlaceholderFromTo").class("sapFCardLoadingShimmer").openEnd().close("div");a.openStart("div").class("sapFCardListPlaceholderRows").openEnd();if(d){if(d.title){this.renderRow(a)}if(d.text){this.renderTextRow(a)}}a.close("div");a.close("div")}a.close("div")};t.addOuterAttributes=function(e,s){a.addOuterAttributes.apply(this,arguments);s.class(t.CSS_CLASS_PLACEHOLDER)};return t},true);
//# sourceMappingURL=CalendarPlaceholderRenderer.js.map