package com.arqops.crm.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.ActivityRequest;
import com.arqops.crm.dto.ActivityResponse;
import com.arqops.crm.entity.Activity;
import com.arqops.crm.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final AuditService auditService;

    public List<ActivityResponse> listByEntity(String entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return activityRepository
                .findByTenantIdAndEntityTypeAndEntityIdOrderByDateDesc(tenantId, entityType, entityId)
                .stream()
                .map(ActivityResponse::from)
                .toList();
    }

    @Transactional
    public ActivityResponse create(ActivityRequest request) {
        Instant when = request.date() != null ? request.date() : Instant.now();
        Activity activity = Activity.builder()
                .entityType(request.entityType())
                .entityId(request.entityId())
                .type(request.type())
                .description(request.description())
                .date(when)
                .assignedTo(request.assignedTo())
                .build();
        activity = activityRepository.save(activity);
        auditService.log(
                "Activity",
                activity.getId(),
                "CREATE",
                Map.of(
                        "entityType", activity.getEntityType(),
                        "entityId", activity.getEntityId().toString()));
        return ActivityResponse.from(activity);
    }
}
