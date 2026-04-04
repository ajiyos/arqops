package com.arqops.contract.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.common.security.UserPrincipal;
import com.arqops.common.storage.FileDownload;
import com.arqops.contract.dto.*;
import com.arqops.contract.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    @PreAuthorize("hasAuthority('contract.read')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ContractSummaryResponse>>> list(
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ContractSummaryResponse> page = contractService.list(projectId, status, q, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(),
                new ApiResponse.PageMeta(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages())));
    }

    @PreAuthorize("hasAuthority('contract.read')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractDetailResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(contractService.getDetail(id)));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PostMapping
    public ResponseEntity<ApiResponse<ContractDetailResponse>> create(
            @Valid @RequestBody ContractCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contractService.create(request, principal.userId())));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractDetailResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ContractUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(contractService.update(id, request)));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        contractService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PutMapping("/{id}/parties")
    public ResponseEntity<ApiResponse<ContractDetailResponse>> replaceParties(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) List<ContractPartyRequest> parties) {
        return ResponseEntity.ok(ApiResponse.success(contractService.replaceParties(id,
                parties != null ? parties : List.of())));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PostMapping("/{id}/revisions")
    public ResponseEntity<ApiResponse<ContractRevisionResponse>> addRevision(
            @PathVariable UUID id,
            @Valid @RequestBody ManualRevisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contractService.addManualRevision(id, request, principal.userId())));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PostMapping("/{id}/revisions/generate")
    public ResponseEntity<ApiResponse<ContractRevisionResponse>> generateRevision(
            @PathVariable UUID id,
            @RequestBody GenerateRevisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contractService.generateRevision(id,
                        request != null ? request : new GenerateRevisionRequest(null, null),
                        principal.userId())));
    }

    @PreAuthorize("hasAuthority('contract.read')")
    @GetMapping("/{contractId}/revisions/{revisionId}/export")
    public ResponseEntity<byte[]> exportRevision(
            @PathVariable UUID contractId,
            @PathVariable UUID revisionId,
            @RequestParam(defaultValue = "md") String format) {
        byte[] bytes = contractService.exportRevision(contractId, revisionId, format);
        String ext = "txt".equalsIgnoreCase(format) ? "txt" : "md";
        String mime = "txt".equalsIgnoreCase(format) ? MediaType.TEXT_PLAIN_VALUE : "text/markdown";
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("contract-" + revisionId + "." + ext, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(mime + ";charset=UTF-8"))
                .body(bytes);
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PostMapping("/{id}/send")
    public ResponseEntity<ApiResponse<Void>> send(
            @PathVariable UUID id,
            @Valid @RequestBody SendContractRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        contractService.sendToParties(id, request, principal.userId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PreAuthorize("hasAuthority('contract.read')")
    @GetMapping("/{id}/signed")
    public ResponseEntity<ApiResponse<List<ContractSignedDocumentResponse>>> listSigned(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(contractService.listSignedDocuments(id)));
    }

    @PreAuthorize("hasAuthority('contract.write')")
    @PostMapping(value = "/{id}/signed", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ContractSignedDocumentResponse>> uploadSigned(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) UUID revisionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(contractService.uploadSigned(id, revisionId, file, principal.userId())));
    }

    @PreAuthorize("hasAuthority('contract.read')")
    @GetMapping("/{contractId}/signed/{docId}/download")
    public ResponseEntity<StreamingResponseBody> downloadSigned(
            @PathVariable UUID contractId,
            @PathVariable UUID docId) {
        FileDownload fd = contractService.downloadSigned(contractId, docId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fd.fileName(), StandardCharsets.UTF_8)
                .build();
        StreamingResponseBody body = outputStream -> {
            try (fd) {
                fd.inputStream().transferTo(outputStream);
            }
        };
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(fd.contentType()))
                .body(body);
    }
}
