package com.arqops.common.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UploadSessionRequest(
        @NotBlank @Size(max = 500) String fileName,
        @Size(max = 200) String mimeType,
        @Size(max = 500) String folderPath
) {}
