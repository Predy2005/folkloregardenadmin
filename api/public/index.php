<?php

use App\Kernel;

// Delší požadavky (AI asistent volá LLM, ten může trvat přes 30s).
// Aplikuje se jen pro endpointy pod /api/assistant aby se ostatní chovaly beze změny.
if (isset($_SERVER['REQUEST_URI']) && str_starts_with((string)$_SERVER['REQUEST_URI'], '/api/assistant')) {
    @ini_set('max_execution_time', '300');
    @set_time_limit(300);
}

require_once dirname(__DIR__) . '/vendor/autoload_runtime.php';

return function (array $context) {
    return new Kernel($context['APP_ENV'], (bool)$context['APP_DEBUG']);
};