sap.ui.define([
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"sap/ui/Device"
	], function (JSONModel, MessageBox, Device) {
		"use strict";

		return {
			createDeviceModel : function () {
				var oModel = new JSONModel(Device);
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},
			
			createUserModel: function () {
				var oModel = new JSONModel("/services/userapi/currentUser");
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},
			
			createRoleModel: function () {
				var oModel = new JSONModel("/api/projects/roles").
					attachRequestFailed(function() {
						MessageBox.error("Backend request failed");
    				});
				oModel.setDefaultBindingMode("OneWay");
				return oModel;				
			}
		};

	}
);