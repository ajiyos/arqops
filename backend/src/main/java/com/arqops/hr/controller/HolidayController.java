package com.arqops.hr.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.hr.entity.Holiday;
import com.arqops.hr.service.HolidayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.read')")
    public ResponseEntity<ApiResponse<List<Holiday>>> list(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.list(year)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<Holiday>> create(@RequestBody HolidayRequest request) {
        Holiday h = holidayService.create(request.name(), request.date(), request.type());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(h));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.write')")
    public ResponseEntity<ApiResponse<Holiday>> update(
            @PathVariable UUID id, @RequestBody HolidayRequest request) {
        Holiday h = holidayService.update(id, request.name(), request.date(), request.type());
        return ResponseEntity.ok(ApiResponse.success(h));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('hr.delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        holidayService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    public record HolidayRequest(String name, LocalDate date, String type) {}
}
