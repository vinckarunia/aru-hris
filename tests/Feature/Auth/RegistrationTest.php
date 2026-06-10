use App\Models\Worker;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $worker = Worker::create([
        'name' => 'Test User',
        'nik_aru' => 'ARU-TEST-123',
        'ktp_number' => '1234567890123456',
        'gender' => 'male',
    ]);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'nik_aru' => 'ARU-TEST-123',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('workers.index', absolute: false));
});
