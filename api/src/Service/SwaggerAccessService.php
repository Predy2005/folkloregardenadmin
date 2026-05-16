<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Partner;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Správa Swagger UI Basic Auth credentials pro partnery + krátkodobé alias
 * klíče, které Swagger UI po loginu pre-fillne do Authorize dialogu.
 *
 * Architektura:
 *   - Admin v `/partners/{id}/edit` vygeneruje partnerovi Swagger username + heslo.
 *     V DB ukládáme jen `password_hash(..., PASSWORD_BCRYPT)`. Plaintext heslo
 *     se vrací admin UI **jednou** — pak už ne.
 *   - Partner otevře `/api/doc/partner` v prohlížeči. Symfony `http_basic` firewall
 *     ověří username/heslo proti hashy. Po loginu se v Twig šabloně injektuje
 *     krátkodobý **alias API klíč** ve formátu `fgsk_swagger_<base64payload>.<hmac>`,
 *     který `PartnerApiKeyAuthenticator` umí přijmout vedle reálných klíčů.
 *   - Reálný production API klíč partnera v UI nikdy nefiguruje. Alias má TTL
 *     1 hodina a je vázán jen na konkrétní partner ID — když exspiruje, partner
 *     se zalogovává znovu (nebo si refreshne stránku).
 *
 * Bezpečnost:
 *   - Plaintext hesel ani API klíčů se neukládá.
 *   - Alias klíče HMAC-podepsané `APP_SECRET` (sha256). Bez znalosti secretu
 *     útočník nedokáže forge platný alias pro jiného partnera.
 *   - Alias má prefix `fgsk_swagger_` aby šel jednoduše odlišit od production
 *     klíčů (`fgsk_`) v logu / audit trailu.
 */
final class SwaggerAccessService
{
    private const ALIAS_PREFIX = 'fgsk_swagger_';
    private const ALIAS_TTL_SECONDS = 3600;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly string $appSecret,
    ) {}

    /**
     * Vygeneruje nový username + plaintext heslo pro partnera. Heslo se vrací
     * volajícímu **jednou** (admin si ho zkopíruje pro partnera), v DB jen bcrypt hash.
     *
     * @return array{username: string, password: string} Plaintext (admin si ho zkopíruje a předá partnerovi).
     */
    public function generateCredentials(Partner $partner): array
    {
        // Username = `swagger_p<id>_<6hex>` — čitelné, deterministicky vázané na partnera.
        // 6 hex = 24 bitů náhody → kolize prakticky nemožné v rámci jednoho partnera.
        $username = sprintf('swagger_p%d_%s', $partner->getId(), bin2hex(random_bytes(3)));

        // Heslo: 16 znaků URL-safe base64 — dost silné na to, aby brute force
        // přes HTTP Basic byl neproveditelný v rozumném čase.
        $password = rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');

        $partner->setSwaggerUsername($username);
        $partner->setSwaggerPasswordHash(password_hash($password, PASSWORD_BCRYPT));
        $partner->setSwaggerCredentialsGeneratedAt(new \DateTime());

        $this->em->flush();

        return ['username' => $username, 'password' => $password];
    }

    public function revokeCredentials(Partner $partner): void
    {
        $partner->setSwaggerUsername(null);
        $partner->setSwaggerPasswordHash(null);
        $partner->setSwaggerCredentialsGeneratedAt(null);

        $this->em->flush();
    }

    /**
     * Ověří plaintext heslo proti uloženému hashy. Vrací true jen pokud Partner
     * má nastavené credentials a heslo matchuje.
     */
    public function verifyPassword(Partner $partner, string $plaintextPassword): bool
    {
        $hash = $partner->getSwaggerPasswordHash();
        if ($hash === null) {
            return false;
        }
        return password_verify($plaintextPassword, $hash);
    }

    /**
     * Vystaví krátkodobý alias API klíč pro daného partnera. Format:
     *   fgsk_swagger_<base64url(payload)>.<base64url(hmac)>
     *
     * Payload: JSON `{"pid": <partnerId>, "exp": <unixTimestamp>}`.
     *
     * Klíč je vázán na partner ID — když ho útočník zkopíruje, autentizuje se
     * jako ten konkrétní partner. To je akceptovatelné: alias má TTL 1h a získat
     * ho lze jen úspěšným Basic Auth loginem do `/api/doc/partner`. Reálný
     * production klíč zůstává neviditelný.
     */
    public function issueAliasKey(Partner $partner): string
    {
        $payload = [
            'pid' => $partner->getId(),
            'exp' => time() + self::ALIAS_TTL_SECONDS,
        ];
        $payloadJson = json_encode($payload, JSON_THROW_ON_ERROR);
        $payloadB64 = self::base64UrlEncode($payloadJson);

        $signature = hash_hmac('sha256', $payloadB64, $this->appSecret, true);
        $signatureB64 = self::base64UrlEncode($signature);

        return self::ALIAS_PREFIX . $payloadB64 . '.' . $signatureB64;
    }

    /**
     * Ověří alias klíč. Vrací partner ID, pokud je alias platný a nezestaral.
     * Jinak null. Volá ho `PartnerApiKeyAuthenticator` jako druhou cestu vedle
     * standardního SHA-256 lookup.
     */
    public function verifyAliasKey(string $key): ?int
    {
        if (!str_starts_with($key, self::ALIAS_PREFIX)) {
            return null;
        }
        $body = substr($key, strlen(self::ALIAS_PREFIX));
        $parts = explode('.', $body);
        if (count($parts) !== 2) {
            return null;
        }
        [$payloadB64, $signatureB64] = $parts;

        $expectedSignature = hash_hmac('sha256', $payloadB64, $this->appSecret, true);
        $providedSignature = self::base64UrlDecode($signatureB64);
        if ($providedSignature === null || !hash_equals($expectedSignature, $providedSignature)) {
            return null;
        }

        $payloadJson = self::base64UrlDecode($payloadB64);
        if ($payloadJson === null) {
            return null;
        }
        try {
            $payload = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($payload) || !isset($payload['pid'], $payload['exp'])) {
            return null;
        }
        if (!is_int($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }
        if (!is_int($payload['pid'])) {
            return null;
        }
        return $payload['pid'];
    }

    public static function isAliasKey(string $key): bool
    {
        return str_starts_with($key, self::ALIAS_PREFIX);
    }

    private static function base64UrlEncode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $encoded): ?string
    {
        $padded = $encoded . str_repeat('=', (4 - strlen($encoded) % 4) % 4);
        $decoded = base64_decode(strtr($padded, '-_', '+/'), true);
        return $decoded === false ? null : $decoded;
    }
}
