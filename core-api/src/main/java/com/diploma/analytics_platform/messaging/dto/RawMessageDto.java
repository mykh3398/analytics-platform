package com.diploma.analytics_platform.messaging.dto;

import com.diploma.analytics_platform.domain.model.UnifiedMessage.MessageSource;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RawMessageDto implements Serializable {
    private MessageSource source;
    private String instanceId;      // "sales", "support", "main"
    private String externalId;
    private String chatId;
    private String senderId;
    private String senderName;
    private String text;
    private LocalDateTime sentAt;
    private String rawPayload;
}