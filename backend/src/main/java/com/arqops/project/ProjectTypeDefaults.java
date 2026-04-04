package com.arqops.project;

import java.util.List;

public final class ProjectTypeDefaults {

    private ProjectTypeDefaults() {}

    /** Matches Flyway V29 seed for tenants without rows. */
    public static final List<String> SEED_NAMES = List.of(
            "Residential",
            "Commercial",
            "Interior",
            "Landscape");
}
