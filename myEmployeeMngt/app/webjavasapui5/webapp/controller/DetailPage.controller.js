sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "webjavasapui5/model/models"
], (Controller, JSONModel, MessageToast, MessageBox, model) => {
    "use strict";

    function _formatDate(sDate) {
        if (!sDate) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) return sDate;
        const oDate = new Date(sDate);
        if (isNaN(oDate.getTime())) return "";
        return `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
    }

    function _validateEmail(email) {
        return /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/.test(email);
    }

    return Controller.extend("webjavasapui5.controller.DetailPage", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetailPage").attachPatternMatched(this._onRouteMatched, this);
            this.getView().setModel(model.createUserInfoModel(this.getOwnerComponent()), "userInfo");
            this._loadRolesAndDepartments();
        },

        handleViewDetailEmployeePress() {
            const oRouter = this.getOwnerComponent().getRouter();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oEmployeeModel = this.getView().getModel("userInfo");
            if (oEmployeeModel && oEmployeeModel.getProperty("/roles/admin")) {
                MessageBox.confirm(
                    oResourceBundle.getText("confirmCancelMessage"),
                    {
                        title: oResourceBundle.getText("confirmCancelTitle"),
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: (oAction) => {
                            if (oAction === MessageBox.Action.YES) {
                                oRouter.navTo("RouteListPage");
                                this._clearForm();
                            }
                        }
                    }
                );
            } else {
                oRouter.navTo("RouteListPage");
            }
        },

        handleCreateNewEmployeePress() {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oRouter = this.getOwnerComponent().getRouter();
            const oEmployeeModel = this.getView().getModel("userInfo");
            if (oEmployeeModel && oEmployeeModel.getProperty("/roles/admin")) {
                MessageBox.confirm(
                    oResourceBundle.getText("confirmCancelMessage"),
                    {
                        title: oResourceBundle.getText("confirmCancelTitle"),
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: (oAction) => {
                            if (oAction === MessageBox.Action.YES) {
                                oRouter.navTo("RouteDetailPage", { employeeId: "new" });
                            }
                        }
                    }
                );
            }
        },

        handleSaveEmployeePress() {
            const oEmployeeModel = this.getView().getModel("employee");
            const oEmployeeData = oEmployeeModel.getData();
            if (!this._validateForm(oEmployeeData)) return;
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            MessageBox.confirm(oResourceBundle.getText("confirmSaveMessage"), {
                title: oResourceBundle.getText("confirmSaveTitle"),
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        this._performSave(oEmployeeData);
                    }
                }
            });
        },

        _performSave(oEmployeeData) {
            const oModel = this.getOwnerComponent().getModel();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oEmployee = {
                firstName: oEmployeeData.firstName,
                lastName: oEmployeeData.lastName,
                dateOfBirth: _formatDate(oEmployeeData.dateOfBirth),
                email: oEmployeeData.email,
                department_ID: oEmployeeData.department_ID,
                role_ID: oEmployeeData.role_ID,
                hireDate: _formatDate(oEmployeeData.hireDate)
            };
            if (oEmployeeData.isEditMode && oEmployeeData.ID) {
                const sPath = `/Employees(${oEmployeeData.ID})`;
                const oBinding = oModel.bindContext(sPath);
                oBinding.requestObject().then(() => {
                    const oContext = oBinding.getBoundContext();
                    Object.keys(oEmployee).forEach(sProperty => {
                        oContext.setProperty(sProperty, oEmployee[sProperty]);
                    });
                    return oModel.submitBatch(oModel.getUpdateGroupId());
                }).then(() => {
                    MessageToast.show(oResourceBundle.getText("employeeUpdatedMessage"));
                    this._clearForm();
                    this._navigateListViewWithRefresh();
                }).catch(() => {
                    MessageToast.show(oResourceBundle.getText("errorUpdatingMessage"));
                });
            } else {
                const oListBinding = oModel.bindList("/Employees");
                try {
                    const oCreatedContext = oListBinding.create(oEmployee);
                    oCreatedContext.created().then(() => {
                        MessageToast.show(oResourceBundle.getText("employeeCreatedMessage"));
                        this._clearForm();
                        this._navigateListViewWithRefresh();
                    }).catch(() => {
                        MessageToast.show(oResourceBundle.getText("errorCreatingMessage"));
                    });
                } catch (oError) {
                    MessageToast.show(oResourceBundle.getText("errorCreatingMessage"));
                }
            }
        },

        onEmailChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oInput = oEvent.getSource();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            if (sValue === "") {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }
            if (_validateEmail(sValue)) {
                oInput.setValueState("Success");
                oInput.setValueStateText(oResourceBundle.getText("validEmailAddress"));
            } else {
                oInput.setValueState("Error");
                oInput.setValueStateText(oResourceBundle.getText("validationInvalidEmail"));
            }
        },

        onHireDateChange() {
            this._calculateAndPreviewSalary();
        },

        onRoleChange() {
            this._calculateAndPreviewSalary();
        },

        handleCancelEmployeePress() {
            this.handleViewDetailEmployeePress();
        },

        _validateForm(oEmployeeData) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            if (!oEmployeeData.firstName || !oEmployeeData.lastName || !oEmployeeData.email ||
                !oEmployeeData.department_ID || !oEmployeeData.role_ID || !oEmployeeData.hireDate) {
                MessageToast.show(oResourceBundle.getText("validationRequiredFields"));
                return false;
            }
            if (oEmployeeData.email && !_validateEmail(oEmployeeData.email)) {
                MessageToast.show(oResourceBundle.getText("validationInvalidEmail"));
                return false;
            }
            return true;
        },

        _navigateListView() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteListPage");
            setTimeout(() => {
                const oModel = this.getOwnerComponent().getModel();
                const oListBinding = oModel.bindList("/Employees");
                if (oListBinding) oListBinding.refresh();
            }, 100);
        },

        _navigateListViewWithRefresh() {
            const oRouter = this.getOwnerComponent().getRouter();
            sap.ui.getCore().getEventBus().publish("employee", "dataChanged", {});
            oRouter.navTo("RouteListPage");
        },

        _onRouteMatched(oEvent) {
            this._refreshEmailState();
            const oArgs = oEvent.getParameter("arguments");
            const sEmployeeId = oArgs.employeeId;
            if (sEmployeeId && sEmployeeId !== "new") {
                this._loadEmployeeData(sEmployeeId);
            } else {
                this._createEmpModel();
            }
        },

        _createEmpModel(oEmployeeData = null) {
            const oSelectModel = this.getView().getModel("select");
            let sDefaultDepartmentID = "";
            let sDefaultRoleID = "";
            if (oSelectModel) {
                const aDepartments = oSelectModel.getProperty("/departments");
                if (aDepartments && aDepartments.length > 0) sDefaultDepartmentID = aDepartments[0].key;
                const aRoles = oSelectModel.getProperty("/roles");
                if (aRoles && aRoles.length > 0) sDefaultRoleID = aRoles[0].key;
            }
            const oDefaultData = {
                firstName: "",
                lastName: "",
                email: "",
                department_ID: sDefaultDepartmentID,
                role_ID: sDefaultRoleID,
                salary: 0,
                hireDate: "",
                dateOfBirth: "",
                isEditMode: false
            };
            let oModelData = Object.assign({}, oDefaultData);
            if (oEmployeeData) {
                oModelData = {
                    ID: oEmployeeData.ID,
                    firstName: oEmployeeData.firstName || "",
                    lastName: oEmployeeData.lastName || "",
                    email: oEmployeeData.email || "",
                    department_ID: oEmployeeData.department_ID || sDefaultDepartmentID,
                    role_ID: oEmployeeData.role_ID || sDefaultRoleID,
                    salary: oEmployeeData.salary || 0,
                    hireDate: oEmployeeData.hireDate || "",
                    dateOfBirth: oEmployeeData.dateOfBirth || "",
                    isEditMode: true
                };
            }
            const oModel = new JSONModel(oModelData);
            oModel.setDefaultBindingMode("TwoWay");
            this.getView().setModel(oModel, "employee");
            if (oEmployeeData || (oModelData.role_ID && oModelData.hireDate)) {
                setTimeout(() => this._calculateAndPreviewSalary(), 200);
            }
            return oModel;
        },

        _refreshEmailState() {
            const oEmailInput = this.getView().byId("emailInput");
            if (oEmailInput) {
                oEmailInput.setValueState(sap.ui.core.ValueState.None);
                oEmailInput.setValueStateText("");
            }
        },

        _loadEmployeeData(sEmployeeId) {
            const oModel = this.getOwnerComponent().getModel();
            const sPath = `/Employees(${sEmployeeId})`;
            const oBinding = oModel.bindContext(sPath, null, { $expand: "department,role" });
            oBinding.requestObject().then((oEmployeeData) => {
                this._createEmpModel(oEmployeeData);
            }).catch(() => {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("errorLoadingEmployee"));
                this._createEmpModel();
            });
        },

        _loadRolesAndDepartments() {
            const oModel = this.getOwnerComponent().getModel();
            const oSearchModel = new JSONModel({});
            this.getView().setModel(oSearchModel, "select");
            oModel.bindList("/Roles").requestContexts().then((aContexts) => {
                const allRoles = aContexts.map(oContext => {
                    const role = oContext.getObject();
                    return { key: role.ID || role.id, text: role.name || role.Name };
                });
                oSearchModel.setProperty("/roles", allRoles);
                const oEmployeeModel = this.getView().getModel("employee");
                if (oEmployeeModel && allRoles.length > 0 && !oEmployeeModel.getProperty("/role_ID")) {
                    oEmployeeModel.setProperty("/role_ID", allRoles[0].key);
                    setTimeout(() => this._calculateAndPreviewSalary(), 100);
                }
            });
            oModel.bindList("/Departments").requestContexts().then((aContexts) => {
                const allDepartments = aContexts.map(oContext => {
                    const dept = oContext.getObject();
                    return { key: dept.ID || dept.id, text: dept.name || dept.Name };
                });
                oSearchModel.setProperty("/departments", allDepartments);
                const oEmployeeModel = this.getView().getModel("employee");
                if (oEmployeeModel && allDepartments.length > 0 && !oEmployeeModel.getProperty("/department_ID")) {
                    oEmployeeModel.setProperty("/department_ID", allDepartments[0].key);
                }
            });
        },

        _clearForm() {
            this._createEmpModel();
        },

        _calculateAndPreviewSalary() {
            const oEmployeeModel = this.getView().getModel("employee");
            if (!oEmployeeModel) return;
            const sRoleID = oEmployeeModel.getProperty("/role_ID");
            const sHireDate = oEmployeeModel.getProperty("/hireDate");
            if (!sRoleID || !sHireDate) {
                oEmployeeModel.setProperty("/salary", 0);
                return;
            }
            const oModel = this.getOwnerComponent().getModel();
            const sPath = `/Roles(${sRoleID})`;
            const oBinding = oModel.bindContext(sPath);
            oBinding.requestObject().then((oRoleData) => {
                if (oRoleData && oRoleData.baseSalary) {
                    const hireDate = new Date(sHireDate);
                    const currentDate = new Date();
                    const yearsOfService = currentDate.getFullYear() - hireDate.getFullYear();
                    const totalSalary = parseFloat(oRoleData.baseSalary) + (yearsOfService * 1000);
                    oEmployeeModel.setProperty("/salary", totalSalary);
                }
            }).catch(() => {
                oEmployeeModel.setProperty("/salary", 0);
            });
        }
    });
});