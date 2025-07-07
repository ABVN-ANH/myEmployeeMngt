package customer.myemployeemngt.handlers;

import cds.gen.employeemanagementservice.*;
import static cds.gen.employeemanagementservice.Employees_.CDS_NAME;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.Period;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.stereotype.Component;

import com.sap.cds.ql.Select;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.cds.CqnService;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;
import com.sap.cds.services.request.UserInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@ServiceName(EmployeeManagementService_.CDS_NAME)
public class EmployeeManagementServiceHandler implements EventHandler {

    private final PersistenceService db;
    private final UserInfo userInfo;
    private static final Logger logger = LoggerFactory.getLogger(EmployeeManagementServiceHandler.class);

    public EmployeeManagementServiceHandler(PersistenceService db, UserInfo userInfo) {
        this.db = db;
        this.userInfo = userInfo;
    }

    /**
     * Action handler for calculateEmployeeSalary
     */
    @On(event = "calculateEmployeeSalary", entity = CDS_NAME)
    public void onCalculateEmployeeSalary(CalculateEmployeeSalaryContext context) {
        String employeeId = context.getId();
        if (employeeId == null) {
            context.setResult(null);
            context.setCompleted();
            throw new ServiceException("Please provide an employee ID.");
        }
        Optional<Employees> employeeOpt = db.run(Select.from(CDS_NAME).where(b -> b.get("ID").eq(employeeId)))
                .first(Employees.class);
        if (!employeeOpt.isPresent()) {
            context.setResult(null);
            context.setCompleted();
            throw new ServiceException("Employee with ID " + employeeId + " not found.");
        }
        Employees emp = employeeOpt.get();
        BigDecimal salary = calculateSalary(emp.getRoleId(), toSqlDate(emp.getHireDate()));
        if (salary == null) {
            context.setResult(null);
            context.setCompleted();
            throw new ServiceException("Cannot calculate salary for employee with ID " + employeeId + ".");
        }
        context.setResult(salary);
        context.setCompleted();
    }

    /**
     * Validation before create/update/upsert Employees
     */
    @Before(event = { CqnService.EVENT_CREATE, CqnService.EVENT_UPDATE, CqnService.EVENT_UPSERT }, entity = CDS_NAME)
    public void beforeModifyEmployees(Stream<Employees> employees) {
        employees.forEach(emp -> {
            Date hireDate = toSqlDate(emp.getHireDate());
            if (hireDate != null && hireDate.toLocalDate().isAfter(LocalDate.now())) {
                throw new ServiceException("Hire date cannot be in the future.");
            }
        });
    }

    /**
     * After handler to enrich Employees with calculated salary
     */
    @After(event = CqnService.EVENT_READ, entity = CDS_NAME)
    public void afterReadEmployees(List<Employees> employees) {
        if (employees == null || employees.isEmpty())
            return;
        employees.forEach(emp -> {
            BigDecimal salary = calculateSalary(emp.getRoleId(), toSqlDate(emp.getHireDate()));
            if (salary != null)
                emp.setSalary(salary);
        });
    }

    /**
     * Function handler for userInfo
     */
    @On(event = { UserInfoContext.CDS_NAME })
    public void getUserInfo(UserInfoContext context) {
        String userId = userInfo.getName();
        Collection<String> roles = userInfo.getRoles();
        List<String> rolesList = roles != null ? new java.util.ArrayList<>(roles) : java.util.Collections.emptyList();
        // attr is not used, set to null or provide additional info if needed
        UserInfoContext.ReturnType result = UserInfoContext.ReturnType.create();
        result.setId(userId != null ? userId : "unknown");
        result.setRoles(rolesList);
        result.setAttr(null);
        context.setResult(result);
        logger.info("userInfo: id={}, roles={}", result.getId(), result.getRoles());
    }

    /**
     * Helper to calculate salary
     */
    private BigDecimal calculateSalary(String roleId, Date hireDate) {
        if (roleId == null || hireDate == null)
            return null;
        Optional<Roles> roleOpt = db.run(Select.from(Roles_.class).where(r -> r.ID().eq(roleId))).first(Roles.class);
        if (!roleOpt.isPresent())
            return null;
        Roles role = roleOpt.get();
        LocalDate hire = hireDate.toLocalDate();
        LocalDate now = LocalDate.now();
        int years = Period.between(hire, now).getYears();
        years = Math.max(0, years);
        BigDecimal bonus = BigDecimal.valueOf(years * 1000.0);
        BigDecimal baseSalary = role.getBaseSalary() != null ? role.getBaseSalary() : BigDecimal.ZERO;
        return baseSalary.add(bonus);
    }

    /**
     * Helper to convert LocalDate or Date to java.sql.Date
     */
    private Date toSqlDate(Object dateObj) {
        if (dateObj == null)
            return null;
        if (dateObj instanceof Date)
            return (Date) dateObj;
        if (dateObj instanceof LocalDate)
            return Date.valueOf((LocalDate) dateObj);
        return null;
    }

}