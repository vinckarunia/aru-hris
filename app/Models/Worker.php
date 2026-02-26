<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Assignment;
use App\Models\FamilyMember;
use App\Models\Document;
use App\Models\User;

/**
 * Class Worker
 *
 * Represents a worker entity in the HRIS.
 *
 * @property int $id
 * @property string|null $nik_aru
 * @property string $name
 * @property string $ktp_number
 * @property string|null $kk_number
 * @property string|null $birth_place
 * @property string|null $birth_date
 * @property string|null $gender
 * @property string|null $phone
 * @property string|null $education
 * @property string|null $religion
 * @property string|null $tax_status
 * @property string|null $address_ktp
 * @property string|null $address_domicile
 * @property string|null $mother_name
 * @property string|null $npwp
 * @property string|null $bpjs_kesehatan
 * @property string|null $bpjs_ketenagakerjaan
 * @property string|null $bank_name
 * @property string|null $bank_account_number
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Worker extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nik_aru',
        'name',
        'ktp_number',
        'kk_number',
        'birth_place',
        'birth_date',
        'gender',
        'phone',
        'education',
        'religion',
        'tax_status',
        'address_ktp',
        'address_domicile',
        'mother_name',
        'npwp',
        'bpjs_kesehatan',
        'bpjs_ketenagakerjaan',
        'bank_name',
        'bank_account_number',
    ];

    /**
     * Get the assignments associated with the worker.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    /**
     * Get the family members associated with the worker.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class);
    }

    /**
     * Get the documents associated with the worker.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Get the user account associated with the worker.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function user()
    {
        return $this->hasOne(User::class);
    }
}