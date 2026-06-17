package run.halo.live2d.chat;

import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class ChatSecurityService {
    private static final String LIMITER_PREFIX = "live2d-ai-chat:";

    private final RateLimiterRegistry rateLimiterRegistry;
    private final Set<String> limiterNames = ConcurrentHashMap.newKeySet();

    public Mono<Void> secure(ServerRequest request, AiChatEndpoint.AiChatSecuritySetting setting,
        Authentication authentication) {
        var security = setting == null ? AiChatEndpoint.AiChatSecuritySetting.defaults() : setting;
        return Mono.fromRunnable(() -> {
            verifyHotlink(request, security);
            verifyRateLimit(request, security, authentication);
        });
    }

    public void dispose() {
        limiterNames.forEach(rateLimiterRegistry::remove);
        limiterNames.clear();
    }

    void verifyHotlink(ServerRequest request, AiChatEndpoint.AiChatSecuritySetting setting) {
        if (!setting.antiHotlinkEnabled()) {
            return;
        }

        var secFetchSite = request.headers().firstHeader("Sec-Fetch-Site");
        if (StringUtils.equalsIgnoreCase(secFetchSite, "cross-site")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Cross-site AI chat requests are not allowed");
        }

        var sourceOrigin = requestOrigin(request);
        if (sourceOrigin == null) {
            if (setting.allowMissingOrigin()) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Missing request origin for AI chat");
        }

        var allowedOrigins = new ArrayList<>(setting.normalizedAllowedOrigins());
        allowedOrigins.add(serverOrigin(request));
        if (allowedOrigins.stream()
            .map(ChatSecurityService::normalizeOrigin)
            .anyMatch(origin -> StringUtils.equalsIgnoreCase(origin, sourceOrigin))) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
            "AI chat requests are only allowed from trusted site origins");
    }

    void verifyRateLimit(ServerRequest request, AiChatEndpoint.AiChatSecuritySetting setting,
        Authentication authentication) {
        if (!setting.rateLimitEnabled()) {
            return;
        }

        var limiterName = limiterName(request, setting, authentication);
        var limiterConfig = RateLimiterConfig.custom()
            .limitForPeriod(setting.normalizedRateLimitRequests())
            .limitRefreshPeriod(Duration.ofSeconds(setting.normalizedRateLimitWindowSeconds()))
            .timeoutDuration(Duration.ZERO)
            .build();
        var limiter = rateLimiterRegistry.rateLimiter(limiterName, limiterConfig);
        limiterNames.add(limiterName);
        if (!limiter.acquirePermission()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "AI chat request limit exceeded");
        }
    }

    String limiterName(ServerRequest request, AiChatEndpoint.AiChatSecuritySetting setting,
        Authentication authentication) {
        var principal = authentication == null || isAnonymous(authentication)
            ? "ip:" + clientIp(request)
            : "user:" + authentication.getName();
        var window = setting.normalizedRateLimitRequests() + ":"
            + setting.normalizedRateLimitWindowSeconds();
        return LIMITER_PREFIX + digest(principal + ":" + window);
    }

    private boolean isAnonymous(Authentication authentication) {
        return !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName());
    }

    private String requestOrigin(ServerRequest request) {
        var origin = normalizeOrigin(request.headers().firstHeader("Origin"));
        if (origin != null) {
            return origin;
        }
        var referer = request.headers().firstHeader("Referer");
        if (StringUtils.isBlank(referer)) {
            return null;
        }
        return normalizeOrigin(referer);
    }

    private static String normalizeOrigin(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        try {
            var uri = URI.create(value.trim());
            if (StringUtils.isBlank(uri.getScheme()) || StringUtils.isBlank(uri.getHost())) {
                return null;
            }
            var scheme = uri.getScheme().toLowerCase();
            var host = uri.getHost().toLowerCase();
            var port = normalizePort(scheme, uri.getPort());
            return port == -1 ? scheme + "://" + host : scheme + "://" + host + ":" + port;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static int normalizePort(String scheme, int port) {
        if (port == 80 && "http".equals(scheme)) {
            return -1;
        }
        if (port == 443 && "https".equals(scheme)) {
            return -1;
        }
        return port;
    }

    private String serverOrigin(ServerRequest request) {
        var forwardedProto = request.headers().firstHeader("X-Forwarded-Proto");
        var forwardedHost = request.headers().firstHeader("X-Forwarded-Host");
        if (StringUtils.isNotBlank(forwardedProto) && StringUtils.isNotBlank(forwardedHost)) {
            var host = forwardedHost.split(",", 2)[0].trim();
            return normalizeOrigin(forwardedProto.split(",", 2)[0].trim() + "://" + host);
        }
        return normalizeOrigin(request.uri().toString());
    }

    private String clientIp(ServerRequest request) {
        return request.remoteAddress()
            .map(InetSocketAddress::getAddress)
            .map(address -> address == null ? null : address.getHostAddress())
            .filter(StringUtils::isNotBlank)
            .orElseGet(() -> firstHeaderValue(request, "X-Forwarded-For", "X-Real-IP", "Forwarded"));
    }

    private String firstHeaderValue(ServerRequest request, String... names) {
        for (var name : names) {
            var value = request.headers().firstHeader(name);
            if (StringUtils.isNotBlank(value)) {
                return value.split(",", 2)[0].trim();
            }
        }
        return "unknown";
    }

    private String digest(String value) {
        try {
            var messageDigest = MessageDigest.getInstance("SHA-256");
            var hash = messageDigest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash).substring(0, 22);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build rate limiter key", e);
        }
    }

    static List<String> normalizeStringList(Object value, String objectField) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<String> normalized = new ArrayList<>();
        for (var item : list) {
            if (item instanceof String text && StringUtils.isNotBlank(text)) {
                normalized.add(text.trim());
            }
            if (item instanceof java.util.Map<?, ?> map) {
                var nested = map.get(objectField);
                if (nested instanceof String text && StringUtils.isNotBlank(text)) {
                    normalized.add(text.trim());
                }
            }
        }
        return List.copyOf(normalized);
    }
}
