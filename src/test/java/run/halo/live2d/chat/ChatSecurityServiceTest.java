package run.halo.live2d.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.reactive.function.server.MockServerRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

class ChatSecurityServiceTest {

    private final RateLimiterRegistry rateLimiterRegistry = RateLimiterRegistry.ofDefaults();
    private final ChatSecurityService service = new ChatSecurityService(rateLimiterRegistry);

    @Test
    void rejectsCrossSiteBrowserRequests() {
        var request = requestBuilder()
            .header("Origin", "https://evil.example")
            .header("Sec-Fetch-Site", "cross-site")
            .build();

        assertThatThrownBy(() -> service.verifyHotlink(request, security()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("403");
    }

    @Test
    void rejectsMissingOriginWhenConfigured() {
        var request = requestBuilder().build();

        assertThatThrownBy(() -> service.verifyHotlink(request, security()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("403");
    }

    @Test
    void allowsSameOriginAndConfiguredOrigins() {
        var sameOrigin = requestBuilder()
            .header("Origin", "https://blog.example")
            .build();
        var allowedOrigin = requestBuilder()
            .header("Origin", "https://app.example")
            .build();

        service.verifyHotlink(sameOrigin, security());
        service.verifyHotlink(allowedOrigin, security());
    }

    @Test
    void rateLimitsAnonymousClientByIp() {
        var request = requestBuilder()
            .header("Origin", "https://blog.example")
            .build();
        var security = new AiChatEndpoint.AiChatSecuritySetting(
            true, false, List.of(), true, 1, 60);

        service.verifyRateLimit(request, security, null);

        assertThatThrownBy(() -> service.verifyRateLimit(request, security, null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("429");
    }

    @Test
    void authenticatedUsersDoNotShareAnonymousLimiter() {
        var request = requestBuilder().build();
        var security = new AiChatEndpoint.AiChatSecuritySetting(
            true, false, List.of(), true, 1, 60);
        var alice = new TestingAuthenticationToken("alice", "password");
        alice.setAuthenticated(true);
        var bob = new TestingAuthenticationToken("bob", "password");
        bob.setAuthenticated(true);

        service.verifyRateLimit(request, security, alice);
        service.verifyRateLimit(request, security, bob);

        assertThatThrownBy(() -> service.verifyRateLimit(request, security, alice))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("429");
    }

    @Test
    void disposeRemovesManagedLimiters() {
        var request = requestBuilder().build();
        var security = new AiChatEndpoint.AiChatSecuritySetting(
            true, false, List.of(), true, 1, 60);

        service.verifyRateLimit(request, security, null);
        assertThat(rateLimiterRegistry.getAllRateLimiters()).hasSize(1);

        service.dispose();

        assertThat(rateLimiterRegistry.getAllRateLimiters()).isEmpty();
    }

    private AiChatEndpoint.AiChatSecuritySetting security() {
        return new AiChatEndpoint.AiChatSecuritySetting(
            true, false, List.of("https://app.example"), true, 20, 60);
    }

    private MockServerRequest.Builder requestBuilder() {
        return MockServerRequest.builder()
            .uri(URI.create("https://blog.example/apis/api.live2d.halo.run/v1alpha1/live2d/ai/chat-process"))
            .remoteAddress(new InetSocketAddress("192.0.2.10", 12345));
    }
}
