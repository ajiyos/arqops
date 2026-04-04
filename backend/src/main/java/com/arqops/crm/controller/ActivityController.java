package com.arqops.crm.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.crm.dto.ActivityRequest;
import com.arqops.crm.dto.ActivityResponse;
import com.arqops.crm.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PreAuthorize("hasAuthority('crm.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> list(
            @RequestParam String entityType,
            @RequestParam UUID entityId) {
        return ResponseEntity.ok(ApiResponse.success(
                activityService.listByEntity(entityType, entityId)));
    }

    @PreAuthorize("hasAuthority('crm.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<ActivityResponse>> create(
            @Valid @RequestBody ActivityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(activityService.create(request)));
    }
}
