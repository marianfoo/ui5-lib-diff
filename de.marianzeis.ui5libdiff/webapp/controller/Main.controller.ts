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
	dataloadedPromise: Promise<void>;
	public async onInit(): void {
		this.getView().setModel(new JSONModel(), "changes");
		this.getView().setModel(new JSONModel(), "versionFrom");
		this.getView().setModel(new JSONModel(), "versionTo");
		this.dataloadedPromise = this.loadData();
	}

	onAfterRendering(): void {
		this.getQueryParameter();
	}

	// get parameter versionFrom and versionTo from URL Parameters
	public async getQueryParameter(): void {
		await this.waitForModelToLoad();
		const data = this.getView().getModel("select").getData();
		const mParams = new URLSearchParams(window.location.search);
		const versionFrom = mParams.get("versionFrom");
		const versionTo = mParams.get("versionTo");

		// If both versionFrom and versionTo are null, exit the function
		if (versionFrom === null && versionTo === null) return;

		// Helper function to check if a version is in data and is not null
		const versionExists = (version: string | null) =>
			version &&
			data.some((item) => item.key === version || item.value === version);

		const missingOrInvalid = [];

		if (!versionFrom) {
			missingOrInvalid.push("versionFrom should be added");
		} else if (!versionExists(versionFrom)) {
			missingOrInvalid.push(`versionFrom ${versionFrom} is not valid`);
		}

		if (!versionTo) {
			missingOrInvalid.push("versionTo should be added");
		} else if (!versionExists(versionTo)) {
			missingOrInvalid.push(`versionTo ${versionTo} is not valid`);
		}

		if (missingOrInvalid.length > 0) {
			MessageToast.show(missingOrInvalid.join(" and "));
		} else {
			this.getView().byId("versionFromSelect").setSelectedKey(versionFrom!);
			this.getView().byId("versionToSelect").setSelectedKey(versionTo!);
			await this.dataloadedPromise;
			this.handleVersionChange();
		}
	}

	public handleVersionChange(): void {
		this.getView().setBusyIndicatorDelay(0);
		this.getView().setBusy(true);
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

	private async loadData(): Promise<void> {
		this.getView().setBusy(true);
		const url = "./data/consolidated.json";
		let data;
		try {
			data = await this.fetchJson(url);
		} catch (error) {
			console.error("Error fetching data:", error);
		}
		this.getView().setModel(new JSONModel(data), "data");
		this.getView().setBusy(false);
	}

	private async fetchJson(url: string): Promise<any> {
		try {
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error("Network response was not ok");
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error(
				"There was a problem with the fetch operation:",
				error.message
			);
			throw error; // or you might want to return a default value or handle it differently
		}
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
		const versionFrom = this.getView().byId("versionFromSelect").getSelectedKey();
	
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
	
		// Update the browser's URL without causing a page refresh
		const newURL = `${window.location.origin}${window.location.pathname}?${mParams.toString()}`;
		window.history.pushState({}, "", newURL);
	}
	

	private async waitForModelToLoad(): Promise<void> {
		return new Promise((resolve) => {
			const oModel = this.getView().getModel("select");
			if (oModel && oModel.getData().length > 0) {
				resolve(); // if data is already loaded
			} else {
				oModel.attachEventOnce("requestCompleted", () => {
					resolve();
				});
			}
		});
	}
}
