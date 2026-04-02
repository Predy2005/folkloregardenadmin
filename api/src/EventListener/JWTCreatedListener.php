<?php

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Symfony\Component\HttpFoundation\RequestStack;

class JWTCreatedListener
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {}

    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $request = $this->requestStack->getCurrentRequest();
        if (!$request) {
            return;
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $rememberMe = $data['rememberMe'] ?? false;

        $payload = $event->getData();

        if ($rememberMe) {
            // 7 days for "remember me"
            $payload['exp'] = (new \DateTime('+7 days'))->getTimestamp();
        }
        // Default 24h is handled by lexik_jwt_authentication.yaml token_ttl

        $event->setData($payload);
    }
}
