package com.arqops.contract.service;

import com.arqops.common.exception.AppException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractEmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.username:}")
    private String fromUsername;

    public void sendWithAttachment(List<String> toEmails, String subject, String textBody,
                                   String attachmentName, byte[] attachmentBytes, String mimeType) {
        if (toEmails == null || toEmails.stream().allMatch(String::isBlank)) {
            throw AppException.badRequest("At least one recipient email is required");
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw AppException.badRequest("Outbound email is not configured (set MAIL_HOST / spring.mail on the server)");
        }
        String from = fromUsername != null && !fromUsername.isBlank() ? fromUsername : "noreply@localhost";
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(toEmails.stream().filter(e -> e != null && !e.isBlank()).distinct().toArray(String[]::new));
            helper.setSubject(subject != null && !subject.isBlank() ? subject : "Contract");
            helper.setText(textBody != null ? textBody : "", false);
            helper.addAttachment(attachmentName, new ByteArrayDataSource(attachmentBytes, mimeType));
            sender.send(message);
        } catch (Exception e) {
            throw AppException.badRequest("Failed to send email: " + e.getMessage());
        }
    }
}
