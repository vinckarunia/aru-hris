<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'nik_aru' => 'required|string',
        ]);

        // Cek validitas NIK ARU di tabel workers
        $worker = \App\Models\Worker::where('nik_aru', $request->nik_aru)->first();

        if (!$worker) {
            return back()->withErrors(['nik_aru' => 'NIK ARU tidak ditemukan di database kami. Pastikan format penulisan sudah benar.'])->withInput();
        }

        // Cek apakah NIK ARU tersebut sudah terhubung dengan akun user lain
        $existingUser = User::where('worker_id', $worker->id)->first();
        if ($existingUser) {
             return back()->withErrors(['nik_aru' => 'NIK ARU ini sudah didaftarkan pada sebuah akun. Silakan login atau hubungi Admin.'])->withInput();
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => \App\Enums\UserRole::WORKER,
        ]);

        // Bind data Karyawan
        $user->worker_id = $worker->id;
        $user->save();

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('workers.index', absolute: false));
    }

    /**
     * Public API route to verify NIK and autofill worker name
     */
    public function checkNik(Request $request)
    {
        $request->validate(['nik_aru' => 'required|string']);

        $worker = \App\Models\Worker::where('nik_aru', $request->nik_aru)->first();

        if (!$worker) {
            return response()->json(['message' => 'NIK ARU tidak ditemukan.'], 404);
        }

        $existingUser = User::where('worker_id', $worker->id)->first();
        if ($existingUser) {
            return response()->json(['message' => 'NIK ARU ini sudah didaftarkan.'], 409);
        }

        return response()->json(['name' => $worker->name], 200);
    }
}
