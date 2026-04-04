package com.arqops.hr.repository;

import com.arqops.hr.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    Optional<Attendance> findByEmployeeIdAndAttendanceDate(UUID employeeId, LocalDate attendanceDate);

    List<Attendance> findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
            UUID employeeId, LocalDate from, LocalDate to);

    List<Attendance> findByAttendanceDateBetweenOrderByAttendanceDateAsc(LocalDate from, LocalDate to);
}
