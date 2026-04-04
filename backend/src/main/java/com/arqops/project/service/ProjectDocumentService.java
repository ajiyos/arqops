package com.arqops.project.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.storage.FileDownload;
import com.arqops.common.storage.google.GoogleDriveStorageService;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.project.entity.Project;
import com.arqops.project.entity.ProjectDocument;
import com.arqops.project.repository.ProjectDocumentRepository;
import com.arqops.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectDocumentService {

    private final ProjectDocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final GoogleDriveStorageService googleDriveStorageService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ProjectDocument> listByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        return documentRepository.findByTenantIdAndProject_Id(tenantId, projectId);
    }

    @Transactional
    public ProjectDocument create(UUID projectId, String fileName, String folderPath, String storageKey) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            throw AppException.forbidden("A workspace context is required");
        }
        googleDriveStorageService.assertFileInTenantScope(storageKey, tenantId);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));

        ProjectDocument doc = ProjectDocument.builder()
                .project(project)
                .fileName(fileName)
                .folderPath(folderPath)
                .storageKey(storageKey)
                .uploadedBy(getCurrentUserId())
                .build();
        doc.setTenantId(tenantId);
        doc = documentRepository.save(doc);
        auditService.log("ProjectDocument", doc.getId(), "CREATE",
                Map.of("fileName", fileName, "projectId", projectId.toString()));
        return doc;
    }

    @Transactional
    public void delete(UUID id) {
        ProjectDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ProjectDocument", id));
        doc.setDeletedAt(Instant.now());
        documentRepository.save(doc);
        auditService.log("ProjectDocument", doc.getId(), "DELETE", Map.of("fileName", doc.getFileName()));
    }

    @Transactional(readOnly = true)
    public FileDownload openDocumentDownload(UUID projectId, UUID docId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ProjectDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> AppException.notFound("ProjectDocument", docId));
        if (tenantId != null && !tenantId.equals(doc.getTenantId())) {
            throw AppException.forbidden("Access denied");
        }
        if (!doc.getProject().getId().equals(projectId)) {
            throw AppException.forbidden("Document does not belong to this project");
        }
        return googleDriveStorageService.openTenantFileDownload(doc.getStorageKey());
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.userId();
        }
        return null;
    }
}
