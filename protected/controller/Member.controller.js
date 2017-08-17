sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";

		return BaseController.extend("xproject.controller.Member", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				var oViewModel = new JSONModel({
					busy : false
				});

				this.getRouter().getRoute("member").attachPatternMatched(this._onRouteMatched, this);
				this.setModel(oViewModel, "memberView");
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
			
			handleDeleteMemberActionPress : function(oEvent) {
				var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
				// de-provisioning role if feature flag is set
				if (this.getModel("appView").getProperty("/roleProvisioning")) {
					var sPath = oItem.getBindingContext("projects").getPath();
					var selectedMemberId = this.getModel("projects").getProperty(sPath).memberId;
					var sUrl = "/api/projects/roles/" + selectedMemberId;
					var result = jQuery.ajax({
						url : sUrl,
						type : "DELETE",
						async : false
					});
				
					if (result.status !== 200) {
						this.showAlertMessage("msgOperationFailed", result.statusText);
					} else {
						this.showSuccessMessage("msgRoleUnassigned");
					}
				}
				this._handleDeleteItem("members", oItem);
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
				var sMemberId =  oEvent.getParameter("arguments").memberId,
					sProjectId = oEvent.getParameter("arguments").projectId;
					
				var oViewModel = this.getModel("memberView");
				oViewModel.setProperty("/busy", true);
				
				var oProjectsModel = this.getModel("projects");
				var sProjectPath = this.getPath(oProjectsModel.getData(), "projectId", parseInt(sProjectId));
				var sMemberPath = this._getPath(oProjectsModel.getProperty(sProjectPath + "members"), "memberId", parseInt(sMemberId), "members/");
				
				var sPath = sProjectPath + sMemberPath;
				var oContext = new sap.ui.model.Context(oProjectsModel, sPath);
				this.getView().setBindingContext(oContext, "projects");
				
				var oModelTimesheets = new JSONModel();
				oModelTimesheets.attachRequestCompleted(function() {
					var selectedMember = oProjectsModel.getProperty(sPath);
					selectedMember.reporting = this.getData();
					oProjectsModel.setProperty(sPath, selectedMember);
			        oViewModel.setProperty("/busy", false);
			        oViewModel.setProperty("/title", selectedMember.displayName);
			    });
				oModelTimesheets.loadData("/api/timesheets/" + sProjectId + "/member/" + sMemberId);
				
				// don't navigate to home when going back
				this.getModel("appView").setProperty("/navigateHome", false);
			}
		});
	}
);