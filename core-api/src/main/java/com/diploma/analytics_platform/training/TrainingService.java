package com.diploma.analytics_platform.training;

import com.diploma.analytics_platform.domain.model.*;
import com.diploma.analytics_platform.domain.repository.*;
import com.diploma.analytics_platform.multitenancy.WorkspaceContext;
import com.diploma.analytics_platform.nlp.NlpServiceClient;
import com.diploma.analytics_platform.nlp.dto.ModelStatusResponse;
import com.diploma.analytics_platform.nlp.dto.RetrainResponse;
import com.diploma.analytics_platform.nlp.dto.TrainingExampleDto;
import com.diploma.analytics_platform.training.dto.PendingMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingService {

    private final TrainingExampleRepository trainingExampleRepository;
    private final WorkspaceRepository workspaceRepository;
    private final MessageRepository messageRepository;
    private final ClassificationRepository classificationRepository;
    private final CategoryRepository categoryRepository;
    private final NlpServiceClient nlpClient;
    private final WorkspaceContext workspaceContext;

    public Page<PendingMessageDto> getPendingMessages(
            int page, int size, String category, String source, LocalDate startDate, LocalDate endDate) {

        Long workspaceId = getCurrentWorkspaceId();
        PageRequest pageRequest = PageRequest.of(page, size);

        String filterCategory = (category != null && !category.trim().isEmpty() && !category.equals("undefined") && !category.equals("null")) ? category : null;
        String filterSource = (source != null && !source.trim().isEmpty()) ? source : null;

        LocalDateTime startDateTime = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        Page<MessageRepository.PendingMessageProjection> projections = messageRepository.findPendingWithFilters(
                workspaceId, filterCategory, filterSource, startDateTime, endDateTime, pageRequest);

        return projections.map(p -> PendingMessageDto.builder()
                .id(p.getId())
                .text(p.getText())
                .source(p.getSource())
                .sentAt(p.getDate().toString())
                .build());
    }

    @Transactional
    public void annotate(Long messageId, String category, boolean isPositive) {
        UnifiedMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Повідомлення не знайдено"));

        Optional<TrainingExample> existingExample = trainingExampleRepository.findByMessageId(messageId);
        if (existingExample.isPresent()) {
            TrainingExample example = existingExample.get();
            example.setCategory(category);
            example.setPositive(isPositive);
            example.setSentForTraining(false);
            trainingExampleRepository.save(example);
        } else {
            trainingExampleRepository.save(TrainingExample.builder()
                    .message(message)
                    .category(category)
                    .isPositive(isPositive)
                    .sentForTraining(false)
                    .build());
        }

        Optional<Classification> existingClassification = classificationRepository.findByMessageId(messageId);

        boolean isLead = categoryRepository.findByWorkspaceIdAndName(message.getWorkspaceId(), category)
                .map(Category::isLead)
                .orElse(false);

        if (existingClassification.isPresent()) {
            Classification clazz = existingClassification.get();
            clazz.setCategory(category);
            clazz.setConfidence(1.0);
            clazz.setManual(true);
            clazz.setIsLead(isLead);
            clazz.setClassifiedAt(LocalDateTime.now());
            classificationRepository.save(clazz);
        } else {
            classificationRepository.save(Classification.builder()
                    .message(message)
                    .category(category)
                    .confidence(1.0)
                    .isManual(true)
                    .isLead(isLead)
                    .classifiedAt(LocalDateTime.now())
                    .workspaceId(workspaceContext.getCurrentWorkspaceId())
                    .build());
        }

        message.setStatus(UnifiedMessage.ProcessingStatus.CLASSIFIED);
        messageRepository.save(message);

        log.info("Розмітка успішна [Manual=true] для message={}. Дані оновлено в Навчанні та Дашборді.", messageId);
    }

    @Async
    @Transactional
    public CompletableFuture<Void> retrain(Long workspaceId) {
        log.info("Retrain: старт для workspace={}", workspaceId);

        List<TrainingExampleRepository.StartupExample> pendingExamples = trainingExampleRepository.findPendingForWorkspace(workspaceId);

        if (pendingExamples.isEmpty()) {
            log.info("Retrain пропущено: немає нових прикладів для workspace={}", workspaceId);
            return CompletableFuture.completedFuture(null);
        }

        List<TrainingExampleRepository.StartupExample> allExamples = trainingExampleRepository.findAllPositiveForWorkspace(workspaceId);

        List<TrainingExampleDto> payload = allExamples.stream()
                .map(ex -> TrainingExampleDto.builder()
                        .text(ex.getText())
                        .category(ex.getCategory())
                        .build())
                .toList();

        log.info("Retrain: відправляємо ВСІ {} прикладів до NLP для повної перебудови workspace={}", payload.size(), workspaceId);

        try {
            RetrainResponse nlpResponse = nlpClient.retrain(workspaceId, payload);
            trainingExampleRepository.markAsSent(workspaceId);

            workspaceRepository.findById(workspaceId).ifPresent(ws -> {
                ws.setLastRetrainedAt(LocalDateTime.now());
                if (nlpResponse != null) {
                    ws.setLastAccuracy(nlpResponse.getAccuracy());
                    ws.setLastF1Score(nlpResponse.getF1Score());
                    ws.setLastPrecision(nlpResponse.getPrecision());
                    ws.setLastRecall(nlpResponse.getRecall());
                    ws.setLastEvalCount(nlpResponse.getEvalCount());
                }
                workspaceRepository.save(ws);
            });

            log.info("Retrain успішний: workspace={} examples={}", workspaceId, allExamples.size());

        } catch (Exception e) {
            log.error("Retrain помилка для workspace={}: {}", workspaceId, e.getMessage(), e);
        }

        return CompletableFuture.completedFuture(null);
    }

    public ModelStatusResponse getModelStatus() {
        ModelStatusResponse status = nlpClient.getModelStatus(getCurrentWorkspaceId());

        long dbExamplesCount = trainingExampleRepository.count();
        status.setTotalExamples((int) dbExamplesCount);

        Workspace ws = getCurrentWorkspace();
        status.setAccuracy(ws.getLastAccuracy());
        status.setF1Score(ws.getLastF1Score());
        status.setPrecision(ws.getLastPrecision());
        status.setRecall(ws.getLastRecall());
        status.setEvalCount(ws.getLastEvalCount());

        return status;
    }

    public boolean canRetrain() {
        Workspace ws = getCurrentWorkspace();
        if (ws.getLastRetrainedAt() == null) return true;

        return ws.getLastRetrainedAt().isBefore(LocalDateTime.now().minusMinutes(1));
    }

    private Workspace getCurrentWorkspace() {
        Long workspaceId = getCurrentWorkspaceId();
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalStateException(
                        "Workspace не знайдено: " + workspaceId));
    }

    private Long getCurrentWorkspaceId() {
        return workspaceContext.getCurrentWorkspaceId();
    }

    public List<String> getDynamicSources() {
        return messageRepository.findDistinctSourcesForWorkspace(getCurrentWorkspaceId());
    }

    public Page<ClassificationRepository.HistoryClassificationProjection> getTrainingHistory(
            int page, int size, String category, String source, LocalDate startDate, LocalDate endDate) {

        Long workspaceId = getCurrentWorkspaceId();
        PageRequest pageRequest = PageRequest.of(page, size);

        String filterCategory = (category != null && !category.trim().isEmpty()) ? category : null;
        String filterSource = (source != null && !source.trim().isEmpty()) ? source : null;

        LocalDateTime startDateTime = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        return classificationRepository.findHistoryWithFilters(
                workspaceId, filterCategory, filterSource, startDateTime, endDateTime, pageRequest);
    }
}