sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"xproject/model/models",
		"sap/ui/Device"
	], function (BaseController, JSONModel, models, Device) {
		"use strict";

		return BaseController.extend("xproject.controller.ProjectList", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				var	oViewModel = new JSONModel({
					title: this.getResourceBundle().getText("masterTitleCount", [0]),
					noDataText: this.getResourceBundle().getText("masterListNoDataText")
				});
				this._oList = this.byId("list");
				this.setModel(oViewModel, "projectListView");
				this.getRouter().getRoute("home").attachPatternMatched(this._onRouteMatched, this);
				this.getRouter().attachBypassed(this._onBypassed, this);		
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			handleSelectionChange : function (oEvent) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				var selectedProject = oEvent.getParameter("listItem") || oEvent.getSource();
				// show or hide join project button based on current selection
				var joined = selectedProject.getBindingContext("projects").getProperty("joined");
				this.byId("joinProjectButton").setVisible(this.isUserInRole("ProjectMember") && !joined);
				this._showDetail(selectedProject);
			},
			
			handleAddActionPress: function() {		
				var oModel = this.getModel("projects");
				var projects = oModel.getProperty("/");
				if (projects === undefined || projects === null) {
					projects = [];
				}
				projects.push({projectId:0});
				oModel.setProperty("/", projects);
				
				// select new item in the list
				this._oList.setSelectedItem(this._oList.getItems()[projects.length-1]);
				
				// navigate to project page
				var bReplace = !Device.system.phone;
				this.getRouter().navTo("project", {
					projectId : 0
				}, bReplace);
			},
			
			handleJoinProject: function() {
				var selectedProjectId = this._oList.getSelectedItem().getBindingContext("projects").getProperty("projectId");
		    	var sUrl = "/api/projects/" + selectedProjectId + "/join";
				var result = this.postJSON(null, sUrl);
				if (result.status !== 200) {
					this.showAlertMessage("msgJoinProjectFailed", result.statusText);
				} else {
					// reload project data and navigate home
					this.loadProjects(true);
					this.byId("joinProjectButton").setVisible(false);
					this.showSuccessMessage("msgJoinedProject");
				}					
			},
			
			/**
			 * After an update, go to home screen and remove selection
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */
			handleUpdateFinished : function (oEvent) {
				this._updateListItemCount(oEvent.getParameter("total"));
				if (this.getModel("appView").getProperty("/navigateHome")) {
					this._oList.removeSelections(true);
					this.handleNavigateHome(oEvent);
					this.getModel("appView").setProperty("/editMode", false);
					this.getModel("appView").setProperty("/navigateHome", false);
				}
			},

			handleNavigateHome : function (oEvent) {
				this.getOwnerComponent().getRouter().navTo("home", {}, true);
			},

			/**
			 * Event handler for the search field. Applies current
			 * filter value and triggers a new search. If the search field's
			 * 'refresh' button has been pressed, no new search is triggered
			 * and the list binding is refresh instead.
			 * @param {sap.ui.base.Event} oEvent the search event
			 * @public
			 */
			handleSearch : function (oEvent) {
				if (oEvent.getParameters().refreshButtonPressed) {
					// Search field's 'refresh' button has been pressed.
					// This is visible if you select any master list item.
					// In this case no new search is triggered, we only
					// refresh the list binding.
					this.handleRefresh();
					return;
				}
				var sQuery = oEvent.getParameter("query");
				//TODO: Implement search
			},

			handleRefresh : function () {
				this.loadProjects(true);
			},
			
			handleShowFeatureToggles : function() {
				this._getFeatureDialog().open();
			},
			
			handleCloseFeatureDialog : function() {
				this._getFeatureDialog().close();
			},

			/* =========================================================== */
			/* internal methods     		                               */
			/* =========================================================== */

			/**
			 * If the master route was hit (empty hash) the home view is shown
			 * @private
			 */
			_onRouteMatched :  function() {
				this.getRouter().navTo("home");
				this.byId("addProjectButton").setVisible(this.isUserInRole("ProjectManager"));
			},

			/**
			 * Event handler for the bypassed event, which is fired when no routing pattern matched.
			 * If there was a project selected in the list, that selection is removed.
			 * @private
			 */
			_onBypassed : function () {
				this.getRouter().navTo("home");
			},
			
			/**
			 * Shows the selected item on the detail page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			_showDetail : function (oItem) {
				var bReplace = !Device.system.phone;
				this.getRouter().navTo("project", {
					projectId : oItem.getBindingContext("projects").getProperty("projectId")
				}, bReplace);
				this._oList.setSelectedItem(oItem);
			},

			/**
			 * Sets the item count on the master list header
			 * @param {int} iTotalItems the total number of items in the list
			 * @private
			 */
			_updateListItemCount : function (iTotalItems) {
				var sTitle;
				// only update the counter if the length is final
				if (this._oList.getBinding("items").isLengthFinal()) {
					sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
					this.getModel("projectListView").setProperty("/title", sTitle);
				}
			},
			
			_getFeatureDialog : function() {
                if (!this._oDialog) {
                    this._oDialog = sap.ui.xmlfragment("idFeatureDialog","xproject.view.FeatureToggleDialog", this);
                	this.getView().addDependent(this._oDialog);
                }
                return this._oDialog;
            }
		});
	}
);