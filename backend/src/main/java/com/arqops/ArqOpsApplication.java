package com.arqops;

import com.arqops.common.config.GoogleDriveProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(GoogleDriveProperties.class)
@EnableAsync
@EnableScheduling
public class ArqOpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArqOpsApplication.class, args);
    }
}
