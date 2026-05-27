package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByWorkspaceIdAndName(Long workspaceId, String name);

    @Query("SELECT c.name FROM Category c WHERE c.workspaceId = :workspaceId ORDER BY c.createdAt ASC")
    List<String> findAllNamesByWorkspaceId(@Param("workspaceId") Long workspaceId);

    boolean existsByWorkspaceIdAndName(Long workspaceId, String name);

    List<Category> findAllByOrderByCreatedAtAsc();
}