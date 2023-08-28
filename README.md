# ui5-lib-diff
Show differences between UI5 Versions

## Screenshot 

![Screenshot of the App](
screenshot.jpg)


## Visit the App
https://marianfoo.github.io/ui5-lib-diff/

## Blog Post

This blog post explains the motivation and the idea behind this project:  
https://blogs.sap.com/2023/08/16/navigating-ui5-version-updates-say-goodbye-to-tedious-changelog-reviews-with-this-app/


## Data

### Changes

All the changes for every UI5 Version are stored in the [`changesOpenUI5`](https://github.com/marianfoo/ui5-lib-diff/tree/main/changesOpenUI5) and [`changesSAPUI5`](https://github.com/marianfoo/ui5-lib-diff/tree/main/changesSAPUI5) folder.  
The data is also used in the [Change Log](https://ui5.sap.com/#/releasenotes.html) Site to display the changes per each minor version.  
This is basically a the raw data coming from the API.

After the data is fetched from the API, it is processed and moved to the [`data`](https://github.com/marianfoo/ui5-lib-diff/tree/main/de.marianzeis.ui5libdiff/webapp/data) Folder for the consumption in the UI5 Webapp.  
The complete data (all changes) are in the [consolidatedSAPUI5.json](https://github.com/marianfoo/ui5-lib-diff/blob/main/de.marianzeis.ui5libdiff/webapp/data/consolidatedSAPUI5.json) and [consolidatedOpenUI5.json](https://github.com/marianfoo/ui5-lib-diff/blob/main/de.marianzeis.ui5libdiff/webapp/data/consolidatedOpenUI5.json) file.  
For the dropdown fields the json files [selectVersionsSAPUI5.json](https://github.com/marianfoo/ui5-lib-diff/blob/main/de.marianzeis.ui5libdiff/webapp/data/selectVersionsSAPUI5.json) and [selectVersionsOpenUI5.json](https://github.com/marianfoo/ui5-lib-diff/blob/main/de.marianzeis.ui5libdiff/webapp/data/selectVersionsOpenUI5.json) are used.

### Whats New

The data for the SAPUI5 Whats New Page is comming from the [SAPUI5 What's New Viewer](https://help.sap.com/whats-new/67f60363b57f4ac0b23efd17fa192d60?locale=en-US).  
It is stored in the [whatsnew.json](https://github.com/marianfoo/ui5-lib-diff/blob/main/de.marianzeis.ui5libdiff/webapp/data/whatsnew.json) file.

### GitHub Actions

New Data is fetched every monday morning for the `main` branch with the `refreshData` command.  
Every Day for the ui5 webapp in the [`docs`](https://github.com/marianfoo/ui5-lib-diff/tree/docs) branch with the `build` command.