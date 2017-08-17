sap.ui.define([
		"xproject/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";

		return BaseController.extend("xproject.controller.Home", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			onInit : function () {
				var oViewModel = new JSONModel({
					busy : false
				});
				this.setModel(oViewModel, "homeView");
			}
		});

	}
);