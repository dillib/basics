import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

async function migrate() {
  console.log("Starting database migration...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  try {
    // Check if tables exist
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log("Tables already exist, skipping migration.");
      await pool.end();
      return;
    }

    console.log("Creating tables...");

    // Create tables manually
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        plan TEXT DEFAULT 'free',
        pro_expires_at TIMESTAMP,
        topics_used INTEGER DEFAULT 0,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS topics (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id),
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        category TEXT,
        difficulty TEXT DEFAULT 'beginner',
        estimated_minutes INTEGER DEFAULT 30,
        image_url TEXT,
        is_public BOOLEAN DEFAULT false,
        is_sample BOOLEAN DEFAULT false,
        mind_map_data JSONB,
        confidence_score INTEGER,
        validation_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS principles (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        order_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        explanation TEXT NOT NULL,
        analogy TEXT,
        visual_type TEXT,
        visual_data JSONB,
        key_takeaways TEXT[]
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        user_id VARCHAR(255) REFERENCES users(id),
        score INTEGER,
        total_questions INTEGER,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id VARCHAR(255) REFERENCES quizzes(id) NOT NULL,
        principle_id VARCHAR(255) REFERENCES principles(id),
        question_text TEXT NOT NULL,
        options TEXT[] NOT NULL,
        correct_answer INTEGER NOT NULL,
        explanation TEXT,
        user_answer INTEGER,
        is_correct BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS progress (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        principles_completed INTEGER DEFAULT 0,
        total_principles INTEGER DEFAULT 0,
        quizzes_taken INTEGER DEFAULT 0,
        best_score INTEGER,
        last_accessed_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        UNIQUE(user_id, topic_id)
      );

      CREATE TABLE IF NOT EXISTS topic_purchases (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        stripe_session_id VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        status VARCHAR(50) DEFAULT 'pending',
        purchased_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, topic_id)
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        quiz_id VARCHAR(255) REFERENCES quizzes(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        time_spent_seconds INTEGER,
        answers JSONB,
        completed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS principle_mastery (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        principle_id VARCHAR(255) REFERENCES principles(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        mastery_score INTEGER DEFAULT 0,
        times_reviewed INTEGER DEFAULT 0,
        times_correct INTEGER DEFAULT 0,
        last_reviewed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, principle_id)
      );

      CREATE TABLE IF NOT EXISTS review_schedule (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        principle_id VARCHAR(255) REFERENCES principles(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        due_at TIMESTAMP NOT NULL,
        ease_factor INTEGER DEFAULT 250,
        interval INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, principle_id)
      );

      CREATE TABLE IF NOT EXISTS tutor_sessions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        topic_id VARCHAR(255) REFERENCES topics(id) NOT NULL,
        principle_id VARCHAR(255) REFERENCES principles(id),
        title TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tutor_messages (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) REFERENCES tutor_sessions(id) NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS support_requests (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id),
        email TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(50) DEFAULT 'normal',
        status VARCHAR(50) DEFAULT 'open',
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_admin_id VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id VARCHAR(255) REFERENCES support_requests(id) NOT NULL,
        author_type VARCHAR(50) NOT NULL,
        author_id VARCHAR(255) REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_topic ON progress(topic_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic ON quiz_attempts(topic_id);
      CREATE INDEX IF NOT EXISTS idx_principle_mastery_user ON principle_mastery(user_id);
      CREATE INDEX IF NOT EXISTS idx_review_schedule_due ON review_schedule(due_at);
      CREATE INDEX IF NOT EXISTS idx_review_schedule_user ON review_schedule(user_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user ON tutor_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_topic ON tutor_sessions(topic_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_messages_session ON tutor_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_support_requests_user ON support_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
      CREATE INDEX IF NOT EXISTS idx_support_messages_request ON support_messages(request_id);
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
