package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.DashboardSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardSettingsRepository extends JpaRepository<DashboardSettings, Long> {
}