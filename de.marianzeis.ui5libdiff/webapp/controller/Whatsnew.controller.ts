import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import Fragment from "sap/ui/core/Fragment";
import Device from "sap/ui/Device";
import Sorter from "sap/ui/model/Sorter";
import Filter from "sap/ui/model/Filter";

/**
 * @namespace de.marianzeis.ui5libdiff.controller
 */
export default class Whatsnew extends BaseController {
	_mViewSettingsDialogs: {};
	public async onInit(): void {
		this.loadData();
		this._mViewSettingsDialogs = {};
	}

	private async loadData(): Promise<void> {
		this.getView().setBusy(true);
		const url = "./data/whatsnew.json";
		let data;
		try {
			data = await this.fetchJson(url);
		} catch (error) {
			console.error("Error fetching data:", error);
		}
		this.getView().setModel(new JSONModel(data), "whatsnew");
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

	handleVersionChange(event) {
		// Get the selected versions
		let versionFrom = this.getView().byId("versionFromSelect").getSelectedKey();
		let versionTo = this.getView().byId("versionToSelect").getSelectedKey();
		let versionObject = this.compareVersions(versionFrom, versionTo);
		if (versionFrom && versionTo) {
			versionFrom = versionObject.versionFrom;
			versionTo = versionObject.versionTo;

			// Extract the major and minor version numbers
			const [majorFrom, minorFrom] = versionFrom.split(".").map(Number);
			const [majorTo, minorTo] = versionTo.split(".").map(Number);

			// Retrieve the data from the model
			const whatsnew = this.getView().getModel("whatsnew").getData();

			// Filter the data based on the versions
			const filteredData = whatsnew.filter((item) => {
				const [itemMajor, itemMinor] = item.Version.split(".").map(Number);

				// Check if the version is within the selected range
				return (
					(itemMajor > majorFrom ||
						(itemMajor === majorFrom && itemMinor >= minorFrom)) &&
					(itemMajor < majorTo ||
						(itemMajor === majorTo && itemMinor <= minorTo))
				);
			});

			// Update your model if necessary
			this.getView().getModel("whatsnew").setData(filteredData);
		}
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

	handleSortButtonPressed() {
		this.getViewSettingsDialog(
			"de.marianzeis.ui5libdiff.fragment.SortDialog"
		).then(function (oViewSettingsDialog) {
			oViewSettingsDialog.open();
		});
	}

	handleFilterButtonPressed() {
		this.getViewSettingsDialog(
			"de.marianzeis.ui5libdiff.fragment.FilterDialog"
		).then(function (oViewSettingsDialog) {
			oViewSettingsDialog.open();
		});
	}

	handleSortDialogConfirm(oEvent) {
		var oTable = this.byId("idProductsTable"),
			mParams = oEvent.getParameters(),
			oBinding = oTable.getBinding("items"),
			sPath,
			bDescending,
			aSorters = [];

		sPath = mParams.sortItem.getKey();
		bDescending = mParams.sortDescending;
		aSorters.push(new Sorter(sPath, bDescending));

		// apply the selected sort and group settings
		oBinding.sort(aSorters);
	}

	handleFilterDialogConfirm(oEvent) {
		var oTable = this.byId("idProductsTable"),
			mParams = oEvent.getParameters(),
			oBinding = oTable.getBinding("items"),
			aFilters = [];

		mParams.filterItems.forEach(function (oItem) {
			var aSplit = oItem.getKey().split("___"),
				sPath = aSplit[0],
				sOperator = aSplit[1],
				sValue1 = aSplit[2],
				sValue2 = aSplit[3],
				oFilter = new Filter(sPath, sOperator, sValue1, sValue2);
			aFilters.push(oFilter);
		});

		// apply filter settings
		oBinding.filter(aFilters);

		// update filter bar
		this.byId("vsdFilterBar").setVisible(aFilters.length > 0);
		this.byId("vsdFilterLabel").setText(mParams.filterString);
	}

	getViewSettingsDialog(sDialogFragmentName) {
		var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

		if (!pDialog) {
			pDialog = Fragment.load({
				id: this.getView().getId(),
				name: sDialogFragmentName,
				controller: this,
			}).then(function (oDialog) {
				if (Device.system.desktop) {
					oDialog.addStyleClass("sapUiSizeCompact");
				}
				return oDialog;
			});
			this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
		}
		return pDialog;
	}
}
