package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.analytics.AnalyticsService;
import com.diploma.analytics_platform.analytics.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/heatmap")
    public ResponseEntity<List<HeatmapDto>> getHeatmap(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to) {

        LocalDateTime effectiveTo   = to   != null ? to   : LocalDateTime.now();
        LocalDateTime effectiveFrom = from != null ? from : effectiveTo.minusDays(30);

        return ResponseEntity.ok(analyticsService.getHeatmap(effectiveFrom, effectiveTo));
    }

    @GetMapping("/funnel")
    public ResponseEntity<FunnelDto> getFunnel() {
        return ResponseEntity.ok(analyticsService.getFunnel());
    }

    @GetMapping("/topics")
    public ResponseEntity<List<TopicDto>> getTopics() {
        return ResponseEntity.ok(analyticsService.getTopics());
    }
    @GetMapping("/topics/all")
    public ResponseEntity<List<TopicDto>> getAllTopics() {
        return ResponseEntity.ok(analyticsService.getAllTopics());
    }
    @PostMapping("/topics/pinned")
    public ResponseEntity<Void> savePinnedTopics(@RequestBody List<String> pinnedTopics) {
        analyticsService.savePinnedTopics(pinnedTopics);
        return ResponseEntity.ok().build();
    }
    @GetMapping("/topics/pinned")
    public ResponseEntity<List<String>> getPinnedTopics() {
        return ResponseEntity.ok(analyticsService.getPinnedTopics());
    }
    @GetMapping("/trends")
    public ResponseEntity<List<TrendDto>> getTrends(
            @RequestParam(name = "word", required = false, defaultValue = "") String word,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {

        LocalDateTime effectiveTo = to != null
                ? to.atTime(LocalTime.MAX)
                : LocalDateTime.now();

        LocalDateTime effectiveFrom = from != null
                ? from.atStartOfDay()
                : effectiveTo.minusDays(30);

        return ResponseEntity.ok(
                analyticsService.getTrends(word, effectiveFrom, effectiveTo));
    }

    @GetMapping("/sources")
    public ResponseEntity<List<SourceDistributionDto>> getSourceDistribution(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {

        LocalDateTime effectiveTo = to != null
                ? to.atTime(LocalTime.MAX)
                : LocalDateTime.now();

        LocalDateTime effectiveFrom = from != null
                ? from.atStartOfDay()
                : effectiveTo.minusDays(30);

        return ResponseEntity.ok(
                analyticsService.getSourceDistribution(effectiveFrom, effectiveTo));
    }
}