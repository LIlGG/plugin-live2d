package run.halo.live2d.chat.client.openai;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import com.theokanning.openai.completion.chat.ChatMessage;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.app.infra.utils.JsonUtils;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.live2d.chat.ChatResult;
import run.halo.live2d.chat.WebClientFactory;
import run.halo.live2d.chat.client.ChatClient;

@Slf4j
@Component
public class OpenAiChatClient implements ChatClient {
    public final static String DEFAULT_OPEN_AI_API_URL = "https://api.openai.com";

    public final static String CHAT_COMPLETION_PATH = "/v1/chat/completions";

    public final static String DEFAULT_MODEL = "gpt-3.5-turbo";

    private final ReactiveSettingFetcher reactiveSettingFetcher;

    private final WebClientFactory webClientFactory;

    public OpenAiChatClient(WebClientFactory webClientFactory,
        ReactiveSettingFetcher reactiveSettingFetcher) {
        this.webClientFactory = webClientFactory;
        this.reactiveSettingFetcher = reactiveSettingFetcher;
    }

    @Override
    public Flux<ServerSentEvent<ChatResult>> generate(List<ChatMessage> messages) {
        return reactiveSettingFetcher.fetch("aichat", OpenAiConfig.class)
            .filter(openAiConfig -> openAiConfig.openAiSetting.isOpenAi)
            .flatMapMany(openAiConfig -> {
                var webClient = webClientFactory
                    .createWebClientBuilder()
                    .map(build -> build.baseUrl(openAiConfig.openAiSetting.openAiBaseUrl)
                        .defaultHeader(HttpHeaders.AUTHORIZATION,
                            "Bearer " + openAiConfig.openAiSetting.openAiToken)
                        .build()
                    );


                var request = ChatCompletionRequest.builder()
                    .model(openAiConfig.openAiSetting.openAiModel)
                    .messages(messages)
                    .stream(true)
                    .build();

                return webClient.flatMapMany(client -> client.post()
                        .uri(CHAT_COMPLETION_PATH)
                        .accept(MediaType.TEXT_EVENT_STREAM)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(JsonUtils.objectToJson(request))
                        .retrieve()
                        .bodyToFlux(String.class))
                    .flatMap(data -> {
                        if (StringUtils.equals("[DONE]", data)) {
                            return Mono.just(ServerSentEvent.builder(ChatResult.finish()).build());
                        }

                        var chatCompletionResult =
                            JsonUtils.jsonToObject(data, ChatCompletionResult.class);
                        if (Objects.nonNull(chatCompletionResult.getChoices())) {
                            var choice = chatCompletionResult.getChoices().get(0);
                            if (StringUtils.isNotBlank(choice.getFinishReason())) {
                                return Flux.empty();
                            }

                            if (Objects.isNull(choice.getMessage())
                                || StringUtils.isEmpty(choice.getMessage().getContent())
                            ) {
                                return Flux.empty();
                            } else {
                                return Mono.just(
                                    ServerSentEvent.builder(
                                            ChatResult.ok(choice.getMessage().getContent()))
                                        .build()
                                );
                            }
                        }
                        return Mono.just(ServerSentEvent.builder(ChatResult.finish()).build());
                    })
                    .onTerminateDetach()
                    .doOnCancel(() -> {
                        // 在中止事件时执行逻辑
                        log.info("Client manually canceled the SSE stream.");
                    });
            });
    }

    @Override
    public Mono<Boolean> supports() {
        return reactiveSettingFetcher.fetch("aichat", OpenAiConfig.class)
            .filter((openAiConfig) -> openAiConfig.openAiSetting.isOpenAi)
            .hasElement();
    }

    record OpenAiConfig(OpenAiSetting openAiSetting){
    }

    record OpenAiSetting(boolean isOpenAi, String openAiToken, String openAiBaseUrl, String openAiModel) {
        OpenAiSetting {
            if (isOpenAi) {
                if (StringUtils.isBlank(openAiToken)) {
                    throw new IllegalArgumentException("OpenAI token must not be blank");
                }

                if (StringUtils.isBlank(openAiBaseUrl)) {
                    openAiBaseUrl = DEFAULT_OPEN_AI_API_URL;
                }

                if (StringUtils.isBlank(openAiModel)) {
                    openAiModel = DEFAULT_MODEL;
                }
            }
        }
    }
}
