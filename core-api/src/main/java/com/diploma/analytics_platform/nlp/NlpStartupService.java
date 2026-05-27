package com.diploma.analytics_platform.nlp;

import com.diploma.analytics_platform.domain.repository.TrainingExampleRepository;
import com.diploma.analytics_platform.domain.repository.TrainingExampleRepository.StartupExample;
import com.diploma.analytics_platform.nlp.dto.TrainingExampleDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NlpStartupService {

    private final TrainingExampleRepository trainingExampleRepository;
    private final NlpServiceClient nlpClient;

    @EventListener(ApplicationReadyEvent.class)
    public void retainNlpOnStartup() {
        List<StartupExample> allPositive = trainingExampleRepository.findAllPositiveForStartup();

        if (allPositive.isEmpty()) {
            log.info("NLP auto-retrain: no positive examples found, skipping");
            return;
        }

        Map<Long, List<StartupExample>> groupedByWorkspace = allPositive.stream()
                .collect(Collectors.groupingBy(StartupExample::getWorkspaceId));

        log.info("NLP auto-retrain: found examples for {} workspaces", groupedByWorkspace.size());

        groupedByWorkspace.forEach((workspaceId, examples) -> {
            try {
                List<TrainingExampleDto> payload = examples.stream()
                        .map(ex -> TrainingExampleDto.builder()
                                .text(ex.getText())
                                .category(ex.getCategory())
                                .build())
                        .toList();

                log.info("NLP auto-retrain: sending {} examples for workspace={}", payload.size(), workspaceId);
                nlpClient.retrain(workspaceId, payload);

            } catch (Exception e) {
                log.warn("NLP auto-retrain failed for workspace {}: {}", workspaceId, e.getMessage());
            }
        });

        log.info("NLP auto-retrain: startup sequence completed");
    }
}