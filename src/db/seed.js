import bcrypt from 'bcrypt';
import { pool } from './pool.js';

const seed = async () => {
  console.log('[seed] starting...');

  const passwordHash = await bcrypt.hash('password123', 10);

  await pool.query(
    `DELETE FROM users WHERE email IN ('seed.doctor@example.com', 'seed.patient@example.com')`
  );

  const { rows: [doctor] } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Dr Seed', 'seed.doctor@example.com', $1, 'doctor')
     RETURNING id, email`,
    [passwordHash]
  );
  console.log(`[seed] created doctor: ${doctor.email}`);

  
  const { rows: [patient] } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Patient Seed', 'seed.patient@example.com', $1, 'patient')
     RETURNING id, email`,
    [passwordHash]
  );
  console.log(`[seed] created patient: ${patient.email}`);

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(10, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    const start = new Date(tomorrow.getTime() + i * 30 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    await pool.query(
      `INSERT INTO availability_slots (doctor_id, start_time, end_time)
       VALUES ($1, $2, $3)`,
      [doctor.id, start, end]
    );
  }
  console.log('[seed] created 4 slots');

  console.log('[seed] done');
  console.log('');
  console.log('Login credentials:');
  console.log('  Doctor:  seed.doctor@example.com  / password123');
  console.log('  Patient: seed.patient@example.com / password123');
};

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[seed] failed:', err);
    pool.end();
    process.exit(1);
  });