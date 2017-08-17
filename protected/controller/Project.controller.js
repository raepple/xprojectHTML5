sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History"
	], function (BaseController, JSONModel, History) {
		"use strict";

		return BaseController.extend("xproject.controller.Project", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				var _this = this;
				var oViewModel = new JSONModel({
					busy : false,
					selectedTab : "info",      
					// allow showing member reports only for ProjectManagers
					memberMode : (_this.isUserInRole("ProjectManager") ? sap.m.ListMode.SingleSelectMaster : sap.m.ListMode.None)
				});
				this.getRouter().getRoute("project").attachPatternMatched(this._onRouteMatched, this);
				this.setModel(oViewModel, "projectView");
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
		
			handleIconTabBarSelect : function (oEvent) {
				var sKey = oEvent.getParameter("key");
				this.getModel("projectView").setProperty("/selectedTab", sKey);
				
			},
			
			handleMemberSelect : function (oEvent) {
				 var oItem = oEvent.getParameter("listItem") || oEvent.getSource();				 
				 this.getRouter().navTo("member", {
					    projectId : this.getView().getBindingContext("projects").getProperty("projectId"),
						memberId : oItem.getBindingContext("projects").getProperty("memberId")
					}, true);
			},
			
			handleTaskSelect : function (oEvent) {
				 var oItem = oEvent.getParameter("listItem") || oEvent.getSource();				 
				 this.getRouter().navTo("task", {
					    projectId : this.getView().getBindingContext("projects").getProperty("projectId"),
						taskId : oItem.getBindingContext("projects").getProperty("taskId")
					}, true);
			},
			
			handleTaskEdit : function (oEvent) {
				this.handleEditProjectActionPress(oEvent);
				this.handleTaskSelect(oEvent);
			},

			handleEditProjectActionPress : function(oEvent) {
				var appViewModel = this.getModel("appView");
				appViewModel.setProperty("/editMode", true);
			},

			handleCancelProjectActionPress : function(oEvent) {
				this.getModel("appView").setProperty("/editMode", false);
			},

			handleSaveProjectActionPress : function(oEvent) {
				this.getModel("appView").setProperty("/editMode", false);
				
				var project = this.getModel("projects").getProperty(this.getView().getBindingContext("projects").getPath());	
				var sUrl = "/api/projects";
		
				var result;		
				if (project.projectId === 0) {
					// new project
					result = this.postJSON(project, sUrl);
				} else {
					result = this.putJSON(project, sUrl);
				}
				
				if (result.status !== 200) {
					this.showAlertMessage("msgProjectFailed", result.statusText);
				} else {
					this.showSuccessMessage("msgProjectSaved");
					// update to new projectId
					project.projectId = result.responseJSON;
					this.getModel("appView").setProperty("/projectId", project.projectId);
				}
			},
			
			handleDeleteProjectActionPress: function() {
				var selectedProjectId = this.getModel("appView").getProperty("/projectId");
				var sUrl = "/api/projects/" + selectedProjectId;
		
				var result = jQuery.ajax({
					url : sUrl,
					type : "DELETE",
					async : false
				});	
				
				if (result.status !== 200) {
					this.showAlertMessage("msgProjectFailed", result.statusText);
				} else {
					this.showSuccessMessage("msgProjectDeleted");
					// refresh projects and navigate home
					this.loadProjects(true);
				}				
			},
			
			handleAddMemberActionPress: function(oEvent) {
				if (this.getModel("appView").getProperty("/directoryIntegration")) {
					// look up users in connected user store (e.g. IAS)
					var selectedProjectId = this.getModel("appView").getProperty("/projectId");
					var sUrl = "/api/projects/" + selectedProjectId + "/user/search";
					var userSearchResponse = this.getJSON(sUrl, false);
					
					if (userSearchResponse.status === 200) {
						this.getModel("projectView").setProperty("/users", userSearchResponse.responseJSON);
					} else {
						this.showAlertMessage("msgUserSearchFailed", userSearchResponse.statusText);
					}
				} else {
					this.getModel("projectView").setProperty("/newMember", {});
					var oContext = new sap.ui.model.Context(this.getModel("projectView"), "/newMember");
					this.getView().setBindingContext(oContext, "projectView");
				}
				// open dialog
				this._getAddMemberDialog().open();
			},
			
			handleAddMemberDialogConfirm : function(oEvent) {
				var sPath = "/newMember";
				if (this.getModel("appView").getProperty("/directoryIntegration")) {
					sPath = oEvent.getParameter("selectedItem").getBindingContext("projectView").getPath();
				}
				var newMember = this.getModel("projectView").getProperty(sPath);
				var selectedProjectId = this.getModel("appView").getProperty("/projectId");
				var sUrl = "/api/projects/" + selectedProjectId + "/members";
				var result = this.postJSON(newMember, sUrl);
				
				if (result.status !== 200) {
					this.showAlertMessage("msgAddingMemberFailed", result.statusText);
				} else {
					var message = this.getResourceBundle().getText("msgMemberAdded");
					if (this.getModel("appView").getProperty("/roleProvisioning")) {
						// assign new member to ProjectMember role
						sUrl = "/api/projects/roles/" + newMember.userid;
						var roles = ["ProjectMember"];
						result = this.postJSON(roles, sUrl);
						
						if (result.status !== 200) {
							this.showAlertMessage("msgProvisionRoleFailed", result.statusText);
							return;
						} else {
							message += ", " + this.getResourceBundle().getText("msgRoleProvisioned");
						}
					}
					this.showSuccessMessage(message);
					// refresh projects
					this.loadProjects(true);
				}
			},
			
			handleAddMemberDialogClose : function(oEvent) {
				this._getAddMemberDialog().close();	
			},
			
			handleAddTaskActionPress: function(oEvent) {
				var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
				var sPath = oItem.getBindingContext("projects").getPath();
				var tasks = this.getModel("projects").getProperty(sPath).tasks;
				
				if (tasks === undefined || tasks === null) {
					tasks = [];
				}
				var newTask = {taskId:0};
				tasks.push(newTask);
			
				// navigate to tasks page
				this.getRouter().navTo("task", {
					    projectId : this.getView().getBindingContext("projects").getProperty("projectId"),
						taskId : newTask.taskId
				}, true);
			},			
			
			/**
			 * Event handler for navigating back.
			 * It there is a history entry we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the home route.
			 * @public
			 */
			onNavBack : function() {				
				var sPreviousHash = History.getInstance().getPreviousHash();
								
				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					// There is no history! Navigate to home page
					this.getOwnerComponent().getRouter().navTo("home", {}, true);
				}
			},
			
			/* =========================================================== */
			/* internal methods          		                           */
			/* =========================================================== */

			/**
			 * Binds the view to the project's path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_onRouteMatched : function (oEvent) {
				var projectId =  parseInt(oEvent.getParameter("arguments").projectId),
					projectsModel = this.getModel("projects");
				
				var sPath = this.getPath(projectsModel.getData(), "projectId", projectId);
				var oContext = new sap.ui.model.Context(projectsModel, sPath);
				this.getView().setBindingContext(oContext, "projects");
			
				if (projectId === 0) {
					// switch to edit mode for new items
					this.getModel("appView").setProperty("/editMode", true);
				} else {
					// turn off edit mode by default
					this.getModel("appView").setProperty("/editMode", false);
					// store selected projectId in app model for later use
					this.getModel("appView").setProperty("/projectId", projectId);
				}
			},
			
			_getAddMemberDialog : function() {
                if (!this._oDialog) {
                	if (this.getModel("appView").getProperty("/directoryIntegration")) {
                		this._oDialog = sap.ui.xmlfragment("idAddMemberDialog","xproject.view.AddMemberUserSelectDialog", this);
                	} else {
                		this._oDialog = sap.ui.xmlfragment("idAddMemberDialog","xproject.view.AddMemberUserInputDialog", this);
                	}
                	this.getView().addDependent(this._oDialog);
                }
                return this._oDialog;
            }
		});

	}
);