<?php

declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

#[AsEventListener(event: KernelEvents::RESPONSE, priority: -10)]
final class SecurityHeadersListener
{
    public function __invoke(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $response = $event->getResponse();
        $request = $event->getRequest();
        $headers = $response->headers;

        // API vrací JSON; v prohlížeči nemá nikdy renderovat HTML. Drakonický CSP
        // chrání před tím, že by někdo otevřel API URL přímo a nakrmil tam payload.
        //
        // Výjimka — `/api/doc*` jsou Swagger UI HTML stránky (Nelmio), které
        // potřebují načíst JS/CSS/img z cdn.jsdelivr.net a spustit inline <script>
        // pro `window.onload = () => loadSwaggerUI(...)`. Pro tyhle endpointy
        // posíláme Swagger-friendly CSP. Reálné API endpointy (`/api/*` mimo doc)
        // dál drží striktní CSP.
        if (!$headers->has('Content-Security-Policy')) {
            $isSwaggerUi = str_starts_with($request->getPathInfo(), '/api/doc');
            if ($isSwaggerUi) {
                $headers->set(
                    'Content-Security-Policy',
                    "default-src 'self'; "
                    . "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                    . "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                    . "img-src 'self' data: https://cdn.jsdelivr.net https://validator.swagger.io; "
                    . "font-src 'self' data: https://cdn.jsdelivr.net; "
                    . "connect-src 'self'; "
                    . "frame-ancestors 'none'; "
                    . "base-uri 'none'"
                );
            } else {
                $headers->set(
                    'Content-Security-Policy',
                    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                );
            }
        }

        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'no-referrer');
        $headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // HSTS jen na HTTPS — na http://localhost by ho prohlížeč ignoroval,
        // ale lépe ho neposílat než ho posílat na špatném protokolu.
        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
        }
    }
}
