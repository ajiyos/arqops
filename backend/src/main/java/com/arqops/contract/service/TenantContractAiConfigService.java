package com.arqops.contract.service;

import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.contract.dto.TenantContractAiConfigResponse;
import com.arqops.contract.dto.TenantContractAiConfigUpdateRequest;
import com.arqops.contract.entity.TenantContractAiConfig;
import com.arqops.contract.repository.TenantContractAiConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantContractAiConfigService {

    private static final String DEFAULT_MODEL = "gpt-4o-mini";

    private final TenantContractAiConfigRepository configRepository;
    private final EncryptionService encryptionService;

    @Transactional(readOnly = true)
    public TenantContractAiConfigResponse getForTenantAdmin() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return configRepository.findById(tenantId)
                .map(this::toResponse)
                .orElse(new TenantContractAiConfigResponse(
                        null,
                        DEFAULT_MODEL,
                        false,
                        null));
    }

    private TenantContractAiConfigResponse toResponse(TenantContractAiConfig c) {
        String enc = c.getOpenaiApiKeyEncrypted();
        boolean configured = enc != null && !enc.isBlank();
        String last4 = null;
        if (configured) {
            try {
                String plain = encryptionService.decrypt(enc);
                if (plain.length() >= 4) {
                    last4 = plain.substring(plain.length() - 4);
                }
            } catch (Exception ignored) {
                last4 = "????";
            }
        }
        return new TenantContractAiConfigResponse(
                c.getDefaultSystemPrompt(),
                c.getDefaultModel() != null && !c.getDefaultModel().isBlank() ? c.getDefaultModel() : DEFAULT_MODEL,
                configured,
                last4);
    }

    @Transactional
    public TenantContractAiConfigResponse update(TenantContractAiConfigUpdateRequest req) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        TenantContractAiConfig c = configRepository.findById(tenantId)
                .orElseGet(() -> TenantContractAiConfig.builder().tenantId(tenantId).build());

        if (req.openaiApiKey() != null && !req.openaiApiKey().isBlank()) {
            c.setOpenaiApiKeyEncrypted(encryptionService.encrypt(req.openaiApiKey().trim()));
        }
        if (req.defaultSystemPrompt() != null) {
            c.setDefaultSystemPrompt(req.defaultSystemPrompt().isBlank() ? null : req.defaultSystemPrompt());
        }
        if (req.defaultModel() != null && !req.defaultModel().isBlank()) {
            c.setDefaultModel(req.defaultModel().trim());
        } else if (c.getDefaultModel() == null || c.getDefaultModel().isBlank()) {
            c.setDefaultModel(DEFAULT_MODEL);
        }

        configRepository.save(c);
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public TenantContractAiConfig requireConfigWithKey() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        TenantContractAiConfig c = configRepository.findById(tenantId)
                .orElseThrow(() -> AppException.badRequest(
                        "Configure OpenAI API key and prompts under Settings, Contract AI"));
        if (c.getOpenaiApiKeyEncrypted() == null || c.getOpenaiApiKeyEncrypted().isBlank()) {
            throw AppException.badRequest("OpenAI API key is not configured for this workspace");
        }
        return c;
    }

    public String decryptApiKey(TenantContractAiConfig c) {
        return encryptionService.decrypt(c.getOpenaiApiKeyEncrypted());
    }

    public String effectiveSystemPrompt(TenantContractAiConfig c) {
        String p = c.getDefaultSystemPrompt();
        if (p == null || p.isBlank()) {
            return "You are a legal drafting assistant for an architecture firm in India. "
                    + "Produce clear, professional contract text in Markdown. "
                    + "Use placeholders in square brackets for names, dates, and amounts the user must fill in.";
        }
        return p;
    }

    public String effectiveModel(TenantContractAiConfig c) {
        return c.getDefaultModel() != null && !c.getDefaultModel().isBlank() ? c.getDefaultModel() : DEFAULT_MODEL;
    }
}
