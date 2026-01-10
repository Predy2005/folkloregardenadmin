<?php

namespace App\Command;

use App\Entity\Permission;
use App\Entity\Role;
use App\Entity\RolePermission;
use App\Entity\UserRole;
use App\Repository\PermissionRepository;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed-permissions',
    description: 'Seed default permissions and roles'
)]
class SeedPermissionsCommand extends Command
{
    private const MODULES = [
        'dashboard' => [
            'description' => 'Dashboard a statistiky',
            'actions' => ['read'],
        ],
        'reservations' => [
            'description' => 'Rezervace',
            'actions' => ['read', 'create', 'update', 'delete', 'send_email'],
        ],
        'payments' => [
            'description' => 'Platby',
            'actions' => ['read', 'export'],
        ],
        'contacts' => [
            'description' => 'Kontakty',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'foods' => [
            'description' => 'Jídla a menu',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'food_pricing' => [
            'description' => 'Cenové přepisy jídel',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'food_availability' => [
            'description' => 'Dostupnost jídel',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'pricing' => [
            'description' => 'Cenník',
            'actions' => ['read', 'update'],
        ],
        'events' => [
            'description' => 'Akce a eventy',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'users' => [
            'description' => 'Uživatelé systému',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'permissions' => [
            'description' => 'Oprávnění a role',
            'actions' => ['read', 'update'],
        ],
        'staff' => [
            'description' => 'Personál',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'staff_attendance' => [
            'description' => 'Docházka personálu',
            'actions' => ['read', 'create', 'update'],
        ],
        'staffing_formulas' => [
            'description' => 'Staffing vzorce',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'stock_items' => [
            'description' => 'Skladové položky',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'recipes' => [
            'description' => 'Receptury',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'stock_movements' => [
            'description' => 'Pohyby skladu',
            'actions' => ['read', 'create'],
        ],
        'partners' => [
            'description' => 'Partneři',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
        'vouchers' => [
            'description' => 'Vouchery',
            'actions' => ['read', 'create', 'update', 'delete', 'redeem'],
        ],
        'commissions' => [
            'description' => 'Provize',
            'actions' => ['read', 'export'],
        ],
        'cashbox' => [
            'description' => 'Pokladna',
            'actions' => ['read', 'create', 'close'],
        ],
        'disabled_dates' => [
            'description' => 'Blokované termíny',
            'actions' => ['read', 'create', 'update', 'delete'],
        ],
    ];

    private const ROLES = [
        'SUPER_ADMIN' => [
            'displayName' => 'Super Administrátor',
            'description' => 'Plná kontrola nad systémem včetně správy oprávnění',
            'priority' => 100,
            'isSystem' => true,
            'permissions' => '*', // All permissions
        ],
        'ADMIN' => [
            'displayName' => 'Administrátor',
            'description' => 'Plný přístup ke všem modulům (bez správy oprávnění)',
            'priority' => 90,
            'isSystem' => true,
            'permissions' => [
                'dashboard.read',
                'reservations.*',
                'payments.*',
                'contacts.*',
                'foods.*',
                'food_pricing.*',
                'food_availability.*',
                'pricing.*',
                'events.*',
                'users.*',
                'staff.*',
                'staff_attendance.*',
                'staffing_formulas.*',
                'stock_items.*',
                'recipes.*',
                'stock_movements.*',
                'partners.*',
                'vouchers.*',
                'commissions.*',
                'cashbox.*',
                'disabled_dates.*',
            ],
        ],
        'MANAGER' => [
            'displayName' => 'Manažer',
            'description' => 'Rezervace, Eventy, Personál, Pokladna, Reporty',
            'priority' => 70,
            'isSystem' => false,
            'permissions' => [
                'dashboard.read',
                'reservations.*',
                'payments.read',
                'payments.export',
                'contacts.*',
                'foods.read',
                'food_pricing.read',
                'food_availability.read',
                'pricing.read',
                'events.*',
                'staff.*',
                'staff_attendance.*',
                'staffing_formulas.*',
                'stock_items.read',
                'recipes.read',
                'stock_movements.read',
                'partners.*',
                'vouchers.*',
                'commissions.*',
                'cashbox.*',
                'disabled_dates.*',
            ],
        ],
        'STAFF_MANAGER' => [
            'displayName' => 'Vedoucí personálu',
            'description' => 'Personál, Docházka, Staffing',
            'priority' => 50,
            'isSystem' => false,
            'permissions' => [
                'dashboard.read',
                'staff.*',
                'staff_attendance.*',
                'staffing_formulas.*',
            ],
        ],
        'ACCOUNTANT' => [
            'displayName' => 'Účetní',
            'description' => 'Platby, Pokladna, Provize, Vouchery',
            'priority' => 50,
            'isSystem' => false,
            'permissions' => [
                'dashboard.read',
                'reservations.read',
                'payments.*',
                'contacts.read',
                'pricing.read',
                'events.read',
                'partners.*',
                'vouchers.*',
                'commissions.*',
                'cashbox.*',
            ],
        ],
        'RECEPTIONIST' => [
            'displayName' => 'Recepční',
            'description' => 'Rezervace (CRUD), Kontakty, Eventy (read)',
            'priority' => 30,
            'isSystem' => false,
            'permissions' => [
                'dashboard.read',
                'reservations.read',
                'reservations.create',
                'reservations.update',
                'reservations.send_email',
                'payments.read',
                'contacts.*',
                'foods.read',
                'food_pricing.read',
                'food_availability.read',
                'pricing.read',
                'events.read',
                'vouchers.read',
                'disabled_dates.read',
            ],
        ],
        'WAREHOUSE' => [
            'displayName' => 'Skladník',
            'description' => 'Sklad, Receptury',
            'priority' => 30,
            'isSystem' => false,
            'permissions' => [
                'stock_items.*',
                'recipes.*',
                'stock_movements.*',
            ],
        ],
        'VIEWER' => [
            'displayName' => 'Pouze prohlížení',
            'description' => 'Read-only přístup k povoleným modulům',
            'priority' => 10,
            'isSystem' => false,
            'permissions' => [
                'dashboard.read',
                'reservations.read',
                'events.read',
            ],
        ],
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private PermissionRepository $permissionRepository,
        private RoleRepository $roleRepository,
        private UserRepository $userRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('force', 'f', InputOption::VALUE_NONE, 'Force recreation of all permissions and roles')
            ->addOption('assign-super-admin', null, InputOption::VALUE_REQUIRED, 'Assign SUPER_ADMIN role to user by ID');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $force = $input->getOption('force');

        $io->title('Seeding Permissions and Roles');

        // Seed permissions
        $io->section('Creating permissions...');
        $permissionCount = $this->seedPermissions($io, $force);
        $io->success("Created/updated {$permissionCount} permissions");

        // Seed roles
        $io->section('Creating roles...');
        $roleCount = $this->seedRoles($io, $force);
        $io->success("Created/updated {$roleCount} roles");

        // Assign super admin if requested
        $superAdminUserId = $input->getOption('assign-super-admin');
        if ($superAdminUserId) {
            $this->assignSuperAdmin($io, (int)$superAdminUserId);
        }

        $io->success('Permissions and roles seeded successfully!');

        return Command::SUCCESS;
    }

    private function seedPermissions(SymfonyStyle $io, bool $force): int
    {
        $count = 0;

        foreach (self::MODULES as $module => $config) {
            foreach ($config['actions'] as $action) {
                $existing = $this->permissionRepository->findByKey("{$module}.{$action}");

                if ($existing && !$force) {
                    continue;
                }

                if ($existing && $force) {
                    $permission = $existing;
                } else {
                    $permission = new Permission();
                }

                $permission->setModule($module);
                $permission->setAction($action);
                $permission->setDescription($config['description'] . ' - ' . $this->getActionLabel($action));

                $this->em->persist($permission);
                $count++;

                $io->writeln("  - {$module}.{$action}");
            }
        }

        $this->em->flush();
        return $count;
    }

    private function seedRoles(SymfonyStyle $io, bool $force): int
    {
        $count = 0;

        foreach (self::ROLES as $name => $config) {
            $existing = $this->roleRepository->findByName($name);

            if ($existing && !$force) {
                $role = $existing;
            } else {
                $role = $existing ?? new Role();
                $role->setName($name);
                $role->setDisplayName($config['displayName']);
                $role->setDescription($config['description']);
                $role->setPriority($config['priority']);
                $role->setIsSystem($config['isSystem']);

                $this->em->persist($role);
                $this->em->flush();
                $count++;

                $io->writeln("  - {$name} ({$config['displayName']})");
            }

            // Set permissions
            $this->setRolePermissions($role, $config['permissions']);
        }

        $this->em->flush();
        return $count;
    }

    private function setRolePermissions(Role $role, string|array $permissions): void
    {
        // Clear existing permissions
        foreach ($role->getRolePermissions() as $rp) {
            $this->em->remove($rp);
        }
        $this->em->flush();

        // Add new permissions
        $allPermissions = $this->permissionRepository->findAll();

        foreach ($allPermissions as $permission) {
            $key = $permission->getKey();

            $shouldAdd = false;
            if ($permissions === '*') {
                $shouldAdd = true;
            } elseif (is_array($permissions)) {
                foreach ($permissions as $pattern) {
                    if ($pattern === $key) {
                        $shouldAdd = true;
                        break;
                    }
                    // Handle wildcards like 'reservations.*'
                    if (str_ends_with($pattern, '.*')) {
                        $module = substr($pattern, 0, -2);
                        if ($permission->getModule() === $module) {
                            $shouldAdd = true;
                            break;
                        }
                    }
                }
            }

            if ($shouldAdd) {
                $rp = new RolePermission();
                $rp->setRole($role);
                $rp->setPermission($permission);
                $this->em->persist($rp);
            }
        }

        $this->em->flush();
    }

    private function assignSuperAdmin(SymfonyStyle $io, int $userId): void
    {
        $user = $this->userRepository->find($userId);

        if (!$user) {
            $io->error("User with ID {$userId} not found");
            return;
        }

        $role = $this->roleRepository->findByName('SUPER_ADMIN');

        if (!$role) {
            $io->error('SUPER_ADMIN role not found. Run seed first.');
            return;
        }

        // Check if already assigned
        foreach ($user->getUserRoles() as $userRole) {
            if ($userRole->getRole()?->getName() === 'SUPER_ADMIN') {
                $io->info("User {$user->getUsername()} already has SUPER_ADMIN role");
                return;
            }
        }

        $userRole = new UserRole();
        $userRole->setUser($user);
        $userRole->setRole($role);

        $this->em->persist($userRole);
        $this->em->flush();

        $io->success("Assigned SUPER_ADMIN role to user: {$user->getUsername()}");
    }

    private function getActionLabel(string $action): string
    {
        return match ($action) {
            'read' => 'Zobrazení',
            'create' => 'Vytvoření',
            'update' => 'Úprava',
            'delete' => 'Smazání',
            'export' => 'Export',
            'send_email' => 'Odeslání emailu',
            'redeem' => 'Uplatnění',
            'close' => 'Uzavření',
            default => ucfirst($action),
        };
    }
}
