package com.arqops.finance.repository;

import com.arqops.finance.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    Page<Expense> findByTenantId(UUID tenantId, Pageable pageable);
}
