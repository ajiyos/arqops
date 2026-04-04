package com.arqops.iam.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateUserRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String password,
        List<String> roleNames
) {}
