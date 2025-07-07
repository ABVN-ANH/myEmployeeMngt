// webapp/model/formatter.js
sap.ui.define([], function () {
    "use strict";
    return {
        salaryText: function (salary) {
            if (salary === undefined || salary === null) {
                return "Salary is empty";
            }
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            });
            return formatter.format(parseFloat(salary.replace(/,/g, '')));
        }
    };
});