package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.WorkspaceMember;
import com.diploma.analytics_platform.domain.model.WorkspaceMemberId;
import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMemberId> {
    List<WorkspaceMember> findAllByUserId(Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<WorkspaceMember> findByWorkspaceId(Long workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    @EntityGraph(attributePaths = {"workspace"})
    List<WorkspaceMember> findByUserId(Long userId);

    @Query("SELECT COUNT(wm) FROM WorkspaceMember wm WHERE wm.user.id = :userId AND wm.role = :role")
    long countByUserIdAndRole(@Param("userId") Long userId, @Param("role") WorkspaceRole role);
}