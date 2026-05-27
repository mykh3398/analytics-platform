package com.diploma.analytics_platform.messaging.normalization;

import com.diploma.analytics_platform.domain.model.UnifiedMessage;
import com.diploma.analytics_platform.messaging.dto.RawMessageDto;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class TelegramNormalizationStrategy implements NormalizationStrategy {

    @Override
    public UnifiedMessage.MessageSource supportedSource() {
        return UnifiedMessage.MessageSource.TELEGRAM;
    }

    @Override
    public UnifiedMessage normalize(RawMessageDto raw) {
        return UnifiedMessage.builder()
                .source(raw.getSource())
                .instanceId(raw.getInstanceId())
                .externalId(raw.getExternalId())
                .chatId(raw.getChatId())
                .senderId(raw.getSenderId())
                .senderName(raw.getSenderName())
                .text(raw.getText())
                .sentAt(raw.getSentAt())
                .receivedAt(LocalDateTime.now())
                .status(UnifiedMessage.ProcessingStatus.NORMALIZED)
                .rawPayload(raw.getRawPayload())
                .build();
    }
}
