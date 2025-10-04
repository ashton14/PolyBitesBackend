import db from '../models/db.js';

export const createMessage = async (req, res) => {
  const { profile_id, subject, message } = req.body;
  
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  try {
    // user_id is optional - can be null for anonymous/guest messages
    const { rows } = await db.query(
      'INSERT INTO messages (profile_id, subject, message) VALUES ($1, $2, $3) RETURNING id, profile_id, subject, message, created_at',
      [profile_id || null, subject, message]
    );
    
    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      data: rows[0]
    });
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.id, m.profile_id, m.subject, m.message, m.created_at, p.name as user_name
       FROM messages m
       LEFT JOIN profiles p ON m.profile_id = p.id
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessageById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await db.query(
      `SELECT m.id, m.profile_id, m.subject, m.message, m.created_at, p.name as user_name
       FROM messages m
       LEFT JOIN profiles p ON m.profile_id = p.id
       WHERE m.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Database Query Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

