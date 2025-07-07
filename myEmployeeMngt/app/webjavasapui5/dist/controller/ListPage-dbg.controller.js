sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../model/formatter",
    "webjavasapui5/model/models"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, formatter, model) => {
    "use strict";

    return Controller.extend("webjavasapui5.controller.ListPage", {
        formatter: formatter,

        onInit() {
            this._loadRolesAndDepartments();
            // Set the user info model
            const oUserInfoModel = model.createUserInfoModel(this.getOwnerComponent());
            this.getView().setModel(oUserInfoModel, "userInfo");

            if (oUserInfoModel.attachEvent) {
                oUserInfoModel.attachEvent("userInfoReady", function() {
                    console.log("userInfo (LP):", oUserInfoModel.getData());
                    console.log("userRole (LP):", oUserInfoModel.getProperty("/userRole"));
                });
            }

            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.subscribe("employee", "dataChanged", this._onEmployeeDataChanged, this);
        },

        onExit() {
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.unsubscribe("employee", "dataChanged", this._onEmployeeDataChanged, this);
        },

        _onEmployeeDataChanged() {
            this._refreshEmployeeData();
        },

        _refreshEmployeeData() {
            const oTable = this.byId("employeeTable");
            if (oTable) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }
        },

        _loadRolesAndDepartments() {
            const oModel = this.getOwnerComponent().getModel();
            const oSearchModel = new JSONModel({
                filters: {
                    department: "",
                    level: ""
                }
            });

            this.getView().setModel(oSearchModel, "search");
            const oRolesBinding = oModel.bindList("/Roles");
            oRolesBinding.requestContexts().then((aContexts) => {
                const roles = aContexts.map(oContext => oContext.getObject());
                const allRoles = [{ key: "", text: "All" }];

                roles.forEach(role => {
                    allRoles.push({
                        key: role.ID || role.id,
                        text: role.name || role.Name
                    });
                });

                oSearchModel.setProperty("/roles", allRoles);
            }).catch((oError) => {
            });

            const oDepartmentsBinding = oModel.bindList("/Departments");
            oDepartmentsBinding.requestContexts().then((aContexts) => {
                const aDepartments = aContexts.map(oContext => oContext.getObject());
                const aDepartmentsList = [{ key: "", text: "All" }];

                aDepartments.forEach(dept => {
                    aDepartmentsList.push({
                        key: dept.ID || dept.id,
                        text: dept.name || dept.Name
                    });
                });

                oSearchModel.setProperty("/departments", aDepartmentsList);
            }).catch((oError) => {
            });
        },

        onSearchChange() {
            const oSearchModel = this.getView().getModel("search");
            const oTable = this.byId("employeeTable");
            const oBinding = oTable.getBinding("items");

            const sDepartment = oSearchModel.getProperty("/filters/department");
            const sRole = oSearchModel.getProperty("/filters/role");

            const aFilters = [];

            if (sDepartment) {
                aFilters.push(new Filter("department_ID", FilterOperator.EQ, sDepartment));
            }
            if (sRole) {
                aFilters.push(new Filter("role_ID", FilterOperator.EQ, sRole));
            }

            oBinding.filter(aFilters);
        },

        handleAddPress() {
            // Navigate to DetailView với parameter "new"
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetailPage", {
                employeeId: "new"
            });
        },

        handleEmpPress() {
            // Navigate to ListView
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteListPage");
        },

        onEditEmployee(oEvent) {
            // Get selected employee data
            const oContext = oEvent.getSource().getBindingContext();
            const oEmployeeData = oContext.getObject();

            // Navigate to DetailView with employee data
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetailPage", {
                employeeId: oEmployeeData.ID
            });
        },

        onRowSelect(oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var oEmployeeData = oContext.getObject();

            // Navigate to DetailView with employee data
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetailPage", {
                employeeId: oEmployeeData.ID
            });
        },

        onDeleteEmployee(oEvent) {
            // Get selected employee data
            const oContext = oEvent.getSource().getBindingContext();
            const oEmployeeData = oContext.getObject();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

            // Confirm deletion dialog
            MessageBox.confirm(
                oResourceBundle.getText("confirmDeleteMessage", [oEmployeeData.firstName, oEmployeeData.lastName]),
                {
                    title: oResourceBundle.getText("confirmDeleteTitle"),
                    onClose: (oAction) => {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteEmployee(oContext, oEmployeeData);
                        }
                    }
                }
            );
        },

        _deleteEmployee(oContext, oEmployeeData) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

            try {
                // OData V4 delete using context
                oContext.delete().then(() => {
                    MessageToast.show(oResourceBundle.getText("employeeDeletedMessage", [oEmployeeData.firstName, oEmployeeData.lastName]));

                    // Refresh the table data immediately after delete
                    this._refreshEmployeeData();

                    // Also fire event in case other views need to know
                    const oEventBus = sap.ui.getCore().getEventBus();
                    oEventBus.publish("employee", "dataChanged", {});
                }).catch((oError) => {
                    MessageToast.show(oResourceBundle.getText("errorDeletingMessage"));
                });
            } catch (oError) {
                MessageToast.show(oResourceBundle.getText("errorDeletingMessage"));
            }
        }
    });
});