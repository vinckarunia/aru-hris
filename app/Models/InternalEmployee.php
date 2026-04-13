<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

/**
 * Class InternalEmployee
 *
 * Represents an internal employee of PT. ARU (the service provider company itself).
 * This is separate from the Worker model which tracks outsourced employees.
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
 * @property string|null $position
 * @property string|null $department
 * @property string|null $join_date
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class InternalEmployee extends Model
{
    use HasFactory, \App\Traits\HasHashid;

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
        'position',
        'department',
        'join_date',
        'status',
    ];

    /**
     * Get the user account associated with this internal employee.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function user()
    {
        return $this->hasOne(User::class);
    }
}
