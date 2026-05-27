package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.TrainingExample;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TrainingExampleRepository extends JpaRepository<TrainingExample, Long> {

    // інтерфейс-проєкція для Spring Data
    interface StartupExample {
        Long getWorkspaceId();
        String getText();
        String getCategory();
    }

    @Query(value = "SELECT te.workspace_id AS workspaceId, um.text AS text, te.category AS category " +
            "FROM training_examples te " +
            "JOIN unified_messages um ON te.message_id = um.id " +
            "WHERE te.is_positive = true",
            nativeQuery = true)
    List<StartupExample> findAllPositiveForStartup();

    @Query(value = "SELECT te.workspace_id AS workspaceId, um.text AS text, te.category AS category " +
            "FROM training_examples te " +
            "JOIN unified_messages um ON te.message_id = um.id " +
            "WHERE te.workspace_id = ?1 AND te.is_positive = true AND te.sent_for_training = false",
            nativeQuery = true)
    List<StartupExample> findPendingForWorkspace(Long workspaceId);

    @Modifying
    @Query(value = "UPDATE training_examples SET sent_for_training = true " +
            "WHERE workspace_id = ?1 AND is_positive = true AND sent_for_training = false",
            nativeQuery = true)
    void markAsSent(Long workspaceId);

    List<TrainingExample> findByCategory(String category);

    List<TrainingExample> findByIsPositiveTrueAndSentForTrainingFalse();

    @Query(value = "SELECT te.workspace_id AS workspaceId, um.text AS text, te.category AS category " +
            "FROM training_examples te " +
            "JOIN unified_messages um ON te.message_id = um.id " +
            "WHERE te.workspace_id = ?1 AND te.is_positive = true",
            nativeQuery = true)
    List<StartupExample> findAllPositiveForWorkspace(Long workspaceId);

    Optional<TrainingExample> findByMessageId(Long messageId);

    @Modifying
    @Query(value = "UPDATE training_examples SET category = ?3, sent_for_training = false " +
            "WHERE workspace_id = ?1 AND category = ?2", nativeQuery = true)
    void reassignCategory(Long workspaceId, String oldCategory, String newCategory);

    @Modifying
    @Query(value = "DELETE FROM training_examples WHERE workspace_id = ?1 AND category = ?2", nativeQuery = true)
    void deleteByWorkspaceIdAndCategory(Long workspaceId, String category);
}