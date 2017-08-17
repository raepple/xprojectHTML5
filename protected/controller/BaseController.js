sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/m/MessageBox",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"sap/ui/Device"
	], function (Controller, MessageBox, JSONModel, History, Device) {
		"use strict";

		return Controller.extend("xproject.controller.BaseController", {
					
			/**
			 * Convenience method for accessing the router in every controller of the application.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter : function () {
				return this.getOwnerComponent().getRouter();
			},

			/**
			 * Convenience method for getting the view model by name in every controller of the application.
			 * @public
			 * @param {string} sName the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel : function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model in every controller of the application.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel : function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},
			
			getComponentModel: function (sName) {
				return this.getOwnerComponent().getModel(sName);
			},

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle : function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},
		
			/**
			 * Convenience method for checking the currently logged in user's role.
			 * @public
			 * @returns {boolean}
			 */
			
			isUserInRole : function (roleName) {
				var userRoles = this.getComponentModel("roleData").getData();
				if (userRoles !== undefined) {
					if (userRoles[roleName] !== undefined) {
						return (userRoles[roleName]);
					}
				}
				return false;
			},

			getProject : function (projectId) {
				var projects = this.getComponentModel("projects").getData();
				if (projects !== undefined) {
					for (var i = 0; i < projects.length; i++) {
							if (projects[i].projectId == projectId) {
								return projects[i];
							}
				    	}
				} else {
					return undefined;
				}
			},
			
			/**
			 * Returns the path in the model for a given property and value.
			 * @public
			 */
		
			getPath : function (oData, sProperty, oValue) {
				return this._getPath(oData, sProperty, oValue, "/");
			},

			_getPath : function (oData, sProperty, oValue, sPath) {
				if (oData instanceof Array) {
					// step down into recursion for arrays
					for (var i = 0 ; i < oData.length ; i++) {
						var result = this._getPath(oData[i], sProperty, oValue, sPath + i + "/");
						if (result) {
							return result;
						}
					}
				} else {
					// check property
					for (var p in oData) {
						if (p === sProperty && oData[p] === oValue) {
							return sPath;
						}
					}
				}
				return null;
			},
			
			/**
			 * Creates a new entity in the backend.
			 * @public
			 */
			postJSON : function(data, url, async) {
				if (arguments.length === 2) {
					async = false;
				}			
				return this._sendJSON("POST", data, url, async);
			},
			
			/**
			 * Updates an existing entity in the backend.
			 * @public
			 */
			putJSON : function(data, url, async) {
				if (arguments.length === 2) {
					async = false;
				}			
				return this._sendJSON("PUT", data, url, async);
			},
			
			/**
			 * Backend call function
			 * @private
			 */
			_sendJSON : function(_type, _data, _url, _async) {
				var ajax = jQuery.ajax({
					url : _url,
					type : _type,
					async : _async,
					data : JSON.stringify(_data),
					contentType : "application/json"
				});	
				
				return ajax;
			},
			
			/**
			 * Does a backend ajax GET call.
			 *
			 * If a call for the same url is already ongoing, new requests will be hooked into the first call.
			 */	
			
			getJSON : function(url, async) {
				if (arguments.length === 1) {
					async = true;
				}
	
				var result = this._getJson(url, async);
	
				return result;
			},
	
			/**
			 * Pure promise based ajax get call
			 */
			_getJson : function(url, async) {
	
				var currentCalls = this._currentCalls = this._currentCalls || {};
	
				var currentCall = currentCalls[url];
				if (currentCall) {				
					return currentCall;
				}
	
				var ajax = jQuery.ajax({
					url : url,
					type : 'GET',
					async : async,
					contentType : "application/json"
				});
	
				currentCalls[url] = ajax;
	
				ajax.always(function() {
					delete currentCalls[url];
				});
	
				return ajax;
			},			
			
			showAlertMessage : function(messageKey, ajaxErrorMessage) {
				var messageText = this.getResourceBundle().getText(messageKey);
				if (arguments.length === 2) {
					messageText += " (" + ajaxErrorMessage + ")";
				}
				MessageBox.error(messageText);
			},
		
			showSuccessMessage : function(messageKey) {				
				var messageText = this.getResourceBundle().getText(messageKey);
				sap.m.MessageToast.show(messageText, { duration: 5000 });
			},
			
			handleLogout: function() {
				sap.m.URLHelper.redirect("/logout.html", false);
			},

			loadProjects: function(navigateHome) {
				var oAppViewModel = this.getModel("appView");
				oAppViewModel.setProperty("/busy", true);
				var oModel = new JSONModel("/api/projects");
				// navigate to home screen
				oAppViewModel.setProperty("/navigateHome", navigateHome);
				var _this = this;
				oModel.attachRequestCompleted(function() {
					// set the "projects" model on the Component directly to make it visible in all views
					_this.getOwnerComponent().setModel(oModel, "projects");
			        // count projects joined by current user
			        var joinedProjects = 0;
			    	for (var i = 0; i < oModel.getProperty("/").length; i++) {
    					if (oModel.getProperty("/")[i].joined) {
    						joinedProjects += 1;
    					}
			    	}
			    	oAppViewModel.setProperty("/projectsJoined", joinedProjects);
			    	oAppViewModel.setProperty("/busy", false);
			    });
			    oModel.attachRequestFailed(function(oEvent) {
			    	oAppViewModel.setProperty("/busy", false);
			    	var messageText = _this.getResourceBundle().getText("backendError");
			    	_this.showAlertMessage(messageText, oEvent.getParameter("response").responseText);
			    });
			},
			
			_handleDeleteItem : function (sItemType, oItem) {
				var sPath = oItem.getBindingContext("projects").getPath();
				var selectedItem = this.getModel("projects").getProperty(sPath);
				var sUrl = "/api/projects/" + this.getModel("appView").getProperty("/projectId") + "/" + sItemType + "/";
				if (sItemType === 'members') { 
					sUrl+=selectedItem.memberId;
				} else {
					sUrl+=selectedItem.taskId;
				}
				var result = jQuery.ajax({
					url : sUrl,
					type : "DELETE",
					async : false
				});
				
				if (result.status !== 200) {
					this.showAlertMessage("msgOperationFailed", result.statusText);
				} else {
					this.showSuccessMessage("msgItemDeleted");
					// remove item from model
					var aPathParts = sPath.split("/");
					var iIndex = aPathParts[aPathParts.length - 2];
					var oJSONData = this.getModel("projects").getData();
					if (sItemType === 'members') { 
						oJSONData[aPathParts[1]].members.splice(iIndex, 1);
					} else {
						oJSONData[aPathParts[1]].tasks.splice(iIndex, 1);
					}
					// stay on current page after the refresh
					this.getModel("appView").setProperty("/navigateHome", false);
					this.getModel("projects").setData(oJSONData);
				}				
			},
			
			/**
			 * Event handler for navigating back.
			 * It there is a history entry we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the home route.
			 * @public
			 */
			handleNavBack : function() {				
				var sPreviousHash = History.getInstance().getPreviousHash();
				 
				if (sPreviousHash !== undefined) {
					window.history.go(-1);
				} else {
					// There is no history! Replace the current hash with project id 0 (will not add an history entry)
					var bReplace = !Device.system.phone;
					var _this = this;
					this.getRouter().navTo("project", {
						projectId : _this.getModel("appView").getProperty("/projectId")
					}, bReplace);
				}
			}
		});
	}
);