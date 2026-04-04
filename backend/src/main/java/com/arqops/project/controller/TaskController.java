package com.arqops.project.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.project.dto.TaskRequest;
import com.arqops.project.dto.TaskResponse;
import com.arqops.project.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/project/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(taskService.get(id)));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        taskService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.update(id, request)));
    }
}
