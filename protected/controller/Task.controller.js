sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";

		return BaseController.extend("xproject.controller.Task", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				var oViewModel = new JSONModel({
					projectJoined : false
				});
				this.setModel(oViewModel, "taskView");
				this.getRouter().getRoute("task").attachPatternMatched(this._onRouteMatched, this);
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			handleSaveTaskActionPress : function(oEvent) {
				var task = this.getModel("projects").getProperty(this.getView().getBindingContext("projects").getPath());
				var projectId = this.getModel("appView").getProperty("/projectId");
				var sUrl = "/api/projects/" + projectId + "/tasks";	
				var result;
				var _this = this;
				if (this.isUserInRole("ProjectManager") && this.getModel("appView").getProperty("/editMode")) {
					// create or update task
					if (task.taskId === 0) {
						// new task
						result = this.postJSON(task, sUrl);
					} else {
						result = this.putJSON(task, sUrl);
					}
	
					if (result.status !== 200) {
						this.showAlertMessage("msgTaskFailed", result.statusText);
					} else {
						setTimeout(function () {
							_this.showSuccessMessage("msgTaskSaved");
						}, 200);
						task.taskId = result.responseJSON;
					}
				}
				
				var reportedTime = this.getModel("taskView").getProperty("/time");
				
				if (this.isUserInRole("ProjectMember") && reportedTime !== undefined) {
					// create or update timesheet
					sUrl = "/api/timesheets/" + projectId + "/task/" + task.taskId;		
					result = this.postJSON(reportedTime, sUrl);
					if (result.status !== 200) {
						this.showAlertMessage("msgTimeSheetFailed", result.statusText);
					}
				}
				this.handleNavBack();
			},

			handleCancelTaskActionPress : function(oEvent) {
				// remove new task if created
				var projectModel = this.getModel("projects");
				var taskPath = this.getView().getBindingContext("projects").getPath();
				var taskId = projectModel.getProperty(taskPath).taskId;
				if (taskId === 0) {
					var sProjectPath = this.getPath(projectModel.getData(), "projectId", parseInt(this.getModel("appView").getProperty("/projectId")));
					var tasks = projectModel.getProperty(sProjectPath + "tasks");
					tasks.splice(tasks.length - 1, 1);
				} else {
					// restore old task
					var sPath = this.getView().getBindingContext("projects").getPath().slice(0, -1);
					projectModel.setProperty(sPath, jQuery.extend(true, {}, this.getModel("taskView").getProperty("/oldTask")));
				}
				// navigate back to project
				this.handleNavBack();
			},

			handleDeleteTaskActionPress : function(oEvent) {
				var oItem = oEvent.getParameter("listItem") || oEvent.getSource();	
				this._handleDeleteItem("tasks", oItem);
				
				// navigate back to project
				this.handleNavBack();
			},

			/* =========================================================== */
			/* internal methods          		                           */
			/* =========================================================== */

			/**			
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_onRouteMatched : function (oEvent) {
				var sTaskId =  oEvent.getParameter("arguments").taskId,
					sProjectId = oEvent.getParameter("arguments").projectId;
					
				var projectsModel = this.getModel("projects");
				var sProjectPath = this.getPath(projectsModel.getData(), "projectId", parseInt(sProjectId));
				var sTaskPath = this._getPath(projectsModel.getProperty(sProjectPath + "tasks"), "taskId", parseInt(sTaskId), "tasks/");
				
				var sPath = sProjectPath + sTaskPath;
				var oContext = new sap.ui.model.Context(projectsModel, sPath);
				this.getView().setBindingContext(oContext, "projects");

				// load timesheet for current user in selected project
				var viewModel = this.getModel("taskView");
				var projectJoined = projectsModel.getProperty(sProjectPath).joined;
				viewModel.setProperty("/projectJoined", projectJoined);
				viewModel.setProperty("/time", "0");
				if (this.isUserInRole("ProjectMember") && projectJoined) {
					var sUrl = "/api/timesheets/" + sProjectId;
					var getTimeSheetResponse = this.getJSON(sUrl, false);
					for (var i = 0; i < getTimeSheetResponse.responseJSON.length; i++) {
						if (getTimeSheetResponse.responseJSON[i].task.taskId === parseInt(sTaskId)) {
							viewModel.setProperty("/time", getTimeSheetResponse.responseJSON[i].time);
						}
			    	}
				}
				
				if (sTaskId !== "0") {
					// create copy of old task
					viewModel.setProperty("/oldTask", jQuery.extend(true, {}, projectsModel.getProperty(sPath)));
				}
				
				// don't navigate to home when going back
				this.getModel("appView").setProperty("/navigateHome", false);
			}
		});
	}
);