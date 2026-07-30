<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PolicyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Policy/Index');
    }
}
