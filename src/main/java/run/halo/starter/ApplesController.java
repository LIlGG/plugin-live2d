package run.halo.starter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ApiVersion;

/**
 * @author guqing
 * @since 2.0.0
 */
@ApiVersion("v1alpha1")
@RestController
@RequestMapping("apples")
public class ApplesController {

    @GetMapping
    public Mono<String> hello() {
        return Mono.just("Hello world");
    }
}
