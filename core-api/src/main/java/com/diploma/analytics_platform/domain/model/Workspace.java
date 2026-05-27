package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "workspaces")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_retrained_at")
    private LocalDateTime lastRetrainedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false)
    @Builder.Default
    private ModelType modelType = ModelType.DEFAULT;

    @Column(name = "custom_model_id")
    private String customModelId;   // Hugging Face ID або null
    @Column(name = "last_accuracy")
    private Double lastAccuracy;

    @Column(name = "last_f1_score")
    private Double lastF1Score;

    @Column(name = "last_precision")
    private Double lastPrecision;

    @Column(name = "last_recall")
    private Double lastRecall;

    @Column(name = "last_eval_count")
    private Integer lastEvalCount;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.modelType == null) this.modelType = ModelType.DEFAULT;
    }

    public enum ModelType {
        DEFAULT, CUSTOM
    }
}