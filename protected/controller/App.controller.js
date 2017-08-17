sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";

		return BaseController.extend("xproject.controller.App", {

			onInit : function () {	
				var oViewModel = new JSONModel({
					busy : true,
					editMode : false,
					navigateHome : false,
					roleProvisioning : false,
					directoryIntegration : false 
				});
				this.setModel(oViewModel, "appView");
				
				// apply content density mode to root view
				this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
				
				// initial load of project data
				this.loadProjects(false);
			}
		});

	}
);