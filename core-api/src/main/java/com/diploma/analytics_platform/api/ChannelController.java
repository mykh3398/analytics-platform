package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.channels.ChannelService;
import com.diploma.analytics_platform.channels.dto.ChannelResponse;
import com.diploma.analytics_platform.channels.dto.CreateChannelRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @GetMapping
    public ResponseEntity<List<ChannelResponse>> getAll() {
        return ResponseEntity.ok(channelService.getAll());
    }

    @PostMapping
    public ResponseEntity<ChannelResponse> create(
            @Valid @RequestBody CreateChannelRequest req) {
        return ResponseEntity.ok(channelService.create(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        channelService.delete(id);
        return ResponseEntity.noContent().build();
    }
}