package run.halo.live2d.openai.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.theokanning.openai.OpenAiApi;
import com.theokanning.openai.completion.chat.ChatCompletionChunk;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import io.reactivex.Flowable;
import run.halo.live2d.openai.service.OpenAiService;

public class OpenAIServiceImpl implements OpenAiService {
    private final com.theokanning.openai.service.OpenAiService openAiService;

    public OpenAIServiceImpl(JsonNode openAiConfig) {
        this.openAiService = new com.theokanning.openai.service.OpenAiService();
    }

    @Override
    public ChatCompletionResult createChatCompletion(ChatCompletionRequest request) {
        return openAiService.createChatCompletion(request);
    }

    @Override
    public Flowable<ChatCompletionChunk> streamChatCompletion(ChatCompletionRequest request) {
        return openAiService.streamChatCompletion(request);
    }
}
