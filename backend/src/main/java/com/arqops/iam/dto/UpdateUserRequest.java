package com.arqops.iam.dto;

import java.util.List;

public record UpdateUserRequest(
        String name,
        String status,
        List<String> roleNames
) {}
