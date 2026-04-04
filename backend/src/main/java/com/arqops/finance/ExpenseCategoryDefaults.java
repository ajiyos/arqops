package com.arqops.finance;

import java.util.List;

/**
 * Default expense category labels seeded for new tenants and Flyway V26.
 * Keep in sync with V26__tenant_expense_categories.sql VALUES list.
 */
public final class ExpenseCategoryDefaults {

    private ExpenseCategoryDefaults() {}

    public static final List<String> SEED_NAMES = List.of(
            "Site Visits",
            "Travel",
            "Materials",
            "Printing",
            "Consultancy",
            "Office Supplies",
            "Software & Subscriptions",
            "Meals & Entertainment",
            "Other");
}
