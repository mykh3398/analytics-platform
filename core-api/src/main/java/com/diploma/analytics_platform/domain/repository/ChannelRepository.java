package com.diploma.analytics_platform.domain.repository;

import com.diploma.analytics_platform.domain.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ChannelRepository extends JpaRepository<Channel, Long> {

    List<Channel> findAllByOrderByCreatedAtDesc();

    boolean existsByInstanceIdAndType(String instanceId, String type);

    @Query(value = "SELECT * FROM channels WHERE instance_id = :instanceId LIMIT 1",
            nativeQuery = true)
    Optional<Channel> findByInstanceIdNative(String instanceId);

    @Query(value = "SELECT * FROM channels WHERE type = 'TELEGRAM' AND status = 'ACTIVE'",
            nativeQuery = true)
    List<Channel> findAllActiveTelegramNative();

    @Query(value = "SELECT COUNT(*) > 0 FROM channels WHERE token = :token",
            nativeQuery = true)
    boolean existsByToken(String token);

    @Query(value = """
    SELECT * FROM channels
    WHERE type IN ('INSTAGRAM', 'FACEBOOK')
      AND status = 'ACTIVE'
    """, nativeQuery = true)
    List<Channel> findAllActiveMetaNative();
}