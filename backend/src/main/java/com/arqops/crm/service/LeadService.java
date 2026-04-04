package com.arqops.crm.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.crm.dto.LeadRequest;
import com.arqops.crm.dto.LeadResponse;
import com.arqops.crm.entity.Client;
import com.arqops.crm.entity.Lead;
import com.arqops.crm.repository.ClientRepository;
import com.arqops.crm.repository.LeadRepository;
import com.arqops.project.dto.ProjectRequest;
import com.arqops.project.repository.ProjectRepository;
import com.arqops.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeadService {

    private final LeadRepository leadRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final AuditService auditService;

    public Page<LeadResponse> list(Pageable pageable, String stage) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Page<Lead> page = (stage != null && !stage.isBlank())
                ? leadRepository.findByTenantIdAndStage(tenantId, stage.trim(), pageable)
                : leadRepository.findByTenantId(tenantId, pageable);
        return page.map(LeadResponse::from);
    }

    public LeadResponse getById(UUID id) {
        return LeadResponse.from(leadOrThrow(id));
    }

    @Transactional
    public LeadResponse create(LeadRequest request) {
        Lead lead = Lead.builder()
                .title(request.title())
                .source(request.source())
                .projectType(request.projectType())
                .estimatedValue(request.estimatedValue())
                .stage(request.stage() != null ? request.stage() : "New")
                .stageId(request.stageId())
                .location(request.location())
                .assignedTo(request.assignedTo())
                .notes(request.notes())
                .build();
        if (request.clientId() != null) {
            Client client = clientRepository.findById(request.clientId())
                    .orElseThrow(() -> AppException.notFound("Client", request.clientId()));
            lead.setClient(client);
        }
        lead = leadRepository.save(lead);
        auditService.log("Lead", lead.getId(), "CREATE", Map.of("title", lead.getTitle()));
        return LeadResponse.from(lead);
    }

    @Transactional
    public LeadResponse update(UUID id, LeadRequest request) {
        Lead lead = leadOrThrow(id);
        lead.setTitle(request.title());
        lead.setSource(request.source());
        lead.setProjectType(request.projectType());
        lead.setEstimatedValue(request.estimatedValue());
        if (request.stage() != null) {
            lead.setStage(request.stage());
        }
        lead.setStageId(request.stageId());
        lead.setLocation(request.location());
        lead.setAssignedTo(request.assignedTo());
        lead.setNotes(request.notes());
        if (request.clientId() != null) {
            Client client = clientRepository.findById(request.clientId())
                    .orElseThrow(() -> AppException.notFound("Client", request.clientId()));
            lead.setClient(client);
        } else {
            lead.setClient(null);
        }
        lead = leadRepository.save(lead);
        auditService.log("Lead", lead.getId(), "UPDATE", Map.of("title", lead.getTitle()));
        return LeadResponse.from(lead);
    }

    /**
     * Creates a project from the lead (copying client, type, location, value), applies default phase/task
     * templates when {@link Lead#getProjectType()} is set, marks the lead as Won. Idempotent if a project
     * already exists for this lead.
     */
    @Transactional
    public LeadResponse convertToProject(UUID id) {
        Lead lead = leadOrThrow(id);
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null && projectRepository.existsByTenantIdAndLeadId(tenantId, id)) {
            lead.setStage("Won");
            lead = leadRepository.save(lead);
            return LeadResponse.from(lead);
        }
        String name = lead.getTitle() != null ? lead.getTitle().trim() : "";
        if (name.isEmpty()) {
            throw AppException.badRequest("Lead title is required to create a project");
        }
        UUID clientId = lead.getClient() != null ? lead.getClient().getId() : null;
        ProjectRequest projectRequest = new ProjectRequest(
                clientId,
                lead.getId(),
                name,
                lead.getProjectType(),
                lead.getLocation(),
                lead.getLocation(),
                null,
                null,
                lead.getEstimatedValue(),
                "active",
                null);
        projectService.create(projectRequest);
        lead.setStage("Won");
        lead = leadRepository.save(lead);
        auditService.log("Lead", lead.getId(), "CONVERT_TO_PROJECT", Map.of("stage", "Won"));
        return LeadResponse.from(lead);
    }

    @Transactional
    public void delete(UUID id) {
        Lead lead = leadOrThrow(id);
        lead.setDeletedAt(Instant.now());
        leadRepository.save(lead);
        auditService.log("Lead", lead.getId(), "DELETE", Map.of("title", lead.getTitle()));
    }

    private Lead leadOrThrow(UUID id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Lead", id));
    }
}
