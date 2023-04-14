package run.halo.live2d.openai.service;

import com.theokanning.openai.completion.chat.ChatCompletionChunk;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import io.reactivex.Flowable;

public interface OpenAiService {
    ChatCompletionResult createChatCompletion(ChatCompletionRequest request);

    Flowable<ChatCompletionChunk> streamChatCompletion(ChatCompletionRequest request);
}
