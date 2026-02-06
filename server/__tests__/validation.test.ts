import { describe, it, expect } from 'vitest';
import {
  SupportRequestSchema,
  QuizAnswerSchema,
  TopicGenerateSchema,
  TopicUpdateSchema,
  MessageSchema,
  SupportRequestUpdateSchema,
} from '../validation';

describe('Validation Schemas', () => {
  describe('SupportRequestSchema', () => {
    it('should validate a valid support request', () => {
      const validRequest = {
        email: 'test@example.com',
        type: 'technical',
        priority: 'normal',
        subject: 'Test Subject',
        description: 'This is a test description that is long enough to pass validation.',
      };

      const result = SupportRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
        type: 'technical',
        priority: 'normal',
        subject: 'Test Subject',
        description: 'This is a test description that is long enough to pass validation.',
      };

      const result = SupportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
      }
    });

    it('should reject short subject', () => {
      const invalidRequest = {
        email: 'test@example.com',
        type: 'technical',
        priority: 'normal',
        subject: 'Hi',
        description: 'This is a test description that is long enough to pass validation.',
      };

      const result = SupportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 5 characters');
      }
    });

    it('should reject short description', () => {
      const invalidRequest = {
        email: 'test@example.com',
        type: 'technical',
        priority: 'normal',
        subject: 'Test Subject',
        description: 'Too short',
      };

      const result = SupportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 20 characters');
      }
    });

    it('should default priority to normal if not provided', () => {
      const request = {
        email: 'test@example.com',
        type: 'technical',
        subject: 'Test Subject',
        description: 'This is a test description that is long enough to pass validation.',
      };

      const result = SupportRequestSchema.parse(request);
      expect(result.priority).toBe('normal');
    });

    it('should reject invalid type', () => {
      const invalidRequest = {
        email: 'test@example.com',
        type: 'invalid-type',
        priority: 'normal',
        subject: 'Test Subject',
        description: 'This is a test description that is long enough to pass validation.',
      };

      const result = SupportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('QuizAnswerSchema', () => {
    it('should validate a valid quiz answer', () => {
      const validAnswer = {
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 2,
      };

      const result = QuizAnswerSchema.safeParse(validAnswer);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidAnswer = {
        questionId: 'not-a-uuid',
        answer: 2,
      };

      const result = QuizAnswerSchema.safeParse(invalidAnswer);
      expect(result.success).toBe(false);
    });

    it('should reject answer out of range (too high)', () => {
      const invalidAnswer = {
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 4,
      };

      const result = QuizAnswerSchema.safeParse(invalidAnswer);
      expect(result.success).toBe(false);
    });

    it('should reject answer out of range (negative)', () => {
      const invalidAnswer = {
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: -1,
      };

      const result = QuizAnswerSchema.safeParse(invalidAnswer);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer answer', () => {
      const invalidAnswer = {
        questionId: '550e8400-e29b-41d4-a716-446655440000',
        answer: 1.5,
      };

      const result = QuizAnswerSchema.safeParse(invalidAnswer);
      expect(result.success).toBe(false);
    });
  });

  describe('TopicGenerateSchema', () => {
    it('should validate a valid topic title', () => {
      const validTopic = {
        title: 'Machine Learning',
      };

      const result = TopicGenerateSchema.safeParse(validTopic);
      expect(result.success).toBe(true);
    });

    it('should reject title that is too short', () => {
      const invalidTopic = {
        title: 'AI',
      };

      const result = TopicGenerateSchema.safeParse(invalidTopic);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 3 characters');
      }
    });

    it('should reject title that is too long', () => {
      const invalidTopic = {
        title: 'A'.repeat(201),
      };

      const result = TopicGenerateSchema.safeParse(invalidTopic);
      expect(result.success).toBe(false);
    });
  });

  describe('TopicUpdateSchema', () => {
    it('should validate a valid topic update', () => {
      const validUpdate = {
        title: 'Updated Title',
        isPublic: true,
      };

      const result = TopicUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        isPublic: false,
      };

      const result = TopicUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject unexpected fields (strict mode)', () => {
      const invalidUpdate = {
        title: 'Updated Title',
        unexpectedField: 'value',
      };

      const result = TopicUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject invalid title length', () => {
      const invalidUpdate = {
        title: 'AB',
      };

      const result = TopicUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('MessageSchema', () => {
    it('should validate a valid message', () => {
      const validMessage = {
        message: 'This is a valid message',
      };

      const result = MessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const invalidMessage = {
        message: '',
      };

      const result = MessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('cannot be empty');
      }
    });

    it('should reject message that is too long', () => {
      const invalidMessage = {
        message: 'A'.repeat(5001),
      };

      const result = MessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('SupportRequestUpdateSchema', () => {
    it('should validate a valid support request update', () => {
      const validUpdate = {
        status: 'resolved',
        priority: 'high',
      };

      const result = SupportRequestUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        status: 'in_progress',
      };

      const result = SupportRequestUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidUpdate = {
        status: 'invalid-status',
      };

      const result = SupportRequestUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject unexpected fields (strict mode)', () => {
      const invalidUpdate = {
        status: 'resolved',
        unexpectedField: 'value',
      };

      const result = SupportRequestUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
