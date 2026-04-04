package com.arqops.common.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class FlywayConfig {

    /**
     * When {@code FLYWAY_REPAIR=true}, runs {@link Flyway#repair()} before migrate so
     * {@code flyway_schema_history} checksums match the current migration files (e.g. after
     * comment-only edits). Remove the flag after a successful start.
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy(Environment env) {
        return flyway -> {
            if (Boolean.parseBoolean(env.getProperty("FLYWAY_REPAIR", "false"))) {
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
