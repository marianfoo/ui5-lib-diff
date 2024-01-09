"use strict";

sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/ui/core/routing/History", "sap/m/MessageToast"], function (Controller, UIComponent, History, MessageToast) {
  /**
   * @namespace de.marianzeis.ui5libdiff.controller
   */
  const BaseController = Controller.extend("de.marianzeis.ui5libdiff.controller.BaseController", {
    getOwnerComponent: function _getOwnerComponent() {
      return Controller.prototype.getOwnerComponent.call(this);
    },
    getRouter: function _getRouter() {
      return UIComponent.getRouterFor(this);
    },
    copyLinkToClipboard: async function _copyLinkToClipboard(event) {
      const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
      try {
        // try using standard clipboard API
        if ("clipboard" in navigator) {
          await navigator.clipboard.writeText(window.location.href);
          return MessageToast.show("Link copied to clipboard");
        }
        // fallback if clipboard API is not supported
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.setAttribute("value", window.location.href);
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        MessageToast.show("Link copied to clipboard");
      } catch (error) {
        console.error(error);
        MessageToast.show("Link copied to clipboard failed");
      }
    },
    getResourceBundle: function _getResourceBundle() {
      const oModel = this.getOwnerComponent().getModel("i18n");
      return oModel.getResourceBundle();
    },
    getModel: function _getModel(sName) {
      return this.getView().getModel(sName);
    },
    setModel: function _setModel(oModel, sName) {
      this.getView().setModel(oModel, sName);
      return this;
    },
    navTo: function _navTo(sName, oParameters, bReplace) {
      this.getRouter().navTo(sName, oParameters, undefined, bReplace);
    },
    onNavBack: function _onNavBack() {
      const sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getRouter().navTo("main", {}, undefined, true);
      }
    }
  });
  return BaseController;
});