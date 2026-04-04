package com.arqops.project;

/**
 * Reserved {@link com.arqops.project.entity.ProjectBudgetLine} category for system-maintained
 * billable labor from HR timesheets. Do not use this label for manually entered budget lines.
 */
public final class ProjectBudgetConstants {

    private ProjectBudgetConstants() {}

    public static final String LABOR_TIMESHEET_CATEGORY = "Labor (timesheet)";
}
