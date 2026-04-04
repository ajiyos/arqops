package com.arqops.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.branding")
public class BrandingProperties {

    /**
     * Directory for persisted tenant logo files (created on startup if missing).
     */
    private String logoStorageDir = "./data/tenant-logos";

    /**
     * Base URL clients use to reach this API (for logo URLs stored in DB).
     */
    private String publicApiUrl = "http://localhost:8080";
}
