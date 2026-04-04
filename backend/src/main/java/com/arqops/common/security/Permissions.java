package com.arqops.common.security;

import java.util.List;

public final class Permissions {

    private Permissions() {}

    public static final String CRM_READ = "crm.read";
    public static final String CRM_WRITE = "crm.write";
    public static final String CRM_DELETE = "crm.delete";

    public static final String VENDOR_READ = "vendor.read";
    public static final String VENDOR_WRITE = "vendor.write";
    public static final String VENDOR_DELETE = "vendor.delete";
    public static final String VENDOR_APPROVE = "vendor.approve";

    public static final String PROJECT_READ = "project.read";
    public static final String PROJECT_WRITE = "project.write";
    public static final String PROJECT_DELETE = "project.delete";

    public static final String FINANCE_READ = "finance.read";
    public static final String FINANCE_WRITE = "finance.write";
    public static final String FINANCE_DELETE = "finance.delete";

    public static final String HR_READ = "hr.read";
    public static final String HR_WRITE = "hr.write";
    public static final String HR_DELETE = "hr.delete";
    public static final String HR_APPROVE = "hr.approve";

    public static final String REPORT_READ = "report.read";

    public static final String CONTRACT_READ = "contract.read";
    public static final String CONTRACT_WRITE = "contract.write";

    public static final List<String> ALL = List.of(
            CRM_READ, CRM_WRITE, CRM_DELETE,
            VENDOR_READ, VENDOR_WRITE, VENDOR_DELETE, VENDOR_APPROVE,
            PROJECT_READ, PROJECT_WRITE, PROJECT_DELETE,
            FINANCE_READ, FINANCE_WRITE, FINANCE_DELETE,
            HR_READ, HR_WRITE, HR_DELETE, HR_APPROVE,
            REPORT_READ,
            CONTRACT_READ, CONTRACT_WRITE
    );
}
