package com.arqops.project.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.project.dto.ProjectPhaseTemplateDtos;
import com.arqops.project.dto.ProjectTaskTemplateDtos;
import com.arqops.project.service.ProjectTypePhaseTemplateService;
import com.arqops.project.service.ProjectTypeTaskTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/project/settings")
@RequiredArgsConstructor
public class ProjectSettingsController {

    private final ProjectTypePhaseTemplateService phaseTemplateService;
    private final ProjectTypeTaskTemplateService taskTemplateService;

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @GetMapping("/phase-templates")
    public ResponseEntity<ApiResponse<ProjectPhaseTemplateDtos.OverviewResponse>> listPhaseTemplates() {
        var map = phaseTemplateService.listGroupedByType();
        return ResponseEntity.ok(ApiResponse.success(new ProjectPhaseTemplateDtos.OverviewResponse(map)));
    }

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @PutMapping("/phase-templates/{projectType}")
    public ResponseEntity<ApiResponse<Void>> replacePhaseTemplates(
            @PathVariable String projectType,
            @Valid @RequestBody ProjectPhaseTemplateDtos.ReplaceRequest request) {
        phaseTemplateService.replaceTemplatesForProjectType(projectType, request.phases());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @GetMapping("/task-templates")
    public ResponseEntity<ApiResponse<ProjectTaskTemplateDtos.TaskTemplatesOverviewResponse>> listTaskTemplates() {
        var map = taskTemplateService.listGroupedByType();
        return ResponseEntity.ok(
                ApiResponse.success(new ProjectTaskTemplateDtos.TaskTemplatesOverviewResponse(map)));
    }

    @PreAuthorize("hasRole('TENANT_ADMIN')")
    @PutMapping("/task-templates/{projectType}")
    public ResponseEntity<ApiResponse<Void>> replaceTaskTemplates(
            @PathVariable String projectType,
            @Valid @RequestBody ProjectTaskTemplateDtos.TaskTemplatesReplaceRequest request) {
        taskTemplateService.replaceTaskTemplatesForProjectType(projectType, request.tasks());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
