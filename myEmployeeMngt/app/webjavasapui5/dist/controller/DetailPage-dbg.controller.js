sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "webjavasapui5/model/models"
], (Controller, JSONModel, MessageToast, MessageBox, model) => {
    "use strict";

    return Controller.extend("webjavasapui5.controller.DetailPage", {

        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            const oRoute = oRouter.getRoute("RouteDetailPage");
            oRoute.attachPatternMatched(this._onRouteMatched, this);
            // Set the user info model
            const oUserInfoModel = model.createUserInfoModel(this.getOwnerComponent());
            this.getView().setModel(oUserInfoModel, "userInfo");
            this._loadRolesAndDepartments();
        },

        handleEmpPress() {
            const oRouter = this.getOwnerComponent().getRouter();
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oEmployeeModel = this.getView().getModel("userInfo");
            if (oEmployeeModel && oEmployeeModel.getProperty("/roles/admin")) {
                sap.m.MessageBox.confirm(
                    oResourceBundle.getText("confirmCancelMessage"),
                    {
                        title: oResourceBundle.getText("confirmCancelTitle"),
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        onClose: (oAction) => {
                            if (oAction === sap.m.MessageBox.Action.YES) {
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

        handleAddPress() {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oRouter = this.getOwnerComponent().getRouter();
            const oEmployeeModel = this.getView().getModel("userInfo");
            if (oEmployeeModel && oEmployeeModel.getProperty("/roles/admin")) {
                sap.m.MessageBox.confirm(
                    oResourceBundle.getText("confirmCancelMessage"),
                    {
                        title: oResourceBundle.getText("confirmCancelTitle"),
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        onClose: (oAction) => {
                            if (oAction === sap.m.MessageBox.Action.YES) {
                                oRouter.navTo("RouteDetailPage", {
                                    employeeId: "new"
                                });
                            }
                        }
                    }
                );
            }
        },

        onSave() {
            const oEmployeeModel = this.getView().getModel("employee");
            const oEmployeeData = oEmployeeModel.getData();

            if (!this._validateForm(oEmployeeData)) {
                return;
            }

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
                dateOfBirth: oEmployeeData.dateOfBirth,
                email: oEmployeeData.email,
                department_ID: oEmployeeData.department_ID,
                role_ID: oEmployeeData.role_ID,
                hireDate: this._formatDate(oEmployeeData.hireDate)
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
                }).catch((oError) => {
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
                    }).catch((oError) => {
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

            const rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
            if (rexMail.test(sValue)) {
                oInput.setValueState("Success");
                oInput.setValueStateText(oResourceBundle.getText("validEmailAddress"));
            } else {
                oInput.setValueState("Error");
                oInput.setValueStateText(oResourceBundle.getText("validationInvalidEmail"));
            }
        },

        onHireDateChange(oEvent) {
            this._calculateAndPreviewSalary();
        },


        onRoleChange() {
            this._calculateAndPreviewSalary();
        },

        onCancel() {
            this.handleEmpPress();
        },

        _validateForm(oEmployeeData) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            if (!oEmployeeData.firstName || !oEmployeeData.lastName || !oEmployeeData.email ||
                !oEmployeeData.department_ID || !oEmployeeData.role_ID || !oEmployeeData.hireDate) {
                MessageToast.show(oResourceBundle.getText("validationRequiredFields"));
                return false;
            }

            const rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
            if (oEmployeeData.email && !rexMail.test(oEmployeeData.email)) {
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
                if (oListBinding) {
                    oListBinding.refresh();
                }
            }, 100);
        },

        _navigateListViewWithRefresh() {
            const oRouter = this.getOwnerComponent().getRouter();
            // Fire event to ListView to refresh data
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("employee", "dataChanged", {});
            oRouter.navTo("RouteListPage");
        },

        _onRouteMatched(oEvent) {
            this._refreshEmailState();
            const oArgs = oEvent.getParameter("arguments");
            const sEmployeeId = oArgs.employeeId;

            if (sEmployeeId && sEmployeeId !== "new") {
                this._loadEmployeeData(sEmployeeId);
            } else {
                const oSelectModel = this.getView().getModel("select");
                if (oSelectModel && oSelectModel.getProperty("/departments")) {
                    this._createEmpModel();
                } else {
                    this._createEmpModel();
                }
            }
        },

        _createEmpModel(oEmployeeData = null) {
            // Get default department and role from select model if available
            const oSelectModel = this.getView().getModel("select");
            let sDefaultDepartmentID = "";
            let sDefaultRoleID = "";
            if (oSelectModel) {
                const aDepartments = oSelectModel.getProperty("/departments");
                if (aDepartments && aDepartments.length > 0) {
                    sDefaultDepartmentID = aDepartments[0].key;
                }

                const aRoles = oSelectModel.getProperty("/roles");
                if (aRoles && aRoles.length > 0) {
                    sDefaultRoleID = aRoles[0].key;
                }
            }

            var oDefaultData = {
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

            var oModelData = Object.assign({}, oDefaultData);
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

            var oModel = new JSONModel(oModelData);
            oModel.setDefaultBindingMode("TwoWay");
            this.getView().setModel(oModel, "employee");

            if (oEmployeeData || (oModelData.role_ID && oModelData.hireDate)) {
                setTimeout(() => {
                    this._calculateAndPreviewSalary();
                }, 200);
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

            // Bind context to the specific employee
            const sPath = `/Employees(${sEmployeeId})`;
            const oBinding = oModel.bindContext(sPath, null, {
                $expand: "department,role"
            });

            oBinding.requestObject().then((oEmployeeData) => {
                this._createEmpModel(oEmployeeData);
            }).catch((oError) => {
                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("errorLoadingEmployee"));
                this._createEmpModel();
            });
        },


        _loadRolesAndDepartments() {
            const oModel = this.getOwnerComponent().getModel();
            const oSearchModel = new JSONModel({});

            this.getView().setModel(oSearchModel, "select");

            const oRolesBinding = oModel.bindList("/Roles");
            oRolesBinding.requestContexts().then((aContexts) => {
                const roles = aContexts.map(oContext => oContext.getObject());
                const allRoles = [];
                roles.forEach(role => {
                    allRoles.push({
                        key: role.ID || role.id,
                        text: role.name || role.Name
                    });
                });

                oSearchModel.setProperty("/roles", allRoles);
                // Set default role if not already set
                const oEmployeeModel = this.getView().getModel("employee");
                if (oEmployeeModel && allRoles.length > 0) {
                    const sCurrentRoleID = oEmployeeModel.getProperty("/role_ID");
                    if (!sCurrentRoleID) {
                        oEmployeeModel.setProperty("/role_ID", allRoles[0].key);
                        // Calculate salary for default role if hire date exists
                        setTimeout(() => {
                            this._calculateAndPreviewSalary();
                        }, 100);
                    }
                }
            }).catch((oError) => {
            });

            const oDepartmentsBinding = oModel.bindList("/Departments");
            oDepartmentsBinding.requestContexts().then((aContexts) => {
                const departments = aContexts.map(oContext => oContext.getObject());
                const allDepartments = [];
                departments.forEach(dept => {
                    allDepartments.push({
                        key: dept.ID || dept.id,
                        text: dept.name || dept.Name
                    });
                });

                oSearchModel.setProperty("/departments", allDepartments);
                const oEmployeeModel = this.getView().getModel("employee");
                if (oEmployeeModel && allDepartments.length > 0) {
                    const sCurrentDepartmentID = oEmployeeModel.getProperty("/department_ID");
                    if (!sCurrentDepartmentID) {
                        oEmployeeModel.setProperty("/department_ID", allDepartments[0].key);
                    }
                }
            }).catch((oError) => {
            });
        },

        _formatDate(sDate) {
            if (!sDate) return "";

            try {
                if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
                    return sDate;
                }
                const oDate = new Date(sDate);
                if (isNaN(oDate.getTime())) {
                    return "";
                }
                const sYear = oDate.getFullYear();
                const sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
                const sDay = String(oDate.getDate()).padStart(2, '0');

                return `${sYear}-${sMonth}-${sDay}`;
            } catch (error) {
                return "";
            }
        },

        _clearForm() {
            this._createEmpModel();
        },

        _calculateAndPreviewSalary() {
            const oEmployeeModel = this.getView().getModel("employee");
            if (!oEmployeeModel) {
                return;
            }

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
                    const bonusPerYear = 1000;
                    const bonus = yearsOfService * bonusPerYear;
                    const baseSalary = parseFloat(oRoleData.baseSalary);
                    const totalSalary = baseSalary + bonus;
                    oEmployeeModel.setProperty("/salary", totalSalary);
                }
            }).catch((oError) => {
                oEmployeeModel.setProperty("/salary", 0);
            });
        }
    });
});