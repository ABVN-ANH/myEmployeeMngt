sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
    function (JSONModel, Device) {
        "use strict";

        return {
            /**
             * Provides runtime information for the device the UI5 app is running on as a JSONModel.
             * @returns {sap.ui.model.json.JSONModel} The device model.
             */
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            },
            /**
                 * Creates a model by calling the getUserInfo OData v4 function.
                 * @returns {Promise<sap.ui.model.json.JSONModel>} Promise that resolves to the user info model.
                 */
            createUserInfoModel: function (oComponent) {
                const oModel = oComponent.getModel();
                const oJSONModel = new JSONModel({});
                oModel.setDefaultBindingMode("OneWay");
                const oBinding = oModel.bindContext("/userInfo");
                oBinding.requestObject().then((oUserInfo) => {
                    let oUserRole = null;
                    if (oUserInfo && oUserInfo.roles) {
                        if (
                            (Array.isArray(oUserInfo.roles) && oUserInfo.roles.includes("Admin")) ||
                            (typeof oUserInfo.roles === "object" && (oUserInfo.roles.Admin === 1 || oUserInfo.roles.Admin === true))
                        ) {
                            oUserRole = "Admin";
                        }
                    }
                    if (oUserInfo) {
                        oUserInfo.userRole = oUserRole;
                        oJSONModel.setData(oUserInfo);
                        // Fire a custom event so controller can react when data is ready
                        oJSONModel.fireEvent && oJSONModel.fireEvent("userInfoReady");
                        console.log("User Info (from model):", oJSONModel.getData());
                    }
                });
                return oJSONModel;
            }
        };

    });
