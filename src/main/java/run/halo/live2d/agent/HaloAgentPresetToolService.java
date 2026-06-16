package run.halo.live2d.agent;

import java.io.IOException;
import java.io.InputStream;
import java.net.IDN;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.Duration;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import run.halo.app.core.extension.content.Category;
import run.halo.app.core.extension.content.Post;
import run.halo.app.core.extension.content.SinglePage;
import run.halo.app.core.extension.content.Tag;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.search.HaloDocument;
import run.halo.app.search.SearchOption;
import run.halo.app.search.SearchService;

@Component
@RequiredArgsConstructor
public class HaloAgentPresetToolService {
    public static final String TYPE_POST = "post.content.halo.run";
    public static final String TYPE_SINGLE_PAGE = "singlepage.content.halo.run";
    public static final String TYPE_CATEGORY = "category.content.halo.run";
    public static final String TYPE_TAG = "tag.content.halo.run";

    private final SearchService searchService;
    private final ReactiveExtensionClient extensionClient;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NEVER)
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    public Mono<Object> searchHaloResources(Map<String, Object> input, AgentSettings settings) {
        var keyword = stringInput(input, "keyword");
        if (StringUtils.isBlank(keyword)) {
            return Mono.just(failure("INVALID_INPUT", "keyword is required"));
        }
        var search = settings.haloSearch();
        var allowedTypes = new HashSet<>(search.normalizedAllowedTypes());
        var requestedTypes = stringList(input.get("includeTypes"));
        var includeTypes = requestedTypes.isEmpty()
            ? List.copyOf(allowedTypes)
            : requestedTypes.stream().filter(allowedTypes::contains).toList();

        var option = new SearchOption();
        option.setKeyword(keyword);
        option.setLimit(limit(input, search.normalizedDefaultLimit(), 1, 20));
        option.setFilterExposed(true);
        option.setFilterPublished(true);
        option.setFilterRecycled(false);
        option.setIncludeTypes(includeTypes);
        option.setHighlightPreTag("");
        option.setHighlightPostTag("");
        return searchService.search(option)
            .map(result -> Map.of(
                "ok", true,
                "keyword", keyword,
                "total", result.getTotal() == null ? 0 : result.getTotal(),
                "resources", result.getHits() == null ? List.of()
                    : result.getHits().stream().map(this::fromDocument).toList()
            ));
    }

    public Mono<Object> getHaloResourceDetail(Map<String, Object> input, AgentSettings settings) {
        var resourceId = stringInput(input, "resourceId");
        if (StringUtils.isBlank(resourceId)) {
            return Mono.just(failure("INVALID_INPUT", "resourceId is required"));
        }
        var parts = resourceId.split(":", 2);
        if (parts.length != 2) {
            return Mono.just(failure("INVALID_RESOURCE", "resourceId is invalid"));
        }
        var maxChars = settings.haloResourceDetail().maxContentChars();
        if (TYPE_POST.equals(parts[0])) {
            return extensionClient.fetch(Post.class, parts[1])
                .filter(this::isPublicPost)
                .map(post -> detailFromPost(post, maxChars))
                .cast(Object.class)
                .defaultIfEmpty(failure("RESOURCE_NOT_FOUND", "post is not available"));
        }
        if (TYPE_SINGLE_PAGE.equals(parts[0])) {
            return extensionClient.fetch(SinglePage.class, parts[1])
                .filter(this::isPublicPage)
                .map(page -> detailFromPage(page, maxChars))
                .cast(Object.class)
                .defaultIfEmpty(failure("RESOURCE_NOT_FOUND", "page is not available"));
        }
        return Mono.just(failure("UNSUPPORTED_RESOURCE", "resource type is not supported"));
    }

    public Mono<Object> getLatestHaloResources(Map<String, Object> input) {
        var limit = limit(input, 5, 1, 20);
        return extensionClient.list(Post.class, this::isPublicPost,
                Comparator.comparing(this::postTime, Comparator.nullsLast(Comparator.naturalOrder()))
                    .reversed())
            .take(limit)
            .map(this::fromPost)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> getCategories(Map<String, Object> input) {
        var limit = limit(input, 20, 1, 100);
        return extensionClient.list(Category.class, category -> !category.isDeleted(),
                Comparator.comparing(category -> category.getSpec().getDisplayName(),
                    Comparator.nullsLast(String::compareToIgnoreCase)))
            .take(limit)
            .map(this::fromCategory)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> getTags(Map<String, Object> input) {
        var limit = limit(input, 20, 1, 100);
        return extensionClient.list(Tag.class, tag -> true,
                Comparator.comparing(tag -> tag.getSpec().getDisplayName(),
                    Comparator.nullsLast(String::compareToIgnoreCase)))
            .take(limit)
            .map(this::fromTag)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> getPostsByCategory(Map<String, Object> input) {
        var category = stringInput(input, "categoryName");
        var limit = limit(input, 10, 1, 20);
        return extensionClient.list(Post.class,
                post -> isPublicPost(post) && contains(post.getSpec().getCategories(), category),
                Comparator.comparing(this::postTime, Comparator.nullsLast(Comparator.naturalOrder()))
                    .reversed())
            .take(limit)
            .map(this::fromPost)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> getPostsByTag(Map<String, Object> input) {
        var tag = stringInput(input, "tagName");
        var limit = limit(input, 10, 1, 20);
        return extensionClient.list(Post.class,
                post -> isPublicPost(post) && contains(post.getSpec().getTags(), tag),
                Comparator.comparing(this::postTime, Comparator.nullsLast(Comparator.naturalOrder()))
                    .reversed())
            .take(limit)
            .map(this::fromPost)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> getPages(Map<String, Object> input) {
        var limit = limit(input, 20, 1, 100);
        return extensionClient.list(SinglePage.class, this::isPublicPage,
                Comparator.comparing(page -> page.getSpec().getTitle(),
                    Comparator.nullsLast(String::compareToIgnoreCase)))
            .take(limit)
            .map(this::fromPage)
            .collectList()
            .map(resources -> Map.of("ok", true, "resources", resources));
    }

    public Mono<Object> fetchAllowedUrl(Map<String, Object> input, AgentSettings settings) {
        return Mono.fromCallable(() -> validateNetworkTarget(stringInput(input, "url"), settings))
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(target -> {
                var request = HttpRequest.newBuilder(target.uri())
                    .GET()
                    .timeout(Duration.ofSeconds(
                        settings.networkAccess().normalizedTimeoutSeconds()))
                    .header("Accept", "text/plain, application/json, application/xml, text/*;q=0.9, */*;q=0.1")
                    .header("User-Agent", "Halo-Live2D-Agent/1.0")
                    .build();
                return Mono.fromFuture(httpClient.sendAsync(request,
                        HttpResponse.BodyHandlers.ofInputStream()))
                    .map(response -> readNetworkResponse(response,
                        settings.networkAccess().normalizedMaxResponseChars()))
                    .cast(Object.class);
            })
            .onErrorResume(IllegalArgumentException.class,
                throwable -> Mono.just(failure("NETWORK_ACCESS_DENIED", throwable.getMessage())))
            .onErrorResume(IOException.class,
                throwable -> Mono.just(failure("NETWORK_READ_FAILED", "网络响应读取失败")))
            .onErrorResume(Exception.class,
                throwable -> Mono.just(failure("NETWORK_REQUEST_FAILED", "后端网络请求失败")));
    }

    public Object commentUnavailable(String message) {
        return failure("COMMENT_FLOW_REQUIRED", message);
    }

    private Map<String, Object> fromDocument(HaloDocument document) {
        return resource(
            document.getType() + ":" + document.getMetadataName(),
            document.getType(),
            document.getMetadataName(),
            document.getTitle(),
            StringUtils.defaultIfBlank(document.getDescription(), excerpt(document.getContent(), 220)),
            document.getPermalink()
        );
    }

    private Map<String, Object> fromPost(Post post) {
        return resource(
            TYPE_POST + ":" + post.getMetadata().getName(),
            TYPE_POST,
            post.getMetadata().getName(),
            post.getSpec().getTitle(),
            excerpt(StringUtils.defaultIfBlank(post.getStatusOrDefault().getExcerpt(),
                Optional.ofNullable(post.getSpec().getExcerpt()).map(Post.Excerpt::getRaw).orElse(null)), 220),
            post.getStatusOrDefault().getPermalink()
        );
    }

    private Map<String, Object> fromPage(SinglePage page) {
        return resource(
            TYPE_SINGLE_PAGE + ":" + page.getMetadata().getName(),
            TYPE_SINGLE_PAGE,
            page.getMetadata().getName(),
            page.getSpec().getTitle(),
            excerpt(StringUtils.defaultIfBlank(page.getStatusOrDefault().getExcerpt(),
                Optional.ofNullable(page.getSpec().getExcerpt()).map(Post.Excerpt::getRaw).orElse(null)), 220),
            page.getStatusOrDefault().getPermalink()
        );
    }

    private Map<String, Object> fromCategory(Category category) {
        return resource(
            TYPE_CATEGORY + ":" + category.getMetadata().getName(),
            TYPE_CATEGORY,
            category.getMetadata().getName(),
            category.getSpec().getDisplayName(),
            category.getSpec().getDescription(),
            category.getStatusOrDefault().getPermalink()
        );
    }

    private Map<String, Object> fromTag(Tag tag) {
        return resource(
            TYPE_TAG + ":" + tag.getMetadata().getName(),
            TYPE_TAG,
            tag.getMetadata().getName(),
            tag.getSpec().getDisplayName(),
            tag.getSpec().getDescription(),
            tag.getStatusOrDefault().getPermalink()
        );
    }

    private Map<String, Object> detailFromPost(Post post, int maxChars) {
        var content = excerpt(StringUtils.defaultIfBlank(post.getStatusOrDefault().getExcerpt(),
            Optional.ofNullable(post.getSpec().getExcerpt()).map(Post.Excerpt::getRaw).orElse("")), maxChars);
        return Map.of("ok", true, "resource", fromPost(post), "content", content,
            "truncated", content.length() >= maxChars);
    }

    private Map<String, Object> detailFromPage(SinglePage page, int maxChars) {
        var content = excerpt(StringUtils.defaultIfBlank(page.getStatusOrDefault().getExcerpt(),
            Optional.ofNullable(page.getSpec().getExcerpt()).map(Post.Excerpt::getRaw).orElse("")), maxChars);
        return Map.of("ok", true, "resource", fromPage(page), "content", content,
            "truncated", content.length() >= maxChars);
    }

    private Map<String, Object> resource(String id, String type, String metadataName, String title,
        String excerpt, String permalink) {
        return Map.of(
            "resourceId", id,
            "resourceType", type,
            "metadataName", metadataName,
            "title", StringUtils.defaultString(title),
            "excerpt", StringUtils.defaultString(excerpt),
            "permalink", StringUtils.defaultString(permalink)
        );
    }

    private Map<String, Object> failure(String code, String message) {
        return Map.of("ok", false, "errorCode", code, "message", message);
    }

    private NetworkTarget validateNetworkTarget(String rawUrl, AgentSettings settings) {
        if (StringUtils.isBlank(rawUrl)) {
            throw new IllegalArgumentException("url is required");
        }
        URI uri;
        try {
            uri = new URI(rawUrl.trim()).normalize();
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("url is invalid");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())
            && !"http".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("只允许访问 http 或 https URL");
        }
        if (StringUtils.isNotBlank(uri.getUserInfo())) {
            throw new IllegalArgumentException("URL 不能包含用户信息");
        }
        var host = StringUtils.trimToNull(uri.getHost());
        if (host == null) {
            throw new IllegalArgumentException("URL host is required");
        }
        var normalizedOrigin = originOf(uri);
        var allowedOrigins = settings.networkAccess().normalizedAllowedOrigins().stream()
            .map(this::normalizeOrigin)
            .flatMap(Optional::stream)
            .toList();
        if (allowedOrigins.isEmpty() || !allowedOrigins.contains(normalizedOrigin)) {
            throw new IllegalArgumentException("URL Origin 未被站长允许");
        }
        if (isDangerousHost(host)) {
            throw new IllegalArgumentException("禁止访问 localhost、内网或链路本地地址");
        }
        try {
            for (var address : InetAddress.getAllByName(host)) {
                if (isDangerousAddress(address)) {
                    throw new IllegalArgumentException("禁止访问 localhost、内网或链路本地地址");
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("无法解析目标地址");
        }
        return new NetworkTarget(uri, normalizedOrigin);
    }

    private Map<String, Object> readNetworkResponse(HttpResponse<InputStream> response,
        int maxChars) {
        try (var body = response.body()) {
            var bytes = body.readNBytes(maxChars + 1);
            var truncated = bytes.length > maxChars;
            var length = Math.min(bytes.length, maxChars);
            var text = new String(bytes, 0, length, StandardCharsets.UTF_8);
            return Map.of(
                "ok", true,
                "url", response.uri().toString(),
                "status", response.statusCode(),
                "contentType", response.headers().firstValue("content-type").orElse(""),
                "body", text,
                "truncated", truncated
            );
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private Optional<String> normalizeOrigin(String rawOrigin) {
        if (StringUtils.isBlank(rawOrigin)) {
            return Optional.empty();
        }
        try {
            return Optional.of(originOf(new URI(rawOrigin.trim())));
        } catch (URISyntaxException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private String originOf(URI uri) {
        var scheme = StringUtils.lowerCase(uri.getScheme(), Locale.ROOT);
        var host = IDN.toASCII(uri.getHost()).toLowerCase(Locale.ROOT);
        var port = uri.getPort();
        var defaultPort = "https".equals(scheme) ? 443 : 80;
        return port < 0 || port == defaultPort
            ? scheme + "://" + host
            : scheme + "://" + host + ":" + port;
    }

    private boolean isDangerousHost(String host) {
        var normalized = host.toLowerCase(Locale.ROOT);
        return "localhost".equals(normalized)
            || normalized.endsWith(".localhost")
            || normalized.endsWith(".local");
    }

    private boolean isDangerousAddress(InetAddress address) {
        return address.isAnyLocalAddress()
            || address.isLoopbackAddress()
            || address.isLinkLocalAddress()
            || address.isSiteLocalAddress()
            || address.isMulticastAddress()
            || isUniqueLocalIpv6(address);
    }

    private boolean isUniqueLocalIpv6(InetAddress address) {
        if (!(address instanceof Inet6Address)) {
            return false;
        }
        var firstByte = address.getAddress()[0] & 0xff;
        return (firstByte & 0xfe) == 0xfc;
    }

    private boolean isPublicPost(Post post) {
        return post != null
            && post.getSpec() != null
            && post.isPublished()
            && !post.isDeleted()
            && Post.isPublic(post.getSpec());
    }

    private boolean isPublicPage(SinglePage page) {
        return page != null
            && page.getSpec() != null
            && page.isPublished()
            && !Boolean.TRUE.equals(page.getSpec().getDeleted())
            && (page.getSpec().getVisible() == null
            || Post.VisibleEnum.PUBLIC.equals(page.getSpec().getVisible()));
    }

    private Instant postTime(Post post) {
        return Optional.ofNullable(post.getSpec().getPublishTime())
            .orElse(post.getMetadata().getCreationTimestamp());
    }

    private boolean contains(List<String> values, String value) {
        return StringUtils.isBlank(value)
            || values != null && values.stream().anyMatch(item -> Objects.equals(item, value));
    }

    private int limit(Map<String, Object> input, int defaultValue, int min, int max) {
        var value = input == null ? null : input.get("limit");
        int parsed = value instanceof Number number ? number.intValue() : defaultValue;
        return Math.max(min, Math.min(max, parsed));
    }

    private String stringInput(Map<String, Object> input, String key) {
        var value = input == null ? null : input.get(key);
        return value == null ? null : StringUtils.trimToNull(String.valueOf(value));
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .filter(StringUtils::isNotBlank)
            .toList();
    }

    private String excerpt(String content, int maxChars) {
        var text = StringUtils.defaultString(content).replaceAll("\\s+", " ").trim();
        if (text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars);
    }

    private record NetworkTarget(URI uri, String origin) {
    }
}
