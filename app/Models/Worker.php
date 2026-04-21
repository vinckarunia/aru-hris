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
    ];

    /**
     * The "booted" method of the model.
     *
     * @return void
     */
    protected static function booted()
    {
        static::updated(function ($worker) {
            $bpjsKesehatanChanged = $worker->wasChanged('bpjs_kesehatan') && !empty($worker->bpjs_kesehatan);
            $bpjsKetenagakerjaanChanged = $worker->wasChanged('bpjs_ketenagakerjaan') && !empty($worker->bpjs_ketenagakerjaan);

            $kosongSblmKesehatan = empty($worker->getOriginal('bpjs_kesehatan'));
            $kosongSblmKetenagakerjaan = empty($worker->getOriginal('bpjs_ketenagakerjaan'));

            if (($bpjsKesehatanChanged && $kosongSblmKesehatan) || ($bpjsKetenagakerjaanChanged && $kosongSblmKetenagakerjaan)) {
                if ($worker->user && $worker->user->email) {
                    \Illuminate\Support\Facades\Mail::to($worker->user->email)->send(new \App\Mail\BpjsReminderMail($worker));
                }
            }
        });
    }

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
     * Get the contracts associated with the worker through their assignments.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasManyThrough
     */
    public function contracts()
    {
        return $this->hasManyThrough(\App\Models\Contract::class, Assignment::class);
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