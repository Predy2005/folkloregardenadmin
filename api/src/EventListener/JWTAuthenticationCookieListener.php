<?php

declare(strict_types=1);

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Http\Event\LogoutEvent;

/**
 * Phase A §1.2 — Po úspěšném loginu nastaví httpOnly cookie `auth_token` s JWT.
 * Po logoutu cookie expiruje.
 *
 * Stávající flow (FE čte token z JSON response body a ukládá do localStorage)
 * pokračuje beze změny. Cookie je **paralelní kanál** — Lexik token extractor
 * ho přijme stejně jako Authorization header (viz `lexik_jwt_authentication.yaml`).
 *
 * Migrace na cookie-only (Phase B) bude jen FE refactor — vypnout `Authorization`
 * header v `client/src/shared/lib/api.ts` interceptoru a zapnout `withCredentials`,
 * smazat `localStorage.getItem("auth_token")`. BE už bude připravený.
 *
 * Bezpečnost:
 *   - `HttpOnly` — JS k cookie nepřistoupí (XSS surface zmenšen).
 *   - `Secure` — jen HTTPS (v dev na localhost browser ignoruje).
 *   - `SameSite=Lax` — kompatibilní s běžným SPA flow (login formulář
 *     odesílá POST z `/login` na `/auth/login` na stejném origin).
 *   - TTL 86400s (24h) — shodný s `token_ttl` v `lexik_jwt_authentication.yaml`.
 */
final class JWTAuthenticationCookieListener
{
    private const COOKIE_NAME = 'auth_token';
    private const COOKIE_TTL_SECONDS = 86400;

    public function __construct(private readonly RequestStack $requestStack) {}

    #[AsEventListener(event: 'lexik_jwt_authentication.on_authentication_success')]
    public function onAuthenticationSuccess(AuthenticationSuccessEvent $event): void
    {
        $data = $event->getData();
        $token = $data['token'] ?? null;
        if (!is_string($token) || $token === '') {
            return;
        }

        $cookie = Cookie::create(
            name: self::COOKIE_NAME,
            value: $token,
            expire: time() + self::COOKIE_TTL_SECONDS,
            path: '/',
            domain: null,
            secure: $this->isSecure(),
            httpOnly: true,
            raw: false,
            sameSite: Cookie::SAMESITE_LAX,
        );

        $event->getResponse()->headers->setCookie($cookie);
    }

    #[AsEventListener(event: LogoutEvent::class)]
    public function onLogout(LogoutEvent $event): void
    {
        $response = $event->getResponse();
        if ($response === null) {
            return;
        }

        // Expirovaná cookie se stejným name/path → browser ji smaže.
        $response->headers->clearCookie(
            name: self::COOKIE_NAME,
            path: '/',
            domain: null,
            secure: $this->isSecure(),
            httpOnly: true,
            sameSite: Cookie::SAMESITE_LAX,
        );
    }

    /**
     * Na HTTP localhost (dev) `Secure` flag chromium drops — vrátíme false,
     * aby cookie šla nastavit. V prod proti HTTPS vždy true.
     */
    private function isSecure(): bool
    {
        $request = $this->requestStack->getCurrentRequest();
        return $request?->isSecure() ?? true;
    }
}
