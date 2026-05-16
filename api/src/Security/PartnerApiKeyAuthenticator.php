<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\Partner;
use App\Repository\PartnerRepository;
use App\Service\PartnerApiKeyService;
use App\Service\SwaggerAccessService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

/**
 * Custom authenticator pro partner API klíče.
 *
 * Postup:
 *   1. Čte hlavičku `X-API-Key` z requestu.
 *   2. SHA-256 hashuje příchozí klíč (plaintext nikdy nedrží v paměti déle než nutné).
 *   3. Dohledá Partner přes `apiKeyHash` (unikátní partial index).
 *   4. Audit: zapíše `apiKeyLastUsedAt = NOW()`.
 *   5. Vrátí `PartnerSecurityUser` jako autentizovaný user.
 *
 * Při neúspěchu vrací 401 s JSON `{ error, message }`. Žádné WWW-Authenticate
 * — partneři API key nedohádují přes prohlížeč.
 */
final class PartnerApiKeyAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private readonly PartnerRepository $partners,
        private readonly PartnerApiKeyService $apiKeys,
        private readonly SwaggerAccessService $swaggerAccess,
        private readonly EntityManagerInterface $em,
    ) {}

    public function supports(Request $request): ?bool
    {
        // Authenticator běží na všech /api/partner-api requestech (i pro chybějící
        // hlavičku, ať umíme vrátit JSON 401 místo Symfony HTML error page).
        // /api/doc/partner je PUBLIC — tam authenticator NEběží, Swagger UI se
        // načte komukoli a partner v něm Authorize → vloží klíč → JS posílá
        // X-API-Key na /api/partner-api/* endpointy.
        return str_starts_with($request->getPathInfo(), '/api/partner-api');
    }

    public function authenticate(Request $request): Passport
    {
        $key = trim((string) $request->headers->get('X-API-Key', ''));
        if ($key === '') {
            throw new CustomUserMessageAuthenticationException('Chybí nebo prázdná X-API-Key hlavička.');
        }

        // Cesta A: krátkodobý alias `fgsk_swagger_*` vystavený Swagger UI po
        // úspěšném Basic Auth loginu. HMAC-podepsaný APP_SECRETem, TTL 1h.
        // Reálný production hash v DB nehledáme — partner ID je v payloadu.
        if (SwaggerAccessService::isAliasKey($key)) {
            $partnerId = $this->swaggerAccess->verifyAliasKey($key);
            if ($partnerId === null) {
                throw new CustomUserMessageAuthenticationException('Neplatný nebo expirovaný Swagger alias klíč.');
            }
            return new SelfValidatingPassport(
                new UserBadge((string) $partnerId, function (string $idLookup): PartnerSecurityUser {
                    $partner = $this->partners->find((int) $idLookup);
                    if (!$partner instanceof Partner || !$partner->isActive()) {
                        throw new CustomUserMessageAuthenticationException('Partner neexistuje nebo je deaktivován.');
                    }
                    // U alias klíčů NEUPDATUJEME `apiKeyLastUsedAt` — alias je
                    // Swagger UI provoz, ne reálné production volání.
                    return new PartnerSecurityUser($partner);
                })
            );
        }

        // Cesta B: standardní production API klíč. SHA-256 hash → DB lookup.
        $hash = $this->apiKeys->hash($key);

        return new SelfValidatingPassport(
            new UserBadge($hash, function (string $hashLookup): PartnerSecurityUser {
                $partner = $this->partners->findOneBy(['apiKeyHash' => $hashLookup]);
                if (!$partner instanceof Partner || !$partner->isActive()) {
                    throw new CustomUserMessageAuthenticationException('Neplatný nebo zneplatněný API klíč.');
                }

                $partner->setApiKeyLastUsedAt(new \DateTime());
                $this->em->flush();

                return new PartnerSecurityUser($partner);
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse([
            'error' => 'authentication_required',
            'message' => $exception->getMessageKey(),
        ], Response::HTTP_UNAUTHORIZED);
    }
}
