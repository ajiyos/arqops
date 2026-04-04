package com.arqops.crm.repository;

import com.arqops.crm.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    List<Activity> findByTenantIdAndEntityTypeAndEntityIdOrderByDateDesc(
            UUID tenantId, String entityType, UUID entityId);
}
