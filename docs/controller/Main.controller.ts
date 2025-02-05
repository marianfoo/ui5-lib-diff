import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";

interface Change {
	type: "FEATURE" | "FIX" | "DEPRECATED";
	text: string;
	version?: string; // add this line to include an optional version property
}

interface Library {
	library: string;
	changes: Change[];
}

interface Version {
	version: string;
	libraries: Library[];
}

/**
 * @namespace de.marianzeis.ui5libdiff.controller
 */
export default class Main extends BaseController {
	dataLoaded: Promise<any>;
	selectDataLoaded: Promise<any>;
	UI5Type: string = "SAPUI5";
	SAPUI5Model: JSONModel;
	SAPUI5SelectModel: JSONModel;
	OpenUI5Model: JSONModel;
	OpenUI5SelectModel: JSONModel;
	SAPUI5DataLoaded: boolean = false;
	OpenUI5DataLoaded: boolean = false;
	SAPUI5DataLoading: any;
	dataIsLoading: any;
	OpenUI5DataLoading: boolean;
	ui5TypeLoading: string;
	public async onInit(): void {
		this.getView().setBusyIndicatorDelay(0);
		this.getView().setBusy(true);
		this.getRouter()
			.getRoute("main")
			.attachEventOnce("patternMatched", this.onPatternMatchedOnce, this);
		this.getView().setModel(new JSONModel(), "changes");
		this.getView().setModel(new JSONModel(), "versionFrom");
		this.getView().setModel(new JSONModel(), "versionTo");
		this.getView().setBusy(false);
	}

	triggerLoadingData(UI5Type: string): void {
		if (this.dataIsLoading && this.ui5TypeLoading !== UI5Type) return; 
		if (UI5Type === "SAPUI5" && !this.SAPUI5DataLoaded) {
			this.ui5TypeLoading = "SAPUI5";
			this.SAPUI5DataLoading = true;
			this.SAPUI5Model = new JSONModel();
			this.dataLoaded = this.SAPUI5Model.loadData(
				`./data/consolidated${UI5Type}.json`
			);
			this.dataLoaded.then(() => {
				this.dataIsLoading = false
			});
			this.getView().setModel(this.SAPUI5Model, "data");
			this.SAPUI5SelectModel = new JSONModel();
			this.selectDataLoaded = this.SAPUI5SelectModel.loadData(
				`./data/selectVersions${UI5Type}.json`
			);
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
			this.dataLoaded = this.OpenUI5Model.loadData(
				`./data/consolidated${UI5Type}.json`
			);
			this.getView().setModel(this.OpenUI5Model, "data");
			this.OpenUI5SelectModel = new JSONModel();
			this.selectDataLoaded = this.OpenUI5SelectModel.loadData(
				`./data/selectVersions${UI5Type}.json`
			);
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
	}

	onPatternMatchedOnce(): void {
		this.getRouter()
			.getRoute("main")
			.attachPatternMatched(this.onPatternMatched, this);
		this.getQueryParameter();
	}

	onPatternMatched(): void {
		this.getQueryParameter();
	}

	// get parameter versionFrom and versionTo from URL Parameters
	public async getQueryParameter(): void {
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
		const findNearestVersion = (targetVersion: string): string | null => {
			const versions = data.map(item => item.key || item.value);
			// Sort versions in descending order
			versions.sort((a, b) => this.compareVersionDesc(a, b));
			
			// Find the target version's major.minor
			const [major, minor] = targetVersion.split('.').slice(0, 2);
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
			this.getView().byId("versionFromSelect").setSelectedKey(finalVersionFrom!);
			this.getView().byId("versionToSelect").setSelectedKey(finalVersionTo!);
			this.getView().byId("SegmentedButtonUI5").setSelectedKey(ui5Type!);
			this.handleVersionChange();
		}
	}

	public async handleVersionChange(): void {
		this.getView().setBusyIndicatorDelay(0);
		this.getView().setBusy(true);
		this.UI5Type = this.getView().byId("SegmentedButtonUI5").getSelectedKey();
		this.triggerLoadingData(this.UI5Type);
		await Promise.all([this.dataLoaded, this.selectDataLoaded]);
		this.updateURLParameters();
		const versionFrom = this.getView()
			.byId("versionFromSelect")
			.getSelectedKey();
		const versionTo = this.getView().byId("versionToSelect").getSelectedKey();
		const versionObject = this.compareVersions(versionFrom, versionTo);
		const filterKey = this.getView().byId("SegmentedButton").getSelectedKey();
		if (versionFrom && versionTo) {
			const changes = this.getMergedChangesBetweenVersions(
				versionObject.versionFrom,
				versionObject.versionTo,
				filterKey
			);
			this.getView().getModel("changes").setData(changes);
		}
		this.getView().setBusy(false);
	}

	public sayHello(): void {
		MessageBox.show("Hello World!");
	}

	compareVersion(v1: string, v2: string): number {
		const parts1 = v1.split(".").map(Number);
		const parts2 = v2.split(".").map(Number);

		for (let i = 0; i < parts1.length && i < parts2.length; i++) {
			if (parts1[i] < parts2[i]) return -1;
			if (parts1[i] > parts2[i]) return 1;
		}

		return parts1.length - parts2.length;
	}

	sortChanges(changes: Change[]): Change[] {
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
	}

	mergeLibraries(versions: Version[]): Library[] {
		const libraryMap: Map<string, Change[]> = new Map();

		for (const version of versions) {
			for (const lib of version.libraries) {
				const changesWithVersion = lib.changes.map((change) => ({
					...change,
					version: version.version,
				}));

				const existingChanges = libraryMap.get(lib.library) || [];
				libraryMap.set(lib.library, existingChanges.concat(changesWithVersion));
			}
		}

		return Array.from(libraryMap.entries())
			.map(([library, changes]) => {
				const uniqueChanges: Change[] = [];
				const seenChanges = new Set<string>();

				for (const change of this.sortChanges(changes)) {
					// we retain sorting changes based on their text
					const changeString = JSON.stringify({
						type: change.type,
						text: change.text,
						// Version intentionally omitted from stringification
					});

					if (!seenChanges.has(changeString)) {
						seenChanges.add(changeString);
						uniqueChanges.push(change);
					}
				}

				return {
					library,
					changes: uniqueChanges,
				};
			})
			.sort((a, b) => {
				if (a.library === "deprecated") {
					return -1;
				} else if (b.library === "deprecated") {
					return 1;
				} else {
					return a.library.localeCompare(b.library); // sort by library name
				}
			});
	}

	getMergedChangesBetweenVersions(
		startVersion: string,
		endVersion: string,
		filterType: "ALL" | "FIX" | "FEATURE"
	): Library[] {
		const data = this.getView().getModel("data").getData();
		const versionsInRange = data.filter(
			(obj) =>
				this.compareVersion(obj.version, startVersion) > 0 &&
				this.compareVersion(obj.version, endVersion) <= 0
		);

		const mergedLibraries = this.mergeLibraries(versionsInRange);

		if (filterType === "ALL") {
			return mergedLibraries;
		}

		// Filter changes based on the type
		return mergedLibraries
			.map((lib) => {
				const filteredChanges = lib.changes.filter(
					(change) => change.type === filterType
				);
				return {
					library: lib.library,
					changes: filteredChanges,
				};
			})
			.filter((lib) => lib.changes.length > 0); // Remove libraries with no changes after filtering
	}

	compareVersions(
		v1: string,
		v2: string
	): { versionFrom: string; versionTo: string } {
		const v1Parts = v1.split(".").map(Number);
		const v2Parts = v2.split(".").map(Number);

		for (let i = 0; i < v1Parts.length; i++) {
			if (v1Parts[i] > v2Parts[i]) {
				return {
					versionFrom: v2,
					versionTo: v1,
				};
			} else if (v1Parts[i] < v2Parts[i]) {
				return {
					versionFrom: v1,
					versionTo: v2,
				};
			}
		}

		// If versions are equal, default to v1 as versionFrom and v2 as versionTo
		return {
			versionFrom: v1,
			versionTo: v2,
		};
	}

	compareVersionDesc(v1: string, v2: string): number {
		const parts1 = v1.split(".").map(Number);
		const parts2 = v2.split(".").map(Number);

		for (let i = 0; i < parts1.length && i < parts2.length; i++) {
			if (parts1[i] > parts2[i]) return -1;
			if (parts1[i] < parts2[i]) return 1;
		}

		return parts2.length - parts1.length;
	}

	onNavToWhatsnew(): void {
		this.getRouter().navTo("whatsnew");
	}

	public updateURLParameters(): void {
		// Retrieve the selected keys from the controls
		const versionTo = this.getView().byId("versionToSelect").getSelectedKey();
		const versionFrom = this.getView()
			.byId("versionFromSelect")
			.getSelectedKey();
		const ui5Type = this.getView().byId("SegmentedButtonUI5").getSelectedKey();
		// Get the current URL parameters
		const mParams = new URLSearchParams(window.location.search);

		// Update only the versionTo and versionFrom parameters
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

		// Update the browser's URL without causing a page refresh
		const newURL = `${window.location.origin}${
			window.location.pathname
		}?${mParams.toString()}`;
		window.history.pushState({}, "", newURL);
	}

	copyLinkToClipboardMain(event: Event): void {
		this.copyLinkToClipboard(event);
	}

	showRSSFeedSAPUI5(): void {
		window.open("rss_feed_SAPUI5.xml");
	}

	showRSSFeedOpenUI5(): void {
		window.open("rss_feed_OpenUI5.xml");
	}
}
