package com.diploma.analytics_platform.analytics;

import com.diploma.analytics_platform.analytics.dto.*;
import com.diploma.analytics_platform.domain.model.DashboardSettings;
import com.diploma.analytics_platform.domain.repository.*;
import com.diploma.analytics_platform.multitenancy.WorkspaceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MessageRepository messageRepository;
    private final ClassificationRepository classificationRepository;
    private final DashboardSettingsRepository dashboardSettingsRepository;
    private final WorkspaceContext workspaceContext;

    private Long getCurrentWorkspaceId() {
        return workspaceContext.getCurrentWorkspaceId();
    }

    public List<HeatmapDto> getHeatmap(LocalDateTime from, LocalDateTime to) {
        Long workspaceId = getCurrentWorkspaceId();

        return messageRepository.findHeatmapData(from, to, workspaceId)
                .stream()
                .map(row -> HeatmapDto.builder()
                        .dayOfWeek(((Number) row[0]).intValue())
                        .hourUtc(((Number) row[1]).intValue())
                        .count(((Number) row[2]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    public List<String> getPinnedTopics() {
        Long workspaceId = getCurrentWorkspaceId();
        return dashboardSettingsRepository.findById(workspaceId)
                .map(DashboardSettings::getPinnedTopics)
                .orElse(Collections.emptyList());
    }

    public FunnelDto getFunnel() {
        Long workspaceId = getCurrentWorkspaceId();

        Map<String, Long> byStatus = messageRepository.countByStatus()
                .stream()
                .collect(Collectors.toMap(
                        (Object[] r) -> r[0].toString(),
                        (Object[] r) -> ((Number) r[1]).longValue()
                ));

        Map<String, Long> byCategory = classificationRepository.countByCategory()
                .stream()
                .collect(Collectors.toMap(
                        (Object[] r) -> r[0].toString(),
                        (Object[] r) -> ((Number) r[1]).longValue()
                ));

        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();

        long classified = classificationRepository.countValidClassifications();
        long leads = classificationRepository.countLeads();

        return FunnelDto.builder()
                .totalMessages(total)
                .classified(classified)
                .leads(leads)
                .byCategory(byCategory)
                .build();
    }

    public List<TopicDto> getTopics() {
        Long workspaceId = getCurrentWorkspaceId();

        List<Object[]> rows = classificationRepository.countByCategory();

        long total = rows.stream()
                .mapToLong((Object[] r) -> ((Number) r[1]).longValue())
                .sum();

        Optional<DashboardSettings> settingsOpt = dashboardSettingsRepository.findById(workspaceId);

        if (settingsOpt.isPresent() && !settingsOpt.get().getPinnedTopics().isEmpty()) {
            List<String> pinned = settingsOpt.get().getPinnedTopics();

            Map<String, Long> countMap = rows.stream()
                    .collect(Collectors.toMap(r -> r[0].toString(), r -> ((Number) r[1]).longValue()));

            List<TopicDto> customTopics = new ArrayList<>();
            long pinnedSumCount = 0L;

            for (String topic : pinned) {
                long count = countMap.getOrDefault(topic, 0L);
                pinnedSumCount += count;

                double percentage = (total == 0) ? 0.0 : Math.round((double) count / total * 1000.0) / 10.0;
                customTopics.add(TopicDto.builder()
                        .category(topic)
                        .count(count)
                        .percentage(percentage)
                        .build());
            }

            long othersCount = total - pinnedSumCount;
            if (othersCount > 0) {
                double othersPercentage = (total == 0) ? 0.0 : Math.round((double) othersCount / total * 1000.0) / 10.0;
                customTopics.add(TopicDto.builder()
                        .category("Інші")
                        .count(othersCount)
                        .percentage(othersPercentage)
                        .build());
            }

            return customTopics;
        }

        List<TopicDto> topTopics = new ArrayList<>();
        long othersCount = 0L;
        int limit = 5;

        for (int i = 0; i < rows.size(); i++) {
            String category = rows.get(i)[0].toString();
            long count = ((Number) rows.get(i)[1]).longValue();

            if (i < limit) {
                double percentage = (total == 0) ? 0.0 : Math.round((double) count / total * 1000.0) / 10.0;
                topTopics.add(TopicDto.builder()
                        .category(category)
                        .count(count)
                        .percentage(percentage)
                        .build());
            } else {
                othersCount += count;
            }
        }

        if (othersCount > 0) {
            double othersPercentage = (total == 0) ? 0.0 : Math.round((double) othersCount / total * 1000.0) / 10.0;
            topTopics.add(TopicDto.builder()
                    .category("Інші")
                    .count(othersCount)
                    .percentage(othersPercentage)
                    .build());
        }

        return topTopics;
    }

    public List<TopicDto> getAllTopics() {
        List<Object[]> rows = classificationRepository.countByCategory();

        long total = rows.stream()
                .mapToLong(r -> ((Number) r[1]).longValue())
                .sum();

        return rows.stream()
                .map(r -> {
                    long count = ((Number) r[1]).longValue();
                    double percentage = (total == 0) ? 0.0 : Math.round((double) count / total * 1000.0) / 10.0;
                    return TopicDto.builder()
                            .category(r[0].toString())
                            .count(count)
                            .percentage(percentage)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void savePinnedTopics(List<String> topics) {
        Long workspaceId = getCurrentWorkspaceId();

        DashboardSettings settings = dashboardSettingsRepository.findById(workspaceId)
                .orElseGet(() -> DashboardSettings.builder()
                        .workspaceId(workspaceId)
                        .pinnedTopics(new ArrayList<>())
                        .build());

        settings.setPinnedTopics(topics);
        dashboardSettingsRepository.save(settings);
    }

    public List<TrendDto> getTrends(String word, LocalDateTime from, LocalDateTime to) {
        Long workspaceId = getCurrentWorkspaceId();

        if (word == null || word.isBlank()) {
            return List.of();
        }

        String pattern = "%" + word.trim() + "%";

        return messageRepository
                .findTrendsByKeyword(workspaceId, from, to, pattern)
                .stream()
                .map(row -> TrendDto.builder()
                        .date(((java.sql.Date) row[0]).toLocalDate())
                        .count(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    public List<SourceDistributionDto> getSourceDistribution(LocalDateTime from, LocalDateTime to) {
        Long workspaceId = getCurrentWorkspaceId();

        List<Object[]> rows = messageRepository
                .findSourceDistribution(workspaceId, from, to);

        long total = rows.stream()
                .mapToLong(r -> ((Number) r[1]).longValue())
                .sum();

        return rows.stream()
                .map(row -> SourceDistributionDto.builder()
                        .source(row[0].toString())
                        .count(((Number) row[1]).longValue())
                        .percentage(total == 0 ? 0.0
                                : Math.round(((Number) row[1]).doubleValue() / total * 1000.0) / 10.0)
                        .build())
                .collect(Collectors.toList());
    }
}