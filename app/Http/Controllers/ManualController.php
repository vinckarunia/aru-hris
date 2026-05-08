<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ManualController extends Controller
{
    /**
     * Display the manual/help page.
     */
    public function index()
    {
        return Inertia::render('Manual');
    }
}
