package com.arqops.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private T data;
    private ErrorDetail error;
    private PageMeta meta;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder().data(data).build();
    }

    public static <T> ApiResponse<T> success(T data, PageMeta meta) {
        return ApiResponse.<T>builder().data(data).meta(meta).build();
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return ApiResponse.<T>builder()
                .error(new ErrorDetail(code, message, null))
                .build();
    }

    public static <T> ApiResponse<T> error(String code, String message, T details) {
        return ApiResponse.<T>builder()
                .error(new ErrorDetail(code, message, details))
                .build();
    }

    public record ErrorDetail(String code, String message, Object details) {}

    public record PageMeta(int page, int size, long totalElements, int totalPages) {}
}
