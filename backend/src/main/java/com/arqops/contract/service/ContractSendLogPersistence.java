package com.arqops.contract.service;

import com.arqops.contract.entity.ContractSendLog;
import com.arqops.contract.repository.ContractSendLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContractSendLogPersistence {

    private final ContractSendLogRepository sendLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UUID saveNew(ContractSendLog log) {
        return sendLogRepository.save(log).getId();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateStatus(UUID logId, String status, String errorMessage) {
        sendLogRepository.findById(logId).ifPresent(l -> {
            l.setStatus(status);
            l.setErrorMessage(errorMessage);
            sendLogRepository.save(l);
        });
    }
}
