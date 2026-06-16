package run.halo.live2d.chat;

import reactor.core.publisher.Mono;
import run.halo.aifoundation.ui.UIMessageChatRequest;
import run.halo.aifoundation.ui.UIMessageStreamResponse;
import run.halo.live2d.agent.AgentToolSet;

public interface AiChatService {

    Mono<UIMessageStreamResponse> streamChatCompletion(String modelName, String systemMessage,
        UIMessageChatRequest<Void> chatRequest, AgentToolSet agentToolSet);

    UIMessageStreamResponse errorResponse(String message);
}
