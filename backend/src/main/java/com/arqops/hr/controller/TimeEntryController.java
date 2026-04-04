package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.dto.TimeEntryDtos;
import com.arqops.hr.service.TimeEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/time-entries")
@RequiredArgsConstructor
public class TimeEntryController {

    private final TimeEntryService timeEntryService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<TimeEntryDtos.EntryResponse>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID employeeId) {
        return ResponseEntity.ok(ApiResponse.success(timeEntryService.list(from, to, employeeId)));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<List<TimeEntryDtos.EntryResponse>>> sync(
            @Valid @RequestBody TimeEntryDtos.SyncRequest request) {
        return ResponseEntity.ok(ApiResponse.success(timeEntryService.sync(request)));
    }
}
