sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "webjavasapui5/model/models",
    "../model/formatter"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, model, formatter) => {
    "use strict";

    return Controller.extend("webjavasapui5.controller.ListPage", {
        formatter,

        onInit() {
            this._loadRolesAndDepartments();
            const oUserInfoModel = model.createUserInfoModel(this.getOwnerComponent());
            this.getView().setModel(oUserInfoModel, "userInfo");
            if (oUserInfoModel.attachEvent) {
                oUserInfoModel.attachEvent("userInfoReady", () => {
                    console.log("userInfo (LP):", oUserInfoModel.getData());
                    console.log("userRole (LP):", oUserInfoModel.getProperty("/userRole"));
                });
            }
            sap.ui.getCore().getEventBus().subscribe("employee", "dataChanged", this._onEmployeeDataChanged, this);
        },

        onExit() {
            sap.ui.getCore().getEventBus().unsubscribe("employee", "dataChanged", this._onEmployeeDataChanged, this);
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

            oModel.bindList("/Roles").requestContexts().then(aContexts => {
                const allRoles = [{ key: "", text: "All" }, ...aContexts.map(ctx => {
                    const role = ctx.getObject();
                    return { key: role.ID || role.id, text: role.name || role.Name };
                })];
                oSearchModel.setProperty("/roles", allRoles);
            });

            oModel.bindList("/Departments").requestContexts().then(aContexts => {
                const aDepartmentsList = [{ key: "", text: "All" }, ...aContexts.map(ctx => {
                    const dept = ctx.getObject();
                    return { key: dept.ID || dept.id, text: dept.name || dept.Name };
                })];
                oSearchModel.setProperty("/departments", aDepartmentsList);
            });
        },

        onSearchChange() {
            const oSearchModel = this.getView().getModel("search");
            const oTable = this.byId("employeeTable");
            const oBinding = oTable.getBinding("items");
            const sDepartment = oSearchModel.getProperty("/filters/department");
            const sRole = oSearchModel.getProperty("/filters/role");
            const aFilters = [];
            if (sDepartment) aFilters.push(new Filter("department_ID", FilterOperator.EQ, sDepartment));
            if (sRole) aFilters.push(new Filter("role_ID", FilterOperator.EQ, sRole));
            oBinding.filter(aFilters);
        },

        handleCreateNewEmployeePress() {
            this.getOwnerComponent().getRouter().navTo("RouteDetailPage", { employeeId: "new" });
        },

        handleViewDetailEmployeePress() {
            this.getOwnerComponent().getRouter().navTo("RouteListPage");
        },

        handleUpdateEmployeePress(oEvent) {
            const oEmployeeData = oEvent.getSource().getBindingContext().getObject();
            this.getOwnerComponent().getRouter().navTo("RouteDetailPage", { employeeId: oEmployeeData.ID });
        },

        onRowSelect(oEvent) {
            const oEmployeeData = oEvent.getParameter("listItem").getBindingContext().getObject();
            this.getOwnerComponent().getRouter().navTo("RouteDetailPage", { employeeId: oEmployeeData.ID });
        },

        handleDeleteEmployeePress(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oEmployeeData = oContext.getObject();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            MessageBox.confirm(
                oResourceBundle.getText("confirmDeleteMessage", [oEmployeeData.firstName, oEmployeeData.lastName]),
                {
                    title: oResourceBundle.getText("confirmDeleteTitle"),
                    onClose: oAction => {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteEmployee(oContext, oEmployeeData);
                        }
                    }
                }
            );
        },

        _deleteEmployee(oContext, oEmployeeData) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            oContext.delete().then(() => {
                MessageToast.show(oResourceBundle.getText("employeeDeletedMessage", [oEmployeeData.firstName, oEmployeeData.lastName]));
                this._refreshEmployeeData();
                sap.ui.getCore().getEventBus().publish("employee", "dataChanged", {});
            }).catch(() => {
                MessageToast.show(oResourceBundle.getText("errorDeletingMessage"));
            });
        }
    });
});