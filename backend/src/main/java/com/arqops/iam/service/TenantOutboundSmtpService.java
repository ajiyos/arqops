package com.arqops.iam.service;

import com.arqops.common.encryption.EncryptionService;
import com.arqops.common.exception.AppException;
import com.arqops.common.tenancy.TenantContext;
import com.arqops.iam.dto.TenantOutboundSmtpResponse;
import com.arqops.iam.dto.TenantOutboundSmtpUpdateRequest;
import com.arqops.iam.entity.TenantOutboundSmtp;
import com.arqops.iam.repository.TenantOutboundSmtpRepository;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantOutboundSmtpService {

    private final TenantOutboundSmtpRepository repository;
    private final EncryptionService encryptionService;

    @Transactional(readOnly = true)
    public TenantOutboundSmtpResponse getForTenantAdmin() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        return repository.findById(tenantId)
                .map(this::toResponse)
                .orElse(new TenantOutboundSmtpResponse("", 587, "", "", true, false, false));
    }

    private TenantOutboundSmtpResponse toResponse(TenantOutboundSmtp c) {
        boolean pwd = c.getSmtpPasswordEncrypted() != null && !c.getSmtpPasswordEncrypted().isBlank();
        return new TenantOutboundSmtpResponse(
                c.getSmtpHost(),
                c.getSmtpPort(),
                c.getSmtpUsername(),
                c.getFromEmail(),
                c.isStarttlsEnabled(),
                c.isSmtpSsl(),
                pwd);
    }

    @Transactional
    public TenantOutboundSmtpResponse update(TenantOutboundSmtpUpdateRequest req) {
        UUID tenantId = TenantContext.getCurrentTenantId();
        TenantOutboundSmtp c = repository.findById(tenantId).orElseGet(() -> {
            TenantOutboundSmtp n = new TenantOutboundSmtp();
            n.setTenantId(tenantId);
            n.setSmtpPort(587);
            n.setStarttlsEnabled(true);
            n.setSmtpSsl(false);
            n.setSmtpHost("");
            n.setSmtpUsername("");
            n.setFromEmail("");
            return n;
        });

        if (req.smtpHost() != null) {
            if (req.smtpHost().isBlank()) {
                throw AppException.badRequest("smtpHost cannot be blank");
            }
            c.setSmtpHost(req.smtpHost().trim());
        }
        if (req.smtpPort() != null) {
            int p = req.smtpPort();
            if (p < 1 || p > 65535) {
                throw AppException.badRequest("smtpPort must be between 1 and 65535");
            }
            c.setSmtpPort(p);
        }
        if (req.smtpUsername() != null) {
            if (req.smtpUsername().isBlank()) {
                throw AppException.badRequest("smtpUsername cannot be blank");
            }
            c.setSmtpUsername(req.smtpUsername().trim());
        }
        if (req.fromEmail() != null) {
            if (req.fromEmail().isBlank()) {
                throw AppException.badRequest("fromEmail cannot be blank");
            }
            c.setFromEmail(req.fromEmail().trim());
        }
        if (req.starttlsEnabled() != null) {
            c.setStarttlsEnabled(req.starttlsEnabled());
        }
        if (req.smtpSsl() != null) {
            c.setSmtpSsl(req.smtpSsl());
        }
        if (req.smtpPassword() != null && !req.smtpPassword().isBlank()) {
            c.setSmtpPasswordEncrypted(encryptionService.encrypt(req.smtpPassword().trim()));
        }

        if (c.getSmtpHost().isBlank() || c.getSmtpUsername().isBlank() || c.getFromEmail().isBlank()) {
            throw AppException.badRequest("smtpHost, smtpUsername, and fromEmail are required");
        }
        if (c.getSmtpPasswordEncrypted() == null || c.getSmtpPasswordEncrypted().isBlank()) {
            throw AppException.badRequest("smtpPassword is required (enter your SMTP password or API key)");
        }

        repository.save(c);
        return toResponse(c);
    }

    /**
     * Sends mail using this tenant's stored SMTP credentials (password encrypted at rest).
     */
    public void sendWithAttachment(
            UUID tenantId,
            List<String> toEmails,
            String subject,
            String textBody,
            String attachmentName,
            byte[] attachmentBytes,
            String mimeType) {
        if (toEmails == null || toEmails.stream().allMatch(e -> e == null || e.isBlank())) {
            throw AppException.badRequest("At least one recipient email is required");
        }
        TenantOutboundSmtp cfg = repository.findById(tenantId)
                .orElseThrow(() -> AppException.badRequest(
                        "Outbound email is not configured. A tenant admin must set SMTP under Settings → Outbound email."));
        if (cfg.getSmtpPasswordEncrypted() == null || cfg.getSmtpPasswordEncrypted().isBlank()) {
            throw AppException.badRequest("Outbound email password is not configured for this workspace");
        }

        String password = encryptionService.decrypt(cfg.getSmtpPasswordEncrypted());
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(cfg.getSmtpHost());
        mailSender.setPort(cfg.getSmtpPort());
        mailSender.setUsername(cfg.getSmtpUsername());
        mailSender.setPassword(password);

        Properties props = new Properties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        if (cfg.isSmtpSsl()) {
            props.put("mail.smtp.ssl.enable", "true");
        } else if (cfg.isStarttlsEnabled()) {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        mailSender.setJavaMailProperties(props);

        String from = cfg.getFromEmail();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(toEmails.stream().filter(e -> e != null && !e.isBlank()).distinct().toArray(String[]::new));
            helper.setSubject(subject != null && !subject.isBlank() ? subject : "Message");
            helper.setText(textBody != null ? textBody : "", false);
            helper.addAttachment(attachmentName, new ByteArrayDataSource(attachmentBytes, mimeType));
            mailSender.send(message);
        } catch (Exception e) {
            throw AppException.badRequest("Failed to send email: " + e.getMessage());
        }
    }
}
