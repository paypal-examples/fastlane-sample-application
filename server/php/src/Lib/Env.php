<?php

class Env
{
    static function get(string $key): string|null
    {
        return $_ENV[$key] ?? null;
    }
}
