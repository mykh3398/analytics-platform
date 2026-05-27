package com.diploma.analytics_platform.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE   = "messages";
    public static final String QUEUE_RAW  = "messages.raw";

    public static final String DLX        = "messages.dlx";
    public static final String DLQ        = "messages.dead";

    public static final String RK_TELEGRAM  = "tg.raw";
    public static final String RK_INSTAGRAM = "ig.raw";
    public static final String RK_FACEBOOK  = "fb.raw";
    public static final String RK_VIBER     = "vb.raw";
    public static final String RK_WHATSAPP  = "wa.raw";
    public static final String BOT_CONTROL_EXCHANGE = "bot-control-exchange";
    public static final String RK_CONTROL_TG   = "control.tg";
    public static final String RK_CONTROL_META = "control.meta";


    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX, true, false);
    }

    @Bean
    public TopicExchange botControlExchange() {
        return new TopicExchange(BOT_CONTROL_EXCHANGE, true, false);
    }


    @Bean
    public Queue rawQueue() {
        return QueueBuilder.durable(QUEUE_RAW)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", "dead")
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean public Binding bindingTelegram(Queue rawQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rawQueue).to(exchange).with(RK_TELEGRAM);
    }
    @Bean public Binding bindingInstagram(Queue rawQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rawQueue).to(exchange).with(RK_INSTAGRAM);
    }
    @Bean public Binding bindingFacebook(Queue rawQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rawQueue).to(exchange).with(RK_FACEBOOK);
    }
    @Bean public Binding bindingViber(Queue rawQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rawQueue).to(exchange).with(RK_VIBER);
    }
    @Bean public Binding bindingWhatsApp(Queue rawQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rawQueue).to(exchange).with(RK_WHATSAPP);
    }

    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with("dead");
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf,
                                         Jackson2JsonMessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(cf);
        template.setMessageConverter(converter);
        return template;
    }
}