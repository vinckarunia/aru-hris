<?php

namespace App\Traits;

use Hashids\Hashids;

trait HasHashid
{
    /**
     * Get the Hashids instance.
     * We use a single global instance for all models so foreign keys
     * and primary keys match when hashed.
     */
    public static function getHashidsInstance()
    {
        $salt = config('app.key');
        return new Hashids($salt, 10);
    }

    /**
     * Decode a hashid back to integer.
     */
    public static function decodeHashid($hash)
    {
        $decoded = self::getHashidsInstance()->decode($hash);
        return $decoded ? $decoded[0] : null;
    }

    /**
     * Encode an integer to hashid.
     */
    public static function encodeHashid($value)
    {
        return self::getHashidsInstance()->encode($value);
    }

    /**
     * Get the value of the model's route key.
     */
    public function getRouteKey()
    {
        return self::encodeHashid($this->getKey());
    }

    /**
     * Retrieve the model for a bound value.
     */
    public function resolveRouteBinding($value, $field = null)
    {
        if ($field) {
            return parent::resolveRouteBinding($value, $field);
        }

        $decoded = self::decodeHashid($value);
        if ($decoded === null) {
            return null;
        }

        return $this->where($this->getRouteKeyName(), $decoded)->first();
    }

    /**
     * Convert the model's attributes to an array,
     * replacing ID and foreign keys with their HashIDs.
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        // Hash primary ID
        if (array_key_exists($this->getKeyName(), $array)) {
            $array[$this->getKeyName()] = $this->getRouteKey();
        }

        // Hash any numeric foreign keys
        foreach ($array as $key => $value) {
            if ($value !== null && is_int($value) && str_ends_with($key, '_id')) {
                $array[$key] = self::encodeHashid($value);
            }
        }

        return $array;
    }
}
