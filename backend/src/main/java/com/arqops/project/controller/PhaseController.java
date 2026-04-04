package com.arqops.project.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.project.dto.MilestoneRequest;
import com.arqops.project.dto.PhaseRequest;
import com.arqops.project.dto.ProjectResponse;
import com.arqops.project.service.PhaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/project")
@RequiredArgsConstructor
public class PhaseController {

    private final PhaseService phaseService;

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/projects/{projectId}/phases")
    public ResponseEntity<ApiResponse<ProjectResponse.PhaseResponse>> createPhase(
            @PathVariable UUID projectId,
            @Valid @RequestBody PhaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(phaseService.createPhase(projectId, request)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/phases/{phaseId}")
    public ResponseEntity<ApiResponse<ProjectResponse.PhaseResponse>> updatePhase(
            @PathVariable UUID phaseId,
            @Valid @RequestBody PhaseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(phaseService.updatePhase(phaseId, request)));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/phases/{phaseId}")
    public ResponseEntity<ApiResponse<Void>> deletePhase(@PathVariable UUID phaseId) {
        phaseService.deletePhase(phaseId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/phases/{phaseId}/milestones")
    public ResponseEntity<ApiResponse<ProjectResponse.MilestoneResponse>> createMilestone(
            @PathVariable UUID phaseId,
            @Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(phaseService.createMilestone(phaseId, request)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/milestones/{milestoneId}")
    public ResponseEntity<ApiResponse<ProjectResponse.MilestoneResponse>> updateMilestone(
            @PathVariable UUID milestoneId,
            @Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success(phaseService.updateMilestone(milestoneId, request)));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/milestones/{milestoneId}")
    public ResponseEntity<ApiResponse<Void>> deleteMilestone(@PathVariable UUID milestoneId) {
        phaseService.deleteMilestone(milestoneId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
