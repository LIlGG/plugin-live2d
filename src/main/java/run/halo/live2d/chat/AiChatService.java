package run.halo.live2d.chat;

import reactor.core.publisher.Mono;
import run.halo.aifoundation.ui.UIMessageChatRequest;
import run.halo.aifoundation.ui.UIMessageStreamResponse;

public interface AiChatService {

    Mono<UIMessageStreamResponse> streamChatCompletion(String modelName, String systemMessage,
        UIMessageChatRequest<Void> chatRequest);

    UIMessageStreamResponse errorResponse(String message);
}
