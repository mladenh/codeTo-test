// lib/auditTrail.js
import pool from './database';

/**
 * Logs an action to the AuditTrail table.
 *
 * @param {Object} auditDetails
 */
export async function logAuditTrail(auditDetails: {
  profile_id: any;
  user_id: any;
  action: any;
  object_id: any;
}) {
  const {profile_id, user_id, action, object_id} = auditDetails;
  const timestamp = new Date();

  try {
    const conn = await pool.getConnection();
    const query =
      'INSERT INTO AuditTrail (profile_id, user_id, action, object_id, timestamp) VALUES (?, ?, ?, ?, ?)';
    const result = await conn.query(query, [
      profile_id,
      user_id,
      action,
      object_id,
      timestamp,
    ]);
    console.log('Audit trail logged:', result);
    conn.release();
  } catch (err) {
    console.error('Error logging audit trail:', err);
    // Handle error here
  }
}
