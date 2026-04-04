package com.arqops.contract.service;

import com.arqops.common.audit.AuditService;
import com.arqops.common.exception.AppException;
import com.arqops.common.storage.FileDownload;
import com.arqops.common.storage.google.GoogleDriveStorageService;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.contract.dto.*;
import com.arqops.contract.entity.*;
import com.arqops.contract.model.ContractPartyKind;
import com.arqops.contract.model.ContractRevisionSource;
import com.arqops.contract.repository.*;
import com.arqops.crm.entity.Client;
import com.arqops.crm.repository.ClientRepository;
import com.arqops.iam.entity.Tenant;
import com.arqops.iam.repository.TenantRepository;
import com.arqops.project.entity.Project;
import com.arqops.project.repository.ProjectRepository;
import com.arqops.vendor.entity.Vendor;
import com.arqops.vendor.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class ContractService {

    private final ContractRepository contractRepository;
    private final ContractPartyRepository contractPartyRepository;
    private final ContractRevisionRepository contractRevisionRepository;
    private final ContractSignedDocumentRepository signedDocumentRepository;
    private final ContractSendLogRepository sendLogRepository;
    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final VendorRepository vendorRepository;
    private final TenantRepository tenantRepository;
    private final GoogleDriveStorageService googleDriveStorageService;
    private final AuditService auditService;
    private final TenantContractAiConfigService aiConfigService;
    private final OpenAiContractClient openAiContractClient;
    private final ContractEmailService contractEmailService;
    private final ContractSendLogPersistence sendLogPersistence;

    @Transactional(readOnly = true)
    public Page<ContractSummaryResponse> list(UUID projectId, String status, String q, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        String st = status != null && !status.isBlank() ? status : null;
        String qq = q != null && !q.isBlank() ? q.trim() : null;
        Page<Contract> page = contractRepository.search(tenantId, projectId, st, qq, pageable);
        return page.map(c -> new ContractSummaryResponse(
                c.getId(),
                c.getTitle(),
                c.getStatus(),
                c.getProjectId(),
                revNumberOrNull(contractRevisionRepository.maxRevisionNumber(c.getId())),
                c.getCreatedAt(),
                c.getUpdatedAt()));
    }

    private static Integer revNumberOrNull(int max) {
        return max <= 0 ? null : max;
    }

    @Transactional(readOnly = true)
    public ContractDetailResponse getDetail(UUID id) {
        Contract c = loadContract(id);
        return toDetail(c);
    }

    @Transactional
    public ContractDetailResponse create(ContractCreateRequest req, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        validateProject(tenantId, req.projectId());

        Contract c = Contract.builder()
                .title(req.title().trim())
                .projectId(req.projectId())
                .status(req.status() != null && !req.status().isBlank() ? req.status().trim() : "draft")
                .createdBy(userId)
                .build();
        c.setTenantId(tenantId);
        c = contractRepository.save(c);

        if (req.parties() != null && !req.parties().isEmpty()) {
            saveParties(tenantId, c, req.parties());
        }

        ContractRevision rev = ContractRevision.builder()
                .contract(c)
                .revisionNumber(1)
                .body("")
                .source(ContractRevisionSource.MANUAL)
                .createdBy(userId)
                .build();
        rev.setTenantId(tenantId);
        contractRevisionRepository.save(rev);

        auditService.log("Contract", c.getId(), "CREATE", Map.of("title", c.getTitle()));
        return toDetail(loadContract(c.getId()));
    }

    @Transactional
    public ContractDetailResponse update(UUID id, ContractUpdateRequest req) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(id);
        if (req.title() != null && !req.title().isBlank()) {
            c.setTitle(req.title().trim());
        }
        if (req.projectId() != null) {
            validateProject(tenantId, req.projectId());
            c.setProjectId(req.projectId());
        }
        if (req.status() != null && !req.status().isBlank()) {
            c.setStatus(req.status().trim());
        }
        contractRepository.save(c);
        auditService.log("Contract", c.getId(), "UPDATE", Map.of());
        return toDetail(c);
    }

    @Transactional
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(id);
        contractPartyRepository.softDeleteByContractId(c.getId(), tenantId);
        c.setDeletedAt(Instant.now());
        contractRepository.save(c);
        auditService.log("Contract", c.getId(), "DELETE", Map.of());
    }

    @Transactional
    public ContractDetailResponse replaceParties(UUID id, List<ContractPartyRequest> parties) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(id);
        contractPartyRepository.softDeleteByContractId(c.getId(), tenantId);
        if (parties != null && !parties.isEmpty()) {
            saveParties(tenantId, c, parties);
        }
        auditService.log("Contract", c.getId(), "UPDATE", Map.of("field", "parties"));
        return toDetail(loadContract(id));
    }

    @Transactional
    public ContractRevisionResponse addManualRevision(UUID id, ManualRevisionRequest req, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(id);
        int next = contractRevisionRepository.maxRevisionNumber(c.getId()) + 1;
        ContractRevision rev = ContractRevision.builder()
                .contract(c)
                .revisionNumber(next)
                .body(req.body() != null ? req.body() : "")
                .source(ContractRevisionSource.MANUAL)
                .createdBy(userId)
                .build();
        rev.setTenantId(tenantId);
        rev = contractRevisionRepository.save(rev);
        auditService.log("ContractRevision", rev.getId(), "CREATE", Map.of("contractId", id.toString(), "source", "MANUAL"));
        return mapRevision(rev);
    }

    @Transactional
    public ContractRevisionResponse generateRevision(UUID id, GenerateRevisionRequest req, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(id);
        TenantContractAiConfig cfg = aiConfigService.requireConfigWithKey();
        String system = (req.systemPromptOverride() != null && !req.systemPromptOverride().isBlank())
                ? req.systemPromptOverride().trim()
                : aiConfigService.effectiveSystemPrompt(cfg);
        String userMsg = buildGenerationUserMessage(c, req.userInstructions());
        String apiKey = aiConfigService.decryptApiKey(cfg);
        String model = aiConfigService.effectiveModel(cfg);
        String body = openAiContractClient.chatCompletion(apiKey, model, system, userMsg);

        int next = contractRevisionRepository.maxRevisionNumber(c.getId()) + 1;
        ContractRevision rev = ContractRevision.builder()
                .contract(c)
                .revisionNumber(next)
                .body(body)
                .source(ContractRevisionSource.LLM)
                .userPrompt(req.userInstructions())
                .model(model)
                .systemPromptSnapshot(system)
                .createdBy(userId)
                .build();
        rev.setTenantId(tenantId);
        rev = contractRevisionRepository.save(rev);
        auditService.log("ContractRevision", rev.getId(), "CREATE", Map.of("contractId", id.toString(), "source", "LLM"));
        return mapRevision(rev);
    }

    @Transactional(readOnly = true)
    public byte[] exportRevision(UUID contractId, UUID revisionId, String format) {
        loadContract(contractId);
        ContractRevision rev = contractRevisionRepository.findById(revisionId)
                .orElseThrow(() -> AppException.notFound("ContractRevision", revisionId));
        if (!rev.getContract().getId().equals(contractId) || rev.getDeletedAt() != null) {
            throw AppException.notFound("ContractRevision", revisionId);
        }
        assertTenant(rev.getTenantId());
        String body = rev.getBody() != null ? rev.getBody() : "";
        if ("txt".equalsIgnoreCase(format)) {
            return body.getBytes(StandardCharsets.UTF_8);
        }
        String md = "# " + rev.getContract().getTitle() + " (revision " + rev.getRevisionNumber() + ")\n\n" + body;
        return md.getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public void sendToParties(UUID contractId, SendContractRequest req, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(contractId);
        ContractRevision rev = contractRevisionRepository.findById(req.revisionId())
                .orElseThrow(() -> AppException.notFound("ContractRevision", req.revisionId()));
        if (!rev.getContract().getId().equals(contractId) || rev.getDeletedAt() != null) {
            throw AppException.badRequest("Revision does not belong to this contract");
        }

        List<String> emails = new ArrayList<>();
        if (req.recipientEmails() != null && !req.recipientEmails().isEmpty()) {
            emails.addAll(req.recipientEmails().stream().filter(e -> e != null && !e.isBlank()).map(String::trim).toList());
        } else {
            for (ContractParty p : contractPartyRepository.findByContract_IdOrderByCreatedAtAsc(contractId)) {
                if (p.getContactEmail() != null && !p.getContactEmail().isBlank()) {
                    emails.add(p.getContactEmail().trim());
                }
            }
        }
        if (emails.isEmpty()) {
            throw AppException.badRequest("No recipient emails: add contact emails to parties or pass recipientEmails");
        }

        byte[] attachment = exportRevision(contractId, req.revisionId(), "md");
        String subj = req.subject() != null && !req.subject().isBlank()
                ? req.subject()
                : "Contract: " + c.getTitle();
        String text = req.message() != null ? req.message() : "Please find the contract draft attached.";

        ContractSendLog logEntry = ContractSendLog.builder()
                .contract(contractRepository.getReferenceById(contractId))
                .revision(contractRevisionRepository.getReferenceById(req.revisionId()))
                .subject(subj)
                .recipientEmails(String.join(", ", emails))
                .status("pending")
                .sentBy(userId)
                .build();
        logEntry.setTenantId(tenantId);
        UUID logId = sendLogPersistence.saveNew(logEntry);

        try {
            contractEmailService.sendWithAttachment(
                    emails,
                    subj,
                    text,
                    sanitizeFileName(c.getTitle()) + "-rev" + rev.getRevisionNumber() + ".md",
                    attachment,
                    "text/markdown;charset=UTF-8");
            sendLogPersistence.updateStatus(logId, "sent", null);
        } catch (AppException e) {
            sendLogPersistence.updateStatus(logId, "failed", e.getMessage());
            throw e;
        }
        auditService.log("Contract", contractId, "SEND", Map.of("revisionId", req.revisionId().toString()));
    }

    private static String sanitizeFileName(String title) {
        String s = title.replaceAll("[^a-zA-Z0-9._-]+", "_");
        return s.isBlank() ? "contract" : s.substring(0, Math.min(s.length(), 80));
    }

    @Transactional(readOnly = true)
    public List<ContractSignedDocumentResponse> listSignedDocuments(UUID contractId) {
        loadContract(contractId);
        return signedDocumentRepository.findByContract_IdOrderByUploadedAtDesc(contractId).stream()
                .map(this::mapSigned)
                .toList();
    }

    @Transactional
    public ContractSignedDocumentResponse uploadSigned(UUID contractId, UUID revisionId, MultipartFile file, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = loadContract(contractId);
        ContractRevision rev = null;
        if (revisionId != null) {
            rev = contractRevisionRepository.findById(revisionId).orElseThrow(() -> AppException.notFound("ContractRevision", revisionId));
            if (!rev.getContract().getId().equals(contractId) || rev.getDeletedAt() != null) {
                throw AppException.badRequest("Revision does not belong to this contract");
            }
        }
        String folder = "Contracts/" + contractId;
        String storageKey = googleDriveStorageService.uploadMultipartToGoogleDrive(file, folder);
        googleDriveStorageService.assertFileInTenantScope(storageKey, tenantId);

        ContractSignedDocument doc = ContractSignedDocument.builder()
                .contract(c)
                .revision(rev)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "signed.pdf")
                .storageKey(storageKey)
                .uploadedBy(userId)
                .uploadedAt(Instant.now())
                .build();
        doc.setTenantId(tenantId);
        doc = signedDocumentRepository.save(doc);
        auditService.log("ContractSignedDocument", doc.getId(), "CREATE", Map.of("contractId", contractId.toString()));
        return mapSigned(doc);
    }

    @Transactional(readOnly = true)
    public FileDownload downloadSigned(UUID contractId, UUID docId) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        ContractSignedDocument doc = signedDocumentRepository.findByIdAndContract_IdAndTenantId(docId, contractId, tenantId)
                .orElseThrow(() -> AppException.notFound("ContractSignedDocument", docId));
        return googleDriveStorageService.openTenantFileDownload(doc.getStorageKey());
    }

    private Contract loadContract(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Contract c = contractRepository.findById(id).orElseThrow(() -> AppException.notFound("Contract", id));
        if (!c.getTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }
        return c;
    }

    private void assertTenant(UUID tenantId) {
        if (!TenantContext.getCurrentTenantId().equals(tenantId)) {
            throw AppException.forbidden("Access denied");
        }
    }

    private void validateProject(UUID tenantId, UUID projectId) {
        if (projectId == null) {
            return;
        }
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> AppException.notFound("Project", projectId));
        if (!p.getTenantId().equals(tenantId)) {
            throw AppException.badRequest("Project is not in this workspace");
        }
    }

    private void saveParties(UUID tenantId, Contract c, List<ContractPartyRequest> parties) {
        for (ContractPartyRequest pr : parties) {
            validateParty(tenantId, pr);
            ContractParty p = ContractParty.builder()
                    .contract(c)
                    .partyKind(pr.partyKind())
                    .clientId(pr.clientId())
                    .vendorId(pr.vendorId())
                    .displayName(pr.displayName())
                    .contactEmail(pr.contactEmail())
                    .build();
            p.setTenantId(tenantId);
            contractPartyRepository.save(p);
        }
    }

    private void validateParty(UUID tenantId, ContractPartyRequest pr) {
        switch (pr.partyKind()) {
            case FIRM -> {
                if (pr.clientId() != null || pr.vendorId() != null) {
                    throw AppException.badRequest("FIRM party must not include client or vendor id");
                }
            }
            case CLIENT -> {
                if (pr.clientId() == null) {
                    throw AppException.badRequest("CLIENT party requires clientId");
                }
                Client cl = clientRepository.findById(pr.clientId())
                        .orElseThrow(() -> AppException.notFound("Client", pr.clientId()));
                if (!cl.getTenantId().equals(tenantId)) {
                    throw AppException.badRequest("Client is not in this workspace");
                }
            }
            case VENDOR -> {
                if (pr.vendorId() == null) {
                    throw AppException.badRequest("VENDOR party requires vendorId");
                }
                Vendor v = vendorRepository.findById(pr.vendorId())
                        .orElseThrow(() -> AppException.notFound("Vendor", pr.vendorId()));
                if (!v.getTenantId().equals(tenantId)) {
                    throw AppException.badRequest("Vendor is not in this workspace");
                }
            }
        }
    }

    private ContractDetailResponse toDetail(Contract c) {
        UUID id = c.getId();
        List<ContractPartyResponse> parties = contractPartyRepository.findByContract_IdOrderByCreatedAtAsc(id).stream()
                .map(this::mapParty)
                .toList();
        List<ContractRevisionResponse> revs = contractRevisionRepository
                .findByContract_IdAndDeletedAtIsNullOrderByRevisionNumberDesc(id).stream()
                .map(this::mapRevision)
                .toList();
        List<ContractSignedDocumentResponse> signed = signedDocumentRepository.findByContract_IdOrderByUploadedAtDesc(id).stream()
                .map(this::mapSigned)
                .toList();
        List<ContractSendLogResponse> logs = sendLogRepository.findByContract_IdOrderByCreatedAtDesc(id).stream()
                .map(this::mapSendLog)
                .toList();
        return new ContractDetailResponse(
                c.getId(),
                c.getTitle(),
                c.getStatus(),
                c.getProjectId(),
                c.getCreatedBy(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                parties,
                revs,
                signed,
                logs);
    }

    private ContractPartyResponse mapParty(ContractParty p) {
        return new ContractPartyResponse(
                p.getId(),
                p.getPartyKind(),
                p.getClientId(),
                p.getVendorId(),
                p.getDisplayName(),
                p.getContactEmail());
    }

    private ContractRevisionResponse mapRevision(ContractRevision r) {
        return new ContractRevisionResponse(
                r.getId(),
                r.getRevisionNumber(),
                r.getBody(),
                r.getSource(),
                r.getUserPrompt(),
                r.getModel(),
                r.getSystemPromptSnapshot(),
                r.getCreatedBy(),
                r.getCreatedAt());
    }

    private ContractSignedDocumentResponse mapSigned(ContractSignedDocument d) {
        return new ContractSignedDocumentResponse(
                d.getId(),
                d.getRevision() != null ? d.getRevision().getId() : null,
                d.getFileName(),
                d.getStorageKey(),
                d.getUploadedBy(),
                d.getUploadedAt());
    }

    private ContractSendLogResponse mapSendLog(ContractSendLog l) {
        return new ContractSendLogResponse(
                l.getId(),
                l.getRevision() != null ? l.getRevision().getId() : null,
                l.getSubject(),
                l.getRecipientEmails(),
                l.getStatus(),
                l.getErrorMessage(),
                l.getSentBy(),
                l.getCreatedAt());
    }

    private String buildGenerationUserMessage(Contract c, String userInstructions) {
        UUID tenantId = c.getTenantId();
        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        String firmName = tenant != null ? tenant.getName() : "the firm";

        StringBuilder sb = new StringBuilder();
        sb.append("Draft or revise a contract for the following matter.\n\n");
        sb.append("Firm (tenant): ").append(firmName).append("\n");
        sb.append("Contract title: ").append(c.getTitle()).append("\n");
        sb.append("Status: ").append(c.getStatus()).append("\n");
        if (c.getProjectId() != null) {
            projectRepository.findById(c.getProjectId()).ifPresent(p ->
                    sb.append("Project: ").append(p.getName()).append("\n"));
        }
        sb.append("\nParties:\n");
        for (ContractParty p : contractPartyRepository.findByContract_IdOrderByCreatedAtAsc(c.getId())) {
            sb.append("- ").append(p.getPartyKind());
            if (p.getDisplayName() != null && !p.getDisplayName().isBlank()) {
                sb.append(" (").append(p.getDisplayName()).append(")");
            }
            if (p.getPartyKind() == ContractPartyKind.CLIENT && p.getClientId() != null) {
                clientRepository.findById(p.getClientId()).ifPresent(cl -> sb.append(": ").append(cl.getName()));
            }
            if (p.getPartyKind() == ContractPartyKind.VENDOR && p.getVendorId() != null) {
                vendorRepository.findById(p.getVendorId()).ifPresent(v -> sb.append(": ").append(v.getName()));
            }
            if (p.getContactEmail() != null && !p.getContactEmail().isBlank()) {
                sb.append(" email:").append(p.getContactEmail());
            }
            sb.append("\n");
        }
        int lastRev = contractRevisionRepository.maxRevisionNumber(c.getId());
        if (lastRev > 0) {
            List<ContractRevision> revs = contractRevisionRepository
                    .findByContract_IdAndDeletedAtIsNullOrderByRevisionNumberDesc(c.getId());
            String latestBody = revs.isEmpty() ? "" : revs.get(0).getBody();
            sb.append("\nCurrent latest draft (Markdown):\n---\n").append(latestBody).append("\n---\n");
        }
        if (userInstructions != null && !userInstructions.isBlank()) {
            sb.append("\nAdditional instructions from the user:\n").append(userInstructions.trim()).append("\n");
        }
        return sb.toString();
    }
}
