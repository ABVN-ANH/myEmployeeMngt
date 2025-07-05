using {managed} from '@sap/cds/common';

namespace sap.capire;


// Role master table
entity Roles {
    key ID         : UUID;
        name       : String           @mandatory  @unique  @title: 'Role Name';
        baseSalary : Decimal(15, 2)  @mandatory  @title: 'Base Salary';
}


// Department master table
entity Departments {
    key ID   : UUID;
        name : String(100)  @mandatory  @unique  @title: 'Department Name';
}


// Gender enum
type Gender : String enum {
    Male;
    Female;
    Other;
}

// Employee entity
entity Employees : managed {
    key     ID          : UUID;
            firstName   : String(100)                     @mandatory  @title         : 'First Name';
            lastName    : String(100)                     @mandatory  @title         : 'Last Name';
            dateOfBirth : Date                            @title: 'Date of Birth';
            gender      : Gender                          @title: 'Gender';
            email       : String(255)                     @mandatory  @assert.pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';
            hireDate    : Date                            @title: 'Hire Date';
    virtual salary      : Decimal(15, 2)                  @title         : 'Salary';
            // Relationships: One-to-one associations
            department  : Association to one Departments  @mandatory  @title         : 'Department';
            role        : Association to one Roles        @mandatory  @title         : 'Role';
}


function calculateEmployeeSalary(ID : UUID) returns Decimal(15, 2);