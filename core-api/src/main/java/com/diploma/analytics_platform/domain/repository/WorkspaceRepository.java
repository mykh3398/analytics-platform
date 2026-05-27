package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    List<Workspace> findByOwnerId(Long ownerId);
    Optional<Workspace> findByIdAndOwnerId(Long id, Long ownerId);


}