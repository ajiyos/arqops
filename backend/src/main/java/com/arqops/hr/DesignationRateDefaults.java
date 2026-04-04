package com.arqops.hr;

import java.math.BigDecimal;
import java.util.List;

public final class DesignationRateDefaults {

    private DesignationRateDefaults() {}

    public record SeedRow(String designation, BigDecimal hourlyRate, int displayOrder) {}

    /** Matches Flyway V27 seed for empty tenants. */
    public static final List<SeedRow> SEED_ROWS = List.of(
            new SeedRow("General", new BigDecimal("0"), 0),
            new SeedRow("Architect", new BigDecimal("2500"), 1),
            new SeedRow("Engineer", new BigDecimal("1800"), 2),
            new SeedRow("Site Supervisor", new BigDecimal("1200"), 3),
            new SeedRow("Admin", new BigDecimal("800"), 4));
}
