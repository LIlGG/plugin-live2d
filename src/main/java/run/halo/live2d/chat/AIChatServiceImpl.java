package run.halo.live2d.chat;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.aifoundation.AiModelService;
import run.halo.aifoundation.chat.GenerateTextRequest;
import run.halo.aifoundation.chat.ReasoningOptions;
import run.halo.aifoundation.exception.ModelDisabledException;
import run.halo.aifoundation.exception.ModelNotFoundException;
import run.halo.aifoundation.exception.ProviderApiException;
import run.halo.aifoundation.exception.ProviderDisabledException;
import run.halo.aifoundation.message.ModelMessage;
import run.halo.aifoundation.part.PartType;
import run.halo.aifoundation.part.TextStreamPart;
import run.halo.app.plugin.extensionpoint.ExtensionGetter;

@Slf4j
@Component
@RequiredArgsConstructor
public class AIChatServiceImpl implements AiChatService {

    private final ExtensionGetter extensionGetter;

    private Mono<AiModelService> aiModelService() {
        return extensionGetter.getEnabledExtension(AiModelService.class);
    }

    @Override
    public Flux<ServerSentEvent<ChatResult>> streamChatCompletion(String modelName,
        List<ModelMessage> messages) {
        if (StringUtils.isBlank(modelName)) {
            return Flux.just(buildEvent(ChatResult.error("请先在插件设置中配置 Halo AI 模型")));
        }

        var request = GenerateTextRequest.builder()
            .messages(messages)
            .reasoning(ReasoningOptions.disabled())
            .build();

        log.debug("Stream Halo AI chat completion with model: {}, messages: {}", modelName,
            messages);

        return aiModelService()
            .flatMap(service -> service.languageModel(modelName))
            .flatMapMany(model -> model.streamText(request).fullStream())
            .concatMap(this::adaptStreamPart)
            .onErrorResume(throwable -> {
                log.error("Error occurred while generating Halo AI chat result, model: {}",
                    modelName,
                    throwable);
                return Flux.just(buildEvent(ChatResult.error(resolveErrorMessage(throwable))));
            });
    }

    private Flux<ServerSentEvent<ChatResult>> adaptStreamPart(TextStreamPart part) {
        if (part == null || part.getType() == null) {
            return Flux.empty();
        }

        return switch (part.getType()) {
            case PartType.TEXT_DELTA -> adaptTextDelta(part);
            case PartType.ERROR -> Flux.just(buildEvent(ChatResult.error(
                StringUtils.defaultIfBlank(part.getErrorText(),
                    "对话接口异常了哦～快去联系我的主人吧！"))));
            case PartType.FINISH, PartType.ABORT -> Flux.just(buildEvent(ChatResult.finish()));
            default -> Flux.empty();
        };
    }

    private Flux<ServerSentEvent<ChatResult>> adaptTextDelta(TextStreamPart part) {
        if (StringUtils.isBlank(part.getDelta())) {
            return Flux.empty();
        }
        return Flux.just(buildEvent(ChatResult.ok(part.getDelta())));
    }

    private ServerSentEvent<ChatResult> buildEvent(ChatResult result) {
        return ServerSentEvent.builder(result).build();
    }

    private String resolveErrorMessage(Throwable throwable) {
        if (throwable instanceof ModelNotFoundException
            || throwable instanceof ModelDisabledException) {
            return "当前配置的 Halo AI 模型不可用，请联系站长检查配置";
        }
        if (throwable instanceof ProviderDisabledException) {
            return "Halo AI 提供商未启用，请联系站长检查配置";
        }
        if (throwable instanceof ProviderApiException) {
            return "Halo AI 提供商调用失败，请稍后再试";
        }
        if (throwable instanceof IllegalStateException) {
            return "AI 基础设施未启用，请联系站长";
        }
        return StringUtils.defaultIfBlank(throwable.getMessage(),
            "对话接口异常了哦～快去联系我的主人吧！");
    }
}
