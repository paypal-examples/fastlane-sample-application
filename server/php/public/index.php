<?php

use App\Kernel;
use Symfony\Component\Filesystem\Filesystem;

require_once dirname(__DIR__) . "/vendor/autoload_runtime.php";

return function (array $context) {
    $fileSystem = new Filesystem();

    $STATIC_FILES_FOLDER = __DIR__ . "/../../../client";

    $files = scandir($STATIC_FILES_FOLDER);

    foreach ($files as $file) {
        if ($file === "." || $file === "..") {
            continue;
        }

        $sourceFile = $STATIC_FILES_FOLDER . "/" . $file;
        $destFile = "./" . $file;

        try {
            if (file_exists($destFile)) {
                continue;
            }

            if (is_file($sourceFile)) {
                $fileSystem->copy($sourceFile, $destFile);
            }
        } catch (\Exception $e) {
            echo $e->getMessage();
        }
    }

    return new Kernel($context["APP_ENV"], (bool) $context["APP_DEBUG"]);
};
