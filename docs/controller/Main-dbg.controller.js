"use strict";

sap.ui.define(["sap/m/MessageBox", "./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast"], function (MessageBox, __BaseController, JSONModel, MessageToast) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  /**
   * @namespace de.marianzeis.ui5libdiff.controller
   */
  const Main = BaseController.extend("de.marianzeis.ui5libdiff.controller.Main", {
    constructor: function constructor() {
      BaseController.prototype.constructor.apply(this, arguments);
      this.UI5Type = "SAPUI5";
      this.SAPUI5DataLoaded = false;
      this.OpenUI5DataLoaded = false;
      // New property for storing the chosen clipboard format
      this.clipboardFormat = "TEXT";
    },
    onInit: async function _onInit() {
      this.getView().setBusyIndicatorDelay(0);
      this.getView().setBusy(true);
      this.getRouter().getRoute("main").attachEventOnce("patternMatched", this.onPatternMatchedOnce, this);
      this.getView().setModel(new JSONModel(), "changes");
      this.getView().setModel(new JSONModel(), "versionFrom");
      this.getView().setModel(new JSONModel(), "versionTo");
      this.getView().setBusy(false);
      this.clipboardFormat = "TEXT";
    },
    // Event handler for the new ComboBox
    onFormatChange: function _onFormatChange(event) {
      const selectedKey = event.getSource().getSelectedKey();
      this.clipboardFormat = selectedKey;
    },
    triggerLoadingData: function _triggerLoadingData(UI5Type) {
      if (this.dataIsLoading && this.ui5TypeLoading !== UI5Type) return;
      if (UI5Type === "SAPUI5" && !this.SAPUI5DataLoaded) {
        this.ui5TypeLoading = "SAPUI5";
        this.SAPUI5DataLoading = true;
        this.SAPUI5Model = new JSONModel();
        this.dataLoaded = this.SAPUI5Model.loadData(`./data/consolidated${UI5Type}.json`);
        this.dataLoaded.then(() => {
          this.dataIsLoading = false;
        });
        this.getView().setModel(this.SAPUI5Model, "data");
        this.SAPUI5SelectModel = new JSONModel();
        this.selectDataLoaded = this.SAPUI5SelectModel.loadData(`./data/selectVersions${UI5Type}.json`);
        this.getView().setModel(this.SAPUI5SelectModel, "select");
        this.SAPUI5DataLoaded = true;
      }
      if (UI5Type === "SAPUI5" && this.SAPUI5DataLoaded) {
        this.getView().setModel(this.SAPUI5Model, "data");
        this.getView().setModel(this.SAPUI5SelectModel, "select");
      }
      if (UI5Type === "OpenUI5" && !this.OpenUI5DataLoaded) {
        this.ui5TypeLoading = "OpenUI5";
        this.OpenUI5DataLoading = true;
        this.OpenUI5Model = new JSONModel();
        this.dataLoaded = this.OpenUI5Model.loadData(`./data/consolidated${UI5Type}.json`);
        this.getView().setModel(this.OpenUI5Model, "data");
        this.OpenUI5SelectModel = new JSONModel();
        this.selectDataLoaded = this.OpenUI5SelectModel.loadData(`./data/selectVersions${UI5Type}.json`);
        this.getView().setModel(this.OpenUI5SelectModel, "select");
        this.OpenUI5DataLoaded = true;
      }
      if (UI5Type === "OpenUI5" && this.OpenUI5DataLoaded) {
        this.getView().setModel(this.OpenUI5Model, "data");
        this.getView().setModel(this.OpenUI5SelectModel, "select");
      }
      // Check if data is loading, and if so, wait for the promises to settle before setting the flag to false
      if (this.SAPUI5DataLoading || this.OpenUI5DataLoading) {
        Promise.allSettled([this.dataLoaded, this.selectDataLoaded]).then(() => {
          if (UI5Type === "SAPUI5") {
            this.SAPUI5DataLoading = false;
          } else {
            this.OpenUI5DataLoading = false;
          }
        });
      }
    },
    onPatternMatchedOnce: function _onPatternMatchedOnce() {
      this.getRouter().getRoute("main").attachPatternMatched(this.onPatternMatched, this);
      this.getQueryParameter();
    },
    onPatternMatched: function _onPatternMatched() {
      this.getQueryParameter();
    },
    getQueryParameter: async function _getQueryParameter() {
      const mParams = new URLSearchParams(window.location.search);
      const versionFrom = mParams.get("versionFrom");
      const versionTo = mParams.get("versionTo");
      const ui5Type = mParams.get("ui5Type");
      if (ui5Type) {
        this.UI5Type = ui5Type;
      }
      this.triggerLoadingData(this.UI5Type);
      await Promise.all([this.dataLoaded, this.selectDataLoaded]);
      const data = this.getView().getModel("select").getData();

      // If both versionFrom and versionTo are null, exit the function
      if (versionFrom === null && versionTo === null) return;

      // Helper function to find nearest available version
      const findNearestVersion = targetVersion => {
        const versions = data.map(item => item.key || item.value);
        // Sort versions in descending order
        versions.sort((a, b) => this.compareVersionDesc(a, b));

        // Find the target version's major.minor
        const [major, minor] = targetVersion.split(".").slice(0, 2);
        const targetBase = `${major}.${minor}`;

        // Find all versions with same major.minor, then get the nearest lower version
        const compatibleVersions = versions.filter(v => v.startsWith(targetBase));
        return compatibleVersions.find(v => this.compareVersion(v, targetVersion) <= 0) || null;
      };
      let finalVersionFrom = versionFrom;
      let finalVersionTo = versionTo;
      const missingOrInvalid = [];
      if (!versionFrom) {
        missingOrInvalid.push("versionFrom should be added");
      } else if (!data.some(item => item.key === versionFrom || item.value === versionFrom)) {
        const nearest = findNearestVersion(versionFrom);
        if (nearest) {
          finalVersionFrom = nearest;
          MessageToast.show(`Using nearest available version ${nearest} for versionFrom`);
        } else {
          missingOrInvalid.push(`versionFrom ${versionFrom} is not valid`);
        }
      }
      if (!versionTo) {
        missingOrInvalid.push("versionTo should be added");
      } else if (!data.some(item => item.key === versionTo || item.value === versionTo)) {
        const nearest = findNearestVersion(versionTo);
        if (nearest) {
          finalVersionTo = nearest;
          MessageToast.show(`Using nearest available version ${nearest} for versionTo`);
        } else {
          missingOrInvalid.push(`versionTo ${versionTo} is not valid`);
        }
      }
      if (missingOrInvalid.length > 0) {
        MessageToast.show(missingOrInvalid.join(" and "));
      } else {
        this.getView().byId("versionFromSelect").setSelectedKey(finalVersionFrom);
        this.getView().byId("versionToSelect").setSelectedKey(finalVersionTo);
        this.getView().byId("SegmentedButtonUI5").setSelectedKey(ui5Type);
        this.handleVersionChange();
      }
    },
    handleVersionChange: async function _handleVersionChange() {
      this.getView().setBusyIndicatorDelay(0);
      this.getView().setBusy(true);
      this.UI5Type = this.getView().byId("SegmentedButtonUI5").getSelectedKey();
      this.triggerLoadingData(this.UI5Type);
      await Promise.all([this.dataLoaded, this.selectDataLoaded]);
      this.updateURLParameters();
      const versionFrom = this.getView().byId("versionFromSelect").getSelectedKey();
      const versionTo = this.getView().byId("versionToSelect").getSelectedKey();
      const versionObject = this.compareVersions(versionFrom, versionTo);
      const filterKey = this.getView().byId("SegmentedButton").getSelectedKey();
      if (versionFrom && versionTo) {
        const changes = this.getMergedChangesBetweenVersions(versionObject.versionFrom, versionObject.versionTo, filterKey);
        this.getView().getModel("changes").setData(changes);
      }
      this.getView().setBusy(false);
    },
    sayHello: function _sayHello() {
      MessageBox.show("Hello World!");
    },
    compareVersion: function _compareVersion(v1, v2) {
      const parts1 = v1.split(".").map(Number);
      const parts2 = v2.split(".").map(Number);
      for (let i = 0; i < parts1.length && i < parts2.length; i++) {
        if (parts1[i] < parts2[i]) return -1;
        if (parts1[i] > parts2[i]) return 1;
      }
      return parts1.length - parts2.length;
    },
    sortChanges: function _sortChanges(changes) {
      const sortBy = this.getView().byId("SegmentedButtonSort").getSelectedKey();
      return changes.sort((a, b) => {
        if (sortBy === "type") {
          if (a.type === "DEPRECATED" && b.type !== "DEPRECATED") {
            return -1;
          } else if (a.type !== "DEPRECATED" && b.type === "DEPRECATED") {
            return 1;
          } else if (a.type === "FEATURE" && b.type !== "FEATURE") {
            return -1;
          } else if (a.type !== "FEATURE" && b.type === "FEATURE") {
            return 1;
          } else {
            // when types are the same, default to sorting by text
            if (!a.text || !b.text) {
              console.warn("Undefined or null text detected:", a, b);
              return 0;
            }
            return a.text.localeCompare(b.text);
          }
        } else if (sortBy === "text") {
          if (!a.text || !b.text) {
            console.warn("Undefined or null text detected:", a, b);
            return 0;
          }
          return a.text.localeCompare(b.text);
        } else {
          // sortBy === "version"
          if (!a.version || !b.version) {
            console.warn("Undefined or null version detected:", a, b);
            return 0;
          }
          return this.compareVersionDesc(a.version, b.version);
        }
      });
    },
    mergeLibraries: function _mergeLibraries(versions) {
      const libraryMap = new Map();
      for (const version of versions) {
        for (const lib of version.libraries) {
          const changesWithVersion = lib.changes.map(change => ({
            ...change,
            version: version.version
          }));
          const existingChanges = libraryMap.get(lib.library) || [];
          libraryMap.set(lib.library, existingChanges.concat(changesWithVersion));
        }
      }
      return Array.from(libraryMap.entries()).map(_ref => {
        let [library, changes] = _ref;
        const uniqueChanges = [];
        const seenChanges = new Set();
        for (const change of this.sortChanges(changes)) {
          // we retain sorting changes based on their text
          const changeString = JSON.stringify({
            type: change.type,
            text: change.text,
            url: change.commit_url
            // version intentionally omitted
          });
          if (!seenChanges.has(changeString)) {
            seenChanges.add(changeString);
            uniqueChanges.push(change);
          }
        }
        return {
          library,
          changes: uniqueChanges
        };
      }).sort((a, b) => {
        if (a.library === "deprecated") {
          return -1;
        } else if (b.library === "deprecated") {
          return 1;
        } else {
          return a.library.localeCompare(b.library); // sort by library name
        }
      });
    },
    getMergedChangesBetweenVersions: function _getMergedChangesBetweenVersions(startVersion, endVersion, filterType) {
      const data = this.getView().getModel("data").getData();
      const versionsInRange = data.filter(obj => this.compareVersion(obj.version, startVersion) > 0 && this.compareVersion(obj.version, endVersion) <= 0);
      const mergedLibraries = this.mergeLibraries(versionsInRange);
      if (filterType === "ALL") {
        return mergedLibraries;
      }

      // Filter changes based on the type
      return mergedLibraries.map(lib => {
        const filteredChanges = lib.changes.filter(change => change.type === filterType);
        return {
          library: lib.library,
          changes: filteredChanges
        };
      }).filter(lib => lib.changes.length > 0);
    },
    compareVersions: function _compareVersions(v1, v2) {
      const v1Parts = v1.split(".").map(Number);
      const v2Parts = v2.split(".").map(Number);
      for (let i = 0; i < v1Parts.length; i++) {
        if (v1Parts[i] > v2Parts[i]) {
          return {
            versionFrom: v2,
            versionTo: v1
          };
        } else if (v1Parts[i] < v2Parts[i]) {
          return {
            versionFrom: v1,
            versionTo: v2
          };
        }
      }

      // If versions are equal
      return {
        versionFrom: v1,
        versionTo: v2
      };
    },
    compareVersionDesc: function _compareVersionDesc(v1, v2) {
      const parts1 = v1.split(".").map(Number);
      const parts2 = v2.split(".").map(Number);
      for (let i = 0; i < parts1.length && i < parts2.length; i++) {
        if (parts1[i] > parts2[i]) return -1;
        if (parts1[i] < parts2[i]) return 1;
      }
      return parts2.length - parts1.length;
    },
    onNavToWhatsnew: function _onNavToWhatsnew() {
      this.getRouter().navTo("whatsnew");
    },
    updateURLParameters: function _updateURLParameters() {
      const versionTo = this.getView().byId("versionToSelect").getSelectedKey();
      const versionFrom = this.getView().byId("versionFromSelect").getSelectedKey();
      const ui5Type = this.getView().byId("SegmentedButtonUI5").getSelectedKey();
      const mParams = new URLSearchParams(window.location.search);
      if (versionTo) {
        mParams.set("versionTo", versionTo);
      } else {
        mParams.delete("versionTo");
      }
      if (versionFrom) {
        mParams.set("versionFrom", versionFrom);
      } else {
        mParams.delete("versionFrom");
      }
      mParams.set("ui5Type", ui5Type);
      const newURL = `${window.location.origin}${window.location.pathname}?${mParams.toString()}`;
      window.history.pushState({}, "", newURL);
    },
    copyLinkToClipboardMain: function _copyLinkToClipboardMain(event) {
      this.copyLinkToClipboard(event);
    },
    showRSSFeedSAPUI5: function _showRSSFeedSAPUI() {
      window.open("rss_feed_SAPUI5.xml");
    },
    showRSSFeedOpenUI5: function _showRSSFeedOpenUI() {
      window.open("rss_feed_OpenUI5.xml");
    },
    openGitHubRepo: function _openGitHubRepo() {
      window.open("https://github.com/marianfoo/ui5-lib-diff");
    },
    // Updated method to handle copying according to selected format
    copyDataToClipboardMain: async function _copyDataToClipboardMain(event) {
      // Retrieve the data shown in the ObjectPageSection via the "changes" model
      const changesData = this.getView().getModel("changes").getData();

      // Check if there are no changes
      if (!Array.isArray(changesData) || changesData.length === 0) {
        MessageToast.show("No changes available to copy.");
        return;
      }
      let output = "";
      if (this.clipboardFormat === "JSON") {
        // Convert the entire changes data array to JSON
        output = JSON.stringify(changesData, null, 2);
      } else if (this.clipboardFormat === "MARKDOWN") {
        // Build Markdown string
        changesData.forEach(libraryObj => {
          output += `## ${libraryObj.library}\n`;
          libraryObj.changes.forEach(change => {
            const commitLink = change.commit_url ? `([commit](${change.commit_url}))` : "";
            output += `- **Version**: ${change.version ?? "N/A"}  
**Type**: ${change.type}  
**Text**: ${change.text} ${commitLink}\n\n`;
          });
        });
      } else {
        // Default to Normal Text
        changesData.forEach(libraryObj => {
          output += `${libraryObj.library}\n`;
          libraryObj.changes.forEach(change => {
            const commitLink = change.commit_url ? ` (commit: ${change.commit_url})` : "";
            output += `Version: ${change.version ?? "N/A"}, Type: ${change.type}, Text: ${change.text}${commitLink}\n`;
          });
          output += "\n";
        });
      }
      try {
        if ("clipboard" in navigator) {
          await navigator.clipboard.writeText(output);
          MessageToast.show("Changes copied to clipboard!");
        } else {
          // Fallback for older browsers
          const dummyInput = document.createElement("textarea");
          document.body.appendChild(dummyInput);
          dummyInput.value = output;
          dummyInput.select();
          document.execCommand("copy");
          document.body.removeChild(dummyInput);
          MessageToast.show("Changes copied to clipboard!");
        }
      } catch (error) {
        console.error("Copy to clipboard failed:", error);
        MessageToast.show("Failed to copy changes.");
      }
    }
  });
  return Main;
});
//# sourceMappingURL=Main-dbg.controller.js.map
