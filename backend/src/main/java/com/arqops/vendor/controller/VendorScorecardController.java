package com.arqops.vendor.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.vendor.entity.VendorScorecard;
import com.arqops.vendor.service.VendorScorecardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vendor/vendors/{vendorId}/scorecards")
@RequiredArgsConstructor
public class VendorScorecardController {

    private final VendorScorecardService scorecardService;

    @GetMapping
    @PreAuthorize("hasAuthority('vendor.read')")
    public ResponseEntity<ApiResponse<List<VendorScorecard>>> list(@PathVariable UUID vendorId) {
        return ResponseEntity.ok(ApiResponse.success(scorecardService.listByVendor(vendorId)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('vendor.write')")
    public ResponseEntity<ApiResponse<VendorScorecard>> create(
            @PathVariable UUID vendorId,
            @RequestBody ScorecardRequest request) {
        VendorScorecard sc = scorecardService.create(vendorId, request.projectId(),
                request.qualityRating(), request.timelinessRating(),
                request.costRating(), request.notes());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(sc));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('vendor.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID vendorId, @PathVariable UUID id) {
        scorecardService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    public record ScorecardRequest(UUID projectId, Integer qualityRating,
                                    Integer timelinessRating, Integer costRating,
                                    String notes) {}
}
