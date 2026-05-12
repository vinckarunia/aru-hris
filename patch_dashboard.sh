#!/bin/bash
sed -i 's/public function index(): Response/public function index()/' app/Http/Controllers/DashboardController.php
sed -i 's/        \$cacheTtl = 15; \/\/ 15 seconds cache/        try {\n            \$cacheTtl = 15;/' app/Http/Controllers/DashboardController.php
sed -i 's/            \x27remindersSummary\x27 => \$remindersSummary,\n        \]);\n    }/            \x27remindersSummary\x27 => \$remindersSummary,\n        \]);\n        } catch (\\Throwable \$e) {\n            return response()->json([\x27error\x27 => \$e->getMessage(), \x27line\x27 => \$e->getLine(), \x27file\x27 => \$e->getFile(), \x27trace\x27 => \$e->getTraceAsString()], 500);\n        }\n    }/' app/Http/Controllers/DashboardController.php
