package com.arqops.crm.dto;

import com.arqops.crm.entity.LeadStage;
import java.util.UUID;

public record LeadStageResponse(UUID id, String name, int displayOrder) {
    public static LeadStageResponse from(LeadStage s) {
        return new LeadStageResponse(s.getId(), s.getName(), s.getDisplayOrder());
    }
}
