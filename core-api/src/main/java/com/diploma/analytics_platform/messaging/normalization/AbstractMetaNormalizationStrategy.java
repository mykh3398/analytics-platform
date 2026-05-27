package com.diploma.analytics_platform.messaging.normalization;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import com.diploma.analytics_platform.domain.model.UnifiedMessage.ProcessingStatus;
import com.diploma.analytics_platform.messaging.dto.RawMessageDto;

import java.time.LocalDateTime;

public abstract class AbstractMetaNormalizationStrategy
        implements NormalizationStrategy {

    @Override
    public final UnifiedMessage normalize(RawMessageDto raw) {
        UnifiedMessage.UnifiedMessageBuilder builder = UnifiedMessage.builder()
                .source(raw.getSource())
                .instanceId(raw.getInstanceId())
                .externalId(raw.getExternalId())
                .chatId(raw.getChatId())
                .senderId(raw.getSenderId())
                .senderName(raw.getSenderName())
                .text(raw.getText())
                .sentAt(raw.getSentAt())
                .receivedAt(LocalDateTime.now())
                .status(ProcessingStatus.NORMALIZED)
                .rawPayload(raw.getRawPayload());

        enrichFromMeta(builder, raw);

        return builder.build();
    }

    protected void enrichFromMeta(
            UnifiedMessage.UnifiedMessageBuilder builder,
            RawMessageDto raw) {
    }
}