package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;

@Entity
@Table(name = "unified_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnifiedMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageSource source;       // TELEGRAM, INSTAGRAM, VIBER, WHATSAPP

    @Column(name = "external_id", nullable = false)
    private String externalId;          // ID повідомлення у зовнішній системі

    @Column(name = "chat_id", nullable = false)
    private String chatId;              // ID чату/діалогу

    @Column(name = "sender_id")
    private String senderId;            // ID відправника

    @Column(name = "instance_id")
    private String instanceId;

    @Column(name = "sender_name")
    private String senderName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;   // коли отримала система

    @Column(name = "sent_at")
    private LocalDateTime sentAt;       // коли відправив користувач (з метаданих)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProcessingStatus status;    // RAW, NORMALIZED, CLASSIFIED, ERROR

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @TenantId
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    public enum MessageSource {
        TELEGRAM, INSTAGRAM, FACEBOOK, VIBER, WHATSAPP
    }

    public enum ProcessingStatus {
        RAW, NORMALIZED, CLASSIFIED, ERROR
    }
}