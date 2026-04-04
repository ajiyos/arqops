package com.arqops.report.dto;

import java.util.Map;

public record ReportRow(String label, Map<String, Object> data) {
}
