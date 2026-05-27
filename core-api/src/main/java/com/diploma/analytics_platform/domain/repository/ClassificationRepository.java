package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.Classification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClassificationRepository extends JpaRepository<Classification, Long> {

    @Query("""
        SELECT c.category, COUNT(c)
        FROM Classification c
        GROUP BY c.category
        ORDER BY COUNT(c) DESC
    """)
    List<Object[]> countByCategory();

    @Query("""
        SELECT COUNT(c)
        FROM Classification c
        WHERE c.isLead = true
          AND (c.confidence >= 0.7 OR c.isManual = true)
    """)
    Long countLeads();

    @Query("""
        SELECT COUNT(c)
        FROM Classification c
        WHERE (c.confidence >= 0.7 OR c.isManual = true)
    """)
    Long countValidClassifications();

    Optional<Classification> findByMessageId(Long messageId);

    @Modifying
    @Query(value = "UPDATE classifications SET category = ?3 " +
            "WHERE workspace_id = ?1 AND category = ?2", nativeQuery = true)
    void reassignCategory(Long workspaceId, String oldCategory, String newCategory);

    @Modifying
    @Query(value = "UPDATE unified_messages SET status = 'NORMALIZED' " +
            "WHERE workspace_id = ?1 AND id IN " +
            "(SELECT message_id FROM classifications WHERE workspace_id = ?1 AND category = ?2)",
            nativeQuery = true)
    void revertStatusToNormalized(Long workspaceId, String category);

    @Modifying
    @Query(value = "DELETE FROM classifications WHERE workspace_id = ?1 AND category = ?2", nativeQuery = true)
    void deleteByWorkspaceIdAndCategory(Long workspaceId, String category);


    // інтерфейс-проєкція для Spring Data
    interface HistoryClassificationProjection {
        Long getMessageId();
        String getText();
        String getCategory();
        String getSource();
        LocalDateTime getClassifiedAt();
        Boolean getIsManual();
        Double getConfidence();
    }

    @Query(value = "SELECT c.message_id AS messageId, um.text AS text, " +
            "c.category AS category, um.source AS source, c.classified_at AS classifiedAt, " +
            "c.is_manual AS isManual, c.confidence AS confidence " +
            "FROM classifications c " +
            "JOIN unified_messages um ON c.message_id = um.id " +
            "WHERE c.workspace_id = :workspaceId " +
            "AND (CAST(:category AS text) IS NULL OR c.category = CAST(:category AS text)) " +
            "AND (CAST(:source AS text) IS NULL OR um.source = CAST(:source AS text)) " +
            "AND (CAST(:startDate AS timestamp) IS NULL OR c.classified_at >= CAST(:startDate AS timestamp)) " +
            "AND (CAST(:endDate AS timestamp) IS NULL OR c.classified_at <= CAST(:endDate AS timestamp)) " +
            "ORDER BY c.classified_at DESC",
            countQuery = "SELECT count(*) FROM classifications c " +
                    "JOIN unified_messages um ON c.message_id = um.id " +
                    "WHERE c.workspace_id = :workspaceId " +
                    "AND (CAST(:category AS text) IS NULL OR c.category = CAST(:category AS text)) " +
                    "AND (CAST(:source AS text) IS NULL OR um.source = CAST(:source AS text)) " +
                    "AND (CAST(:startDate AS timestamp) IS NULL OR c.classified_at >= CAST(:startDate AS timestamp)) " +
                    "AND (CAST(:endDate AS timestamp) IS NULL OR c.classified_at <= CAST(:endDate AS timestamp))",
            nativeQuery = true)
    Page<HistoryClassificationProjection> findHistoryWithFilters(
            @Param("workspaceId") Long workspaceId,
            @Param("category") String category,
            @Param("source") String source,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
}