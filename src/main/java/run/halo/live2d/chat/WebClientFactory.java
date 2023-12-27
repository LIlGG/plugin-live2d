package run.halo.live2d.chat;

import org.apache.commons.lang3.StringUtils;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.netty.transport.ProxyProvider;
import run.halo.app.plugin.ReactiveSettingFetcher;

@Component
public class WebClientFactory {
    private final ReactiveSettingFetcher settingFetcher;

    public WebClientFactory(ReactiveSettingFetcher settingFetcher) {
        this.settingFetcher = settingFetcher;
    }

    public Mono<WebClient.Builder> createWebClientBuilder() {
        return settingFetcher.fetch("aichat", ProxyConfig.class)
            .map(proxyConfig -> {
                if (proxyConfig.isProxy()) {
                    return HttpClient.create()
                        .proxy(proxy ->
                            proxy.type(ProxyProvider.Proxy.HTTP)
                                .host(proxyConfig.proxyHost)
                                .port(proxyConfig.proxyPort));
                } else {
                    return HttpClient.create();
                }
            })
            .map(httpClient -> WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
            );
    }

    record ProxyConfig(boolean isProxy, String proxyHost, String baseUrl, int proxyPort) {
        ProxyConfig {
            if (isProxy && StringUtils.isBlank(proxyHost)) {
                throw new IllegalArgumentException("Proxy host must not be blank.");
            }
            if (isProxy && proxyPort <= 0) {
                throw new IllegalArgumentException("Proxy port must be greater than 0.");
            }
        }
    }
}
