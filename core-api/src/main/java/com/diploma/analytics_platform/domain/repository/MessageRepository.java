package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<UnifiedMessage, Long> {

    List<UnifiedMessage> findByStatus(UnifiedMessage.ProcessingStatus status);

    @Query(value = """
    SELECT CAST(EXTRACT(DOW FROM m.received_at) AS INTEGER) AS day,
           CAST(EXTRACT(HOUR FROM m.received_at) AS INTEGER) AS hour,
           COUNT(*) AS count
    FROM unified_messages m
    WHERE m.received_at BETWEEN :from AND :to
      AND m.workspace_id = :workspaceId
    GROUP BY day, hour
    ORDER BY day, hour
    """, nativeQuery = true)
    List<Object[]> findHeatmapData(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to,
            @Param("workspaceId") Long workspaceId);

    @Query("""
        SELECT m FROM UnifiedMessage m
        WHERE m.status IN :statuses
          AND NOT EXISTS (
              SELECT 1 FROM TrainingExample te WHERE te.message = m
          )
        ORDER BY m.receivedAt DESC
        """)
    List<UnifiedMessage> findUnannotated(@Param("statuses") List<UnifiedMessage.ProcessingStatus> statuses);

    @Query("""
        SELECT m FROM UnifiedMessage m
        WHERE m.status IN :statuses
          AND NOT EXISTS (
              SELECT 1 FROM TrainingExample te WHERE te.message = m AND te.category = :category
          )
        ORDER BY m.receivedAt DESC
        """)
    List<UnifiedMessage> findUnannotatedForCategory(
            @Param("category") String category,
            @Param("statuses") List<UnifiedMessage.ProcessingStatus> statuses);

    @Query("SELECT m.status, COUNT(m) FROM UnifiedMessage m GROUP BY m.status")
    List<Object[]> countByStatus();

    @Query(value = """
    SELECT DATE(received_at)  AS day,
           COUNT(*)           AS count
    FROM unified_messages
    WHERE workspace_id = :workspaceId
      AND received_at BETWEEN :from AND :to
      AND text ILIKE :keyword
    GROUP BY DATE(received_at)
    ORDER BY day
    """, nativeQuery = true)
    List<Object[]> findTrendsByKeyword(
            @Param("workspaceId") Long workspaceId,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to,
            @Param("keyword")     String keyword);

    @Query(value = """
    SELECT source,
           COUNT(*) AS count
    FROM unified_messages
    WHERE workspace_id = :workspaceId
      AND received_at BETWEEN :from AND :to
    GROUP BY source
    ORDER BY count DESC
    """, nativeQuery = true)
    List<Object[]> findSourceDistribution(
            @Param("workspaceId") Long workspaceId,
            @Param("from")        LocalDateTime from,
            @Param("to")          LocalDateTime to);

    @Query(value = "SELECT DISTINCT source FROM unified_messages WHERE workspace_id = ?1", nativeQuery = true)
    List<String> findDistinctSourcesForWorkspace(Long workspaceId);

    // інтерфейс-проєкція для черги повідомлень
    interface PendingMessageProjection {
        Long getId();
        String getText();
        String getSource();
        java.time.LocalDateTime getDate();
    }

    @Query(value = "SELECT um.id AS id, um.text AS text, um.source AS source, " +
            "COALESCE(um.sent_at, um.received_at) AS date " +
            "FROM unified_messages um " +
            "LEFT JOIN classifications c ON um.id = c.message_id " +
            "WHERE um.workspace_id = :workspaceId " +
            "AND um.status IN ('NORMALIZED', 'CLASSIFIED') " +
            "AND NOT EXISTS (SELECT 1 FROM training_examples te WHERE te.message_id = um.id) " +
            "AND (c.confidence IS NULL OR c.confidence < 0.7) " +
            "AND (CAST(:category AS text) IS NULL OR c.category = CAST(:category AS text)) " +
            "AND (CAST(:source AS text) IS NULL OR um.source = CAST(:source AS text)) " +
            "AND (CAST(:startDate AS timestamp) IS NULL OR COALESCE(um.sent_at, um.received_at) >= CAST(:startDate AS timestamp)) " +
            "AND (CAST(:endDate AS timestamp) IS NULL OR COALESCE(um.sent_at, um.received_at) <= CAST(:endDate AS timestamp)) " +
            "ORDER BY date DESC",
            countQuery = "SELECT count(*) FROM unified_messages um " +
                    "LEFT JOIN classifications c ON um.id = c.message_id " +
                    "WHERE um.workspace_id = :workspaceId " +
                    "AND um.status IN ('NORMALIZED', 'CLASSIFIED') " +
                    "AND NOT EXISTS (SELECT 1 FROM training_examples te WHERE te.message_id = um.id) " +
                    "AND (c.confidence IS NULL OR c.confidence < 0.7) " +
                    "AND (CAST(:category AS text) IS NULL OR c.category = CAST(:category AS text)) " +
                    "AND (CAST(:source AS text) IS NULL OR um.source = CAST(:source AS text)) " +
                    "AND (CAST(:startDate AS timestamp) IS NULL OR COALESCE(um.sent_at, um.received_at) >= CAST(:startDate AS timestamp)) " +
                    "AND (CAST(:endDate AS timestamp) IS NULL OR COALESCE(um.sent_at, um.received_at) <= CAST(:endDate AS timestamp))",
            nativeQuery = true)
    Page<PendingMessageProjection> findPendingWithFilters(
            @Param("workspaceId") Long workspaceId,
            @Param("category") String category,
            @Param("source") String source,
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            Pageable pageable);

    @Query(value = "SELECT * FROM unified_messages WHERE id = :id AND workspace_id = :workspaceId", nativeQuery = true)
    Optional<UnifiedMessage> findByIdAndWorkspaceIdIgnoringTenant(@Param("id") Long id, @Param("workspaceId") Long workspaceId);
}