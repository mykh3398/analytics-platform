package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_examples")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TrainingExample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private UnifiedMessage message;

    @Column(nullable = false)
    private String category;

    @Column(name = "is_positive", nullable = false)
    private boolean isPositive;

    @Column(name = "annotated_at", nullable = false)
    private LocalDateTime annotatedAt;

    @TenantId
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(name = "sent_for_training", nullable = false)
    @Builder.Default
    private boolean sentForTraining = false;

    @PrePersist
    public void prePersist() {
        this.annotatedAt = LocalDateTime.now();
    }
}