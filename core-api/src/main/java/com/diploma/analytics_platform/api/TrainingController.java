package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.domain.model.Workspace;
import com.diploma.analytics_platform.domain.repository.ClassificationRepository;
import com.diploma.analytics_platform.multitenancy.WorkspaceContext;
import com.diploma.analytics_platform.nlp.dto.ModelStatusResponse;
import com.diploma.analytics_platform.training.TrainingService;
import com.diploma.analytics_platform.training.dto.AnnotateRequest;
import com.diploma.analytics_platform.training.dto.PendingMessageDto;
import com.diploma.analytics_platform.workspace.WorkspaceService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/training")
@RequiredArgsConstructor
public class TrainingController {

        private final TrainingService trainingService;
        private final WorkspaceService workspaceService;
        private final WorkspaceContext workspaceContext;
        @Autowired
        private EntityManager entityManager;

        @Transactional
        @GetMapping("/fix-ghosts")
        public ResponseEntity<String> fixGhosts() {
                entityManager.createNativeQuery("TRUNCATE TABLE classifications").executeUpdate();
                return ResponseEntity.ok("Таблицю класифікацій успішно очищено від привидів!");
        }


        @GetMapping("/pending")
        public ResponseEntity<Page<PendingMessageDto>> getPending(
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "10") int size,
                @RequestParam(required = false) String category,
                @RequestParam(required = false) String source,
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

                return ResponseEntity.ok(trainingService.getPendingMessages(page, size, category, source, startDate, endDate));
        }

        @GetMapping("/sources")
        public ResponseEntity<List<String>> getFiltersSources() {
                return ResponseEntity.ok(trainingService.getDynamicSources());
        }

        @GetMapping("/history")
        public ResponseEntity<Page<ClassificationRepository.HistoryClassificationProjection>> getHistory(
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "10") int size,
                @RequestParam(required = false) String category,
                @RequestParam(required = false) String source,
                @RequestParam(required = false) LocalDate startDate,
                @RequestParam(required = false) LocalDate endDate) {

                return ResponseEntity.ok(trainingService.getTrainingHistory(page, size, category, source, startDate, endDate));
        }

        @PostMapping("/annotate")
        public ResponseEntity<Void> annotate(@RequestBody AnnotateRequest req) {
                boolean positive = (req.getIsPositive() != null) ? req.getIsPositive() : true;

                trainingService.annotate(req.getMessageId(), req.getCategory(), positive);

                return ResponseEntity.ok().build();
        }

        @PostMapping("/retrain")
        public ResponseEntity<Map<String, Object>> retrain() {
                Long workspaceId = workspaceContext.getCurrentWorkspaceId();
                Workspace workspace = workspaceService.getWorkspaceById(workspaceId);

                if (!trainingService.canRetrain()) {
                        LocalDateTime nextAvailable = workspace.getLastRetrainedAt().plusMinutes(1);
                        return ResponseEntity.status(429)
                                .body(Map.of(
                                        "error", "Cooldown активний",
                                        "nextAvailableAt", nextAvailable.toString()
                                ));
                }

                trainingService.retrain(workspaceId);

                return ResponseEntity.accepted()
                        .body(Map.of("status", "Перенавчання запущено асинхронно"));
        }

        @GetMapping("/status")
        public ResponseEntity<ModelStatusResponse> getStatus() {
                return ResponseEntity.ok(trainingService.getModelStatus());
        }
}
