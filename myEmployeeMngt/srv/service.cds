using { sap.capire as my } from '../db/schema';

@cds.service.name       : 'EmployeeManagementService'
@cds.service.description: ''
@requires               : 'authenticated-user'


service EmployeeManagementService {
    @restrict: [
        {
            grant: '*',
            to   : 'Admin'
        },
        {
            grant: ['READ'],
            to   : 'Viewer'
        }
    ]
    entity Departments as projection on my.Departments;

    @restrict: [
        {
            grant: '*',
            to   : 'Admin'
        },
        {
            grant: ['READ'],
            to   : 'Viewer'
        }
    ]
    entity Employees   as projection on my.Employees;

    @restrict: [
        {
            grant: '*',
            to   : 'Admin'
        },
        {
            grant: ['READ'],
            to   : 'Viewer'
        }
    ]
    entity Roles       as projection on my.Roles;

    function calculateEmployeeSalary(ID : UUID) returns Decimal(15, 2);

    function userInfo()                         returns {
        id    : String;
        roles : array of String;
        attr  : LargeString;
    };

}