package run.halo.live2d.chat;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import run.halo.aifoundation.AiModelService;
import run.halo.aifoundation.chat.StopCondition;
import run.halo.aifoundation.exception.ModelDisabledException;
import run.halo.aifoundation.exception.ModelNotFoundException;
import run.halo.aifoundation.exception.ProviderApiException;
import run.halo.aifoundation.exception.ProviderDisabledException;
import run.halo.aifoundation.ui.InvalidUIMessageException;
import run.halo.aifoundation.ui.UIMessageChatHandlers;
import run.halo.aifoundation.ui.UIMessageChatRequest;
import run.halo.aifoundation.ui.UIMessageChunks;
import run.halo.aifoundation.ui.UIMessageStreamResponse;
import run.halo.aifoundation.ui.UIMessageStreams;
import run.halo.aifoundation.tool.ToolChoice;
import run.halo.app.plugin.extensionpoint.ExtensionGetter;
import run.halo.live2d.agent.AgentToolSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class AIChatServiceImpl implements AiChatService {

    private final ExtensionGetter extensionGetter;

    private Mono<AiModelService> aiModelService() {
        return extensionGetter.getEnabledExtension(AiModelService.class);
    }

    @Override
    public Mono<UIMessageStreamResponse> streamChatCompletion(String modelName,
        String systemMessage, UIMessageChatRequest<Void> chatRequest, AgentToolSet agentToolSet) {
        if (StringUtils.isBlank(modelName)) {
            return Mono.just(errorResponse("请先在插件设置中配置 Halo AI 模型"));
        }

        return aiModelService()
            .flatMap(service -> service.languageModel(modelName))
            .map(model -> {
                var chat = UIMessageChatHandlers.<Void>streamText(options -> options
                    .model(model)
                    .chatRequest(chatRequest)
                    .request(builder -> builder
                        .system(systemMessage)
                        .tools(agentToolSet == null ? null : agentToolSet.tools())
                        .toolChoice(agentToolSet == null || agentToolSet.tools().isEmpty()
                            ? ToolChoice.none()
                            : ToolChoice.auto())
                        .stopWhen(agentToolSet == null || agentToolSet.tools().isEmpty()
                            ? null
                            : StopCondition.stepCountIs(3)))
                    .onError(this::resolveErrorMessage));
                return chat.response();
            })
            .onErrorResume(throwable -> {
                logChatError(modelName, throwable);
                return Mono.just(errorResponse(resolveErrorMessage(throwable)));
            });
    }

    @Override
    public UIMessageStreamResponse errorResponse(String message) {
        var stream = UIMessageStreams.create(writer -> writer.write(UIMessageChunks.error(
            resolveErrorMessageText(message))));
        return new UIMessageStreamResponse(stream);
    }

    private String resolveErrorMessageText(String message) {
        return StringUtils.defaultIfBlank(message, "对话接口异常了哦～快去联系我的主人吧！");
    }

    private String resolveErrorMessage(Throwable throwable) {
        if (throwable instanceof InvalidUIMessageException) {
            return "对话上下文异常了，请刷新后重试";
        }
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

    private void logChatError(String modelName, Throwable throwable) {
        if (throwable instanceof InvalidUIMessageException invalid) {
            log.error("Invalid Halo UI messages for model: {}, issues: {}", modelName,
                invalid.issues(), throwable);
            return;
        }
        log.error("Error occurred while generating Halo AI chat result, model: {}",
            modelName, throwable);
    }
}
