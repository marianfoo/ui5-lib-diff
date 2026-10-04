"use strict";

// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your QUnit tests here
sap.ui.define([], function () {
  function __ui5_require_async(path) {
    return new Promise(function (resolve, reject) {
      sap.ui.require([path], function (module) {
        if (!(module && module.__esModule)) {
          module = module === null || !(typeof module === "object" && path.endsWith("/library")) ? {
            default: module
          } : module;
          Object.defineProperty(module, "__esModule", {
            value: true
          });
        }
        resolve(module);
      }, function (err) {
        reject(err);
      });
    });
  }
  void Promise.all([__ui5_require_async("unit/controller/Main.qunit")]).then(() => {
    QUnit.start();
  });
});
//# sourceMappingURL=unitTests.qunit-dbg.js.map
