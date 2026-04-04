package com.arqops.iam.controller;

import com.arqops.common.dto.ApiResponse;
import com.arqops.iam.dto.LoginRequest;
import com.arqops.iam.dto.PlatformAuthResponse;
import com.arqops.iam.dto.RefreshTokenRequest;
import com.arqops.iam.service.PlatformAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/platform/auth")
@RequiredArgsConstructor
public class PlatformAuthController {

    private final PlatformAuthService platformAuthService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<PlatformAuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(platformAuthService.login(request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<PlatformAuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success(platformAuthService.refresh(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshTokenRequest request) {
        platformAuthService.logout(request.refreshToken());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
