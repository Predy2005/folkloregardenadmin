<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\CompanySettings;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CompanySettings>
 */
class CompanySettingsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CompanySettings::class);
    }

    /**
     * Získá výchozí nastavení firmy
     */
    public function getDefault(): ?CompanySettings
    {
        return $this->findOneBy(['code' => 'default']);
    }

    /**
     * Získá nebo vytvoří výchozí nastavení
     */
    public function getOrCreateDefault(): CompanySettings
    {
        $settings = $this->getDefault();

        if ($settings === null) {
            $settings = new CompanySettings();
            $settings->setCode('default');
            $settings->setCompanyName('');
            $settings->setStreet('');
            $settings->setCity('');
            $settings->setZipcode('');
            $settings->setIco('');

            // Persist the new settings (will be flushed by the caller)
            $em = $this->getEntityManager();
            $em->persist($settings);
        }

        return $settings;
    }
}
