package run.halo.live2d.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.search.HaloDocument;
import run.halo.app.search.SearchOption;
import run.halo.app.search.SearchResult;
import run.halo.app.search.SearchService;

class HaloAgentPresetToolServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void searchHaloResourcesUsesSearchServiceAndMapsBoundedResources() {
        var searchService = mock(SearchService.class);
        var extensionClient = mock(ReactiveExtensionClient.class);
        var service = new HaloAgentPresetToolService(searchService, extensionClient);
        var result = new SearchResult();
        result.setKeyword("Halo");
        result.setTotal(1L);
        result.setHits(List.of(document()));
        when(searchService.search(any(SearchOption.class))).thenReturn(Mono.just(result));

        var output = (Map<String, Object>) service.searchHaloResources(
            Map.of("keyword", "Halo", "includeTypes", List.of("post.content.halo.run")),
            AgentSettings.defaults()).block();

        assertThat(output).containsEntry("ok", true);
        var resources = (List<Map<String, Object>>) output.get("resources");
        assertThat(resources).hasSize(1);
        assertThat(resources.getFirst())
            .containsEntry("resourceId", "post.content.halo.run:demo-post")
            .containsEntry("title", "Demo Post")
            .containsEntry("permalink", "https://example.com/archives/demo");
        verify(searchService).search(any(SearchOption.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void fetchAllowedUrlRequiresAllowedOrigin() {
        var service = new HaloAgentPresetToolService(mock(SearchService.class),
            mock(ReactiveExtensionClient.class));

        var output = (Map<String, Object>) service.fetchAllowedUrl(
            Map.of("url", "https://api.example.com/data"),
            AgentSettings.defaults()).block();

        assertThat(output)
            .containsEntry("ok", false)
            .containsEntry("errorCode", "NETWORK_ACCESS_DENIED");
    }

    @Test
    @SuppressWarnings("unchecked")
    void fetchAllowedUrlRejectsPrivateTargetsEvenWhenAllowed() {
        var service = new HaloAgentPresetToolService(mock(SearchService.class),
            mock(ReactiveExtensionClient.class));
        var settings = new AgentSettings(
            new AgentSettings.AgentBuiltInCapabilities(false, false, false, true,
                AgentCommentCapability.OFF),
            List.of(),
            null,
            null,
            null,
            new AgentSettings.AgentNetworkAccessSettings(
                List.of("http://127.0.0.1"), 4000, 5)
        );

        var output = (Map<String, Object>) service.fetchAllowedUrl(
            Map.of("url", "http://127.0.0.1/secret"), settings).block();

        assertThat(output)
            .containsEntry("ok", false)
            .containsEntry("errorCode", "NETWORK_ACCESS_DENIED")
            .extracting("message")
            .asString()
            .contains("禁止访问");
    }

    private HaloDocument document() {
        var document = new HaloDocument();
        document.setId("doc-1");
        document.setMetadataName("demo-post");
        document.setTitle("Demo Post");
        document.setDescription("Demo Description");
        document.setContent("Demo Content");
        document.setPublished(true);
        document.setExposed(true);
        document.setRecycled(false);
        document.setOwnerName("admin");
        document.setCreationTimestamp(Instant.now());
        document.setUpdateTimestamp(Instant.now());
        document.setPermalink("https://example.com/archives/demo");
        document.setType("post.content.halo.run");
        return document;
    }
}
