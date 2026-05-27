package com.diploma.analytics_platform.messaging;

import com.diploma.analytics_platform.auth.SystemAuthToken;
import com.diploma.analytics_platform.domain.model.*;
import com.diploma.analytics_platform.domain.repository.*;
import com.diploma.analytics_platform.messaging.dto.RawMessageDto;
import com.diploma.analytics_platform.messaging.normalization.NormalizerFactory;
import com.diploma.analytics_platform.nlp.NlpServiceClient;
import com.diploma.analytics_platform.nlp.dto.ClassifyResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageConsumer {

    private final NormalizerFactory        normalizerFactory;
    private final MessageRepository        messageRepository;
    private final ClassificationRepository classificationRepository;
    private final CategoryRepository       categoryRepository;
    private final ChannelRepository        channelRepository;
    private final NlpServiceClient         nlpClient;
    private final ObjectMapper             objectMapper;
    private final WorkspaceRepository      workspaceRepository;

    @PostConstruct
    public void init() {
        log.info("MessageConsumer initialized, listening to queue: {}",
                RabbitMQConfig.QUEUE_RAW);
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_RAW)
    public void consume(RawMessageDto raw) {
        log.info("Отримано: source={} instance={} id={}",
                raw.getSource(), raw.getInstanceId(), raw.getExternalId());
        try {
            Channel channel = channelRepository
                    .findByInstanceIdNative(raw.getInstanceId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Channel не знайдено для instanceId=" + raw.getInstanceId()));

            Long workspaceId = channel.getWorkspaceId();
            setTenantContext(workspaceId);

            try {
                processMessage(raw, workspaceId);
            } finally {
                SecurityContextHolder.clearContext();
            }

        } catch (Exception e) {
            log.error("Помилка обробки повідомлення source={} id={}: {}",
                    raw.getSource(), raw.getExternalId(), e.getMessage(), e);
            throw new RuntimeException(e);
        }
    }

    private void processMessage(RawMessageDto raw, Long workspaceId) {
        UnifiedMessage message = normalizerFactory
                .getStrategy(raw.getSource())
                .normalize(raw);

        message.setWorkspaceId(workspaceId);
        messageRepository.save(message);

        log.info("Збережено повідомлення id={} workspaceId={} status={}",
                message.getId(), message.getWorkspaceId(), message.getStatus());

        List<String> categoryNames = categoryRepository.findAllNamesByWorkspaceId(workspaceId);
        if (categoryNames.isEmpty()) {
            log.warn("Категорії не визначені для workspace={}", workspaceId);
            return;
        }

        String customModelId = workspaceRepository.findById(workspaceId)
                .map(Workspace::getCustomModelId)
                .orElse(null);

        try {
            ClassifyResponse nlpResult =
                    nlpClient.classify(workspaceId, message.getText(), categoryNames, customModelId);

            if (nlpResult == null || nlpResult.getCategory() == null) return;

            boolean isLead = categoryRepository
                    .findByWorkspaceIdAndName(workspaceId, nlpResult.getCategory())
                    .map(Category::isLead)
                    .orElse(false);

            Classification classification = Classification.builder()
                    .message(message)
                    .category(nlpResult.getCategory())
                    .confidence(nlpResult.getConfidence())
                    .entities(toJson(nlpResult.getEntities()))
                    .isLead(isLead)
                    .classifiedAt(LocalDateTime.now())
                    .build();

            classification.setWorkspaceId(workspaceId);
            classificationRepository.save(classification);

            message.setStatus(UnifiedMessage.ProcessingStatus.CLASSIFIED);
            messageRepository.save(message);

            log.info("Класифіковано id={} → category='{}' confidence={} isLead={} method={}",
                    message.getId(), nlpResult.getCategory(),
                    nlpResult.getConfidence(), isLead, nlpResult.getMethod());

        } catch (Exception e) {
            log.warn("NLP недоступний, збережено без класифікації id={}: {}",
                    message.getId(), e.getMessage());
        }
    }

    private void setTenantContext(Long workspaceId) {
        SystemAuthToken systemAuth = new SystemAuthToken(workspaceId);
        SecurityContextHolder.getContext().setAuthentication(systemAuth);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Не вдалось серіалізувати entities: {}", e.getMessage());
            return "[]";
        }
    }
}