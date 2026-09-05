import pool from './db.js';

async function verify() {
  try {
    const [brs] = await pool.execute('SELECT * FROM blood_requests WHERE status = "Completed"');
    console.log('--- COMPLETED BROADCAST REQUESTS ---');
    console.log(`Total: ${brs.length}`);
    brs.forEach(r => {
      console.log(`[ID #${r.request_id}] Blood: ${r.blood_group} | Location: ${r.location} | CompletedAt: ${r.completedAt}`);
    });

    const [drs] = await pool.execute('SELECT * FROM direct_requests WHERE status = "Completed"');
    console.log('\n--- COMPLETED DIRECT REQUESTS ---');
    console.log(`Total: ${drs.length}`);
    drs.forEach(r => {
      console.log(`[ID #${r.id}] Blood: ${r.blood_group} | Location: ${r.location} | Status: ${r.status}`);
    });

    console.log('\n--- DATABASE SYNC CHECK COMPLETED ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

verify();
