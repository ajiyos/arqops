package com.arqops.project.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.storage.FileDownload;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.dto.ProjectBudgetResponse;
import com.arqops.project.dto.ProjectRequest;
import com.arqops.project.dto.ProjectResponse;
import com.arqops.project.dto.TaskRequest;
import com.arqops.project.dto.TaskResponse;
import com.arqops.project.entity.ProjectBudgetLine;
import com.arqops.project.entity.ProjectDocument;
import com.arqops.project.entity.ResourceAssignment;
import com.arqops.project.entity.Task;
import com.arqops.project.entity.TaskComment;
import com.arqops.project.repository.TaskCommentRepository;
import com.arqops.project.service.BudgetLineService;
import com.arqops.project.service.ProjectDocumentService;
import com.arqops.project.service.ProjectService;
import com.arqops.project.service.ResourceAssignmentService;
import com.arqops.project.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/project/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final TaskService taskService;
    private final ProjectDocumentService projectDocumentService;
    private final ResourceAssignmentService resourceAssignmentService;
    private final BudgetLineService budgetLineService;
    private final TaskCommentRepository taskCommentRepository;

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> list(
            Pageable pageable,
            @RequestParam(required = false) String q) {
        Page<ProjectResponse> page = projectService.list(pageable, q);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getById(id)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(@Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(projectService.create(request)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success(projectService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> listTasks(
            @PathVariable UUID id, Pageable pageable) {
        Page<TaskResponse> page = taskService.listByProject(id, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/{id}/tasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(taskService.create(id, request)));
    }

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}/budget")
    public ResponseEntity<ApiResponse<ProjectBudgetResponse>> getBudget(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getBudget(id)));
    }

    // Documents
    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}/documents")
    public ResponseEntity<ApiResponse<List<ProjectDocument>>> listDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(projectDocumentService.listByProject(id)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/{id}/documents")
    public ResponseEntity<ApiResponse<ProjectDocument>> createDocument(
            @PathVariable UUID id, @RequestBody DocumentRequest request) {
        ProjectDocument doc = projectDocumentService.create(id, request.fileName(),
                request.folderPath(), request.storageKey());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(doc));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/{projectId}/documents/{docId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable UUID projectId, @PathVariable UUID docId) {
        projectDocumentService.delete(docId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{projectId}/documents/{docId}/download")
    public ResponseEntity<StreamingResponseBody> downloadDocument(
            @PathVariable UUID projectId, @PathVariable UUID docId) {
        FileDownload fd = projectDocumentService.openDocumentDownload(projectId, docId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fd.fileName(), StandardCharsets.UTF_8)
                .build();
        StreamingResponseBody body = outputStream -> {
            try (fd) {
                fd.inputStream().transferTo(outputStream);
            }
        };
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(fd.contentType()))
                .body(body);
    }

    // Resources
    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}/resources")
    public ResponseEntity<ApiResponse<List<ResourceAssignment>>> listResources(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(resourceAssignmentService.listByProject(id)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/{id}/resources")
    public ResponseEntity<ApiResponse<ResourceAssignment>> createResource(
            @PathVariable UUID id, @RequestBody ResourceRequest request) {
        ResourceAssignment ra = resourceAssignmentService.create(id, request.userId(),
                request.role(), request.startDate(), request.endDate());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(ra));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/{projectId}/resources/{resId}")
    public ResponseEntity<ApiResponse<ResourceAssignment>> updateResource(
            @PathVariable UUID projectId, @PathVariable UUID resId,
            @RequestBody ResourceRequest request) {
        ResourceAssignment ra = resourceAssignmentService.update(resId,
                request.role(), request.startDate(), request.endDate());
        return ResponseEntity.ok(ApiResponse.success(ra));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/{projectId}/resources/{resId}")
    public ResponseEntity<ApiResponse<Void>> deleteResource(
            @PathVariable UUID projectId, @PathVariable UUID resId) {
        resourceAssignmentService.delete(resId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Budget Lines
    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/{id}/budget-lines")
    public ResponseEntity<ApiResponse<List<ProjectBudgetLine>>> listBudgetLines(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(budgetLineService.listByProject(id)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/{id}/budget-lines")
    public ResponseEntity<ApiResponse<ProjectBudgetLine>> createBudgetLine(
            @PathVariable UUID id, @RequestBody BudgetLineRequest request) {
        ProjectBudgetLine line = budgetLineService.create(id, request.category(),
                request.budgetedAmount(), request.actualAmount());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(line));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PutMapping("/{projectId}/budget-lines/{lineId}")
    public ResponseEntity<ApiResponse<ProjectBudgetLine>> updateBudgetLine(
            @PathVariable UUID projectId, @PathVariable UUID lineId,
            @RequestBody BudgetLineRequest request) {
        ProjectBudgetLine line = budgetLineService.update(lineId, request.category(),
                request.budgetedAmount(), request.actualAmount());
        return ResponseEntity.ok(ApiResponse.success(line));
    }

    @PreAuthorize("hasAuthority('project.delete')")
    @DeleteMapping("/{projectId}/budget-lines/{lineId}")
    public ResponseEntity<ApiResponse<Void>> deleteBudgetLine(
            @PathVariable UUID projectId, @PathVariable UUID lineId) {
        budgetLineService.delete(lineId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Task Comments
    @PreAuthorize("hasAuthority('project.read')")
    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<List<TaskComment>>> listComments(@PathVariable UUID taskId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return ResponseEntity.ok(ApiResponse.success(
                taskCommentRepository.findByTenantIdAndTask_IdOrderByCreatedAtDesc(tenantId, taskId)));
    }

    @PreAuthorize("hasAuthority('project.write')")
    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<TaskComment>> addComment(
            @PathVariable UUID taskId, @RequestBody CommentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Task task = taskService.getTask(taskId);
        TaskComment comment = TaskComment.builder()
                .task(task)
                .authorId(request.authorId())
                .content(request.content())
                .build();
        comment.setTenantId(tenantId);
        comment = taskCommentRepository.save(comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(comment));
    }

    public record DocumentRequest(String fileName, String folderPath, String storageKey) {}

    public record ResourceRequest(UUID userId, String role, LocalDate startDate, LocalDate endDate) {}

    public record BudgetLineRequest(String category, BigDecimal budgetedAmount, BigDecimal actualAmount) {}

    public record CommentRequest(UUID authorId, String content) {}
}
