package com.arqops.contract.repository;

import com.arqops.contract.entity.TenantContractAiConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantContractAiConfigRepository extends JpaRepository<TenantContractAiConfig, UUID> {
}
