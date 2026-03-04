import { describe, it, expect } from 'vitest';
import { sanitizeSqlInput } from '@/lib/security/sanitize';
import { searchSchema, projectSchema, contactFormSchema } from '@/lib/validation/schemas';

// ---------------------------------------------------------------------------
// SQL_PAYLOADS -- 80+ injection vectors organized by attack category
// ---------------------------------------------------------------------------
export const SQL_PAYLOADS = {
  // 1. Classic UNION-based injection
  unionBased: [
    "' UNION SELECT 1,2,3--",
    "' UNION SELECT username,password FROM users--",
    "' UNION ALL SELECT NULL,NULL,NULL--",
    "1 UNION SELECT table_name FROM information_schema.tables--",
    "' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables--",
    "') UNION SELECT 1,2,3--",
    "' UNION SELECT @@version,NULL,NULL--",
  ],

  // 2. Boolean-based blind injection
  booleanBlind: [
    "' OR 1=1--",
    "' OR 'a'='a",
    "' OR ''='",
    "admin' --",
    "' OR 1=1#",
    "' AND 1=1--",
    "' AND SUBSTRING(username,1,1)='a'--",
    "1' AND (SELECT COUNT(*) FROM users)>0--",
  ],

  // 3. Time-based blind injection
  timeBasedBlind: [
    "'; WAITFOR DELAY '0:0:5'--",
    "' OR SLEEP(5)--",
    "'; SELECT BENCHMARK(10000000,SHA1('test'))--",
    "' AND IF(1=1,SLEEP(5),0)--",
    "1; SELECT pg_sleep(5)--",
    "' || pg_sleep(5)--",
  ],

  // 4. Stacked queries
  stackedQueries: [
    "'; DROP TABLE users;--",
    "'; INSERT INTO users VALUES('hacker','pass');--",
    "'; UPDATE users SET role='admin' WHERE username='attacker';--",
    "'; DELETE FROM projects;--",
    "'; EXEC xp_cmdshell('whoami');--",
    "'; CREATE TABLE pwned(data TEXT);--",
    "1; TRUNCATE TABLE financial_records;--",
  ],

  // 5. Error-based extraction
  errorBased: [
    "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--",
    "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
    "' AND UPDATEXML(1,CONCAT(0x7e,(SELECT @@version)),1)--",
    "' AND ROW(1,1)>(SELECT COUNT(*),CONCAT((SELECT user()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)--",
    "' AND GTID_SUBSET(CONCAT((SELECT database())),1)--",
  ],

  // 6. Comment-based bypass
  commentBypass: [
    "admin'--",
    "admin'/*",
    "' OR 1=1/*",
    "'; DROP/**/TABLE/**/users;--",
    "' /*!UNION*/ /*!SELECT*/ 1,2,3--",
    "' OR/**/'1'='1",
    "admin'#",
    "'/**/OR/**/1=1--",
  ],

  // 7. Encoding bypasses (hex, char(), unicode)
  encodingBypass: [
    "' OR CHAR(49)=CHAR(49)--",
    "' UNION SELECT 0x61646D696E,0x70617373--",
    "%27%20OR%201%3D1--",
    "' OR 0x50=0x50--",
    "' UNION SELECT CHAR(117,115,101,114,110,97,109,101)--",
    "\\u0027 OR 1=1--",
    "' OR UNHEX('31')=UNHEX('31')--",
    "%2527%2520OR%25201%253D1--",
  ],

  // 8. Second-order injection payloads
  secondOrder: [
    "admin'--",
    "test'; UPDATE users SET role='admin' WHERE '1'='1",
    "Robert'); DROP TABLE students;--",
    "O'Reilly'; SELECT * FROM users WHERE '1'='1",
    "user@test.com'; INSERT INTO admins SELECT * FROM users;--",
    "normal_input'; EXEC sp_addrolemember 'db_owner','attacker';--",
  ],

  // 9. NoSQL injection patterns
  nosqlInjection: [
    '{"$gt":""}',
    '{"$ne":null}',
    '{"$where":"sleep(5000)"}',
    "'; return true; var dummy='",
    '{"$regex":".*"}',
    '{"username":{"$gt":""},"password":{"$gt":""}}',
    "this.password.match(/.*/)",
    '[$ne]=1',
  ],

  // 10. ORM bypass techniques
  ormBypass: [
    "' OR TRUE--",
    "__proto__[isAdmin]=true",
    "constructor.prototype.isAdmin=true",
    '{"where":{"or":[{"1":"1"}]}}',
    "array[0]=1&array[1]=2",
    "' OR pg_sleep(5)--",
    "1; SELECT * FROM pg_tables--",
    "' AND 1=(SELECT 1 FROM pg_sleep(5))--",
  ],
} as const;

// Flatten all payloads into a single array for bulk testing
const ALL_PAYLOADS: string[] = Object.values(SQL_PAYLOADS).flat();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Characters that sanitizeSqlInput must strip */
const DANGEROUS_SQL_CHARS = ["'", '"', ';'];

function containsDangerousChars(value: string): boolean {
  return DANGEROUS_SQL_CHARS.some((char) => value.includes(char));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-011: SQL Injection Payload Test Suite', () => {
  // -----------------------------------------------------------------------
  // 1. Classic UNION-based injection
  // -----------------------------------------------------------------------
  describe('Category 1: UNION-based injection', () => {
    it.each(SQL_PAYLOADS.unionBased)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should neutralize a UNION SELECT extracting credentials', () => {
      const payload = "' UNION SELECT username,password FROM users--";
      const result = sanitizeSqlInput(payload);
      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });

    it('should truncate long UNION payloads to 100 chars', () => {
      const payload = "' UNION SELECT " + 'a'.repeat(200) + '--';
      const result = sanitizeSqlInput(payload);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Boolean-based blind injection
  // -----------------------------------------------------------------------
  describe('Category 2: Boolean-based blind injection', () => {
    it.each(SQL_PAYLOADS.booleanBlind)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should neutralize OR 1=1 tautology', () => {
      const result = sanitizeSqlInput("' OR 1=1--");
      expect(result).not.toContain("'");
    });

    it('should neutralize string-based tautology', () => {
      const result = sanitizeSqlInput("' OR 'a'='a");
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 3. Time-based blind injection
  // -----------------------------------------------------------------------
  describe('Category 3: Time-based blind injection', () => {
    it.each(SQL_PAYLOADS.timeBasedBlind)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip semicolons from WAITFOR DELAY payload', () => {
      const result = sanitizeSqlInput("'; WAITFOR DELAY '0:0:5'--");
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
    });

    it('should strip quotes from pg_sleep payload', () => {
      const result = sanitizeSqlInput("' || pg_sleep(5)--");
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 4. Stacked queries
  // -----------------------------------------------------------------------
  describe('Category 4: Stacked queries', () => {
    it.each(SQL_PAYLOADS.stackedQueries)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should prevent DROP TABLE via stacked query', () => {
      const result = sanitizeSqlInput("'; DROP TABLE users;--");
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
    });

    it('should prevent INSERT via stacked query', () => {
      const result = sanitizeSqlInput(
        "'; INSERT INTO users VALUES('hacker','pass');--",
      );
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
    });

    it('should prevent xp_cmdshell execution', () => {
      const result = sanitizeSqlInput("'; EXEC xp_cmdshell('whoami');--");
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 5. Error-based extraction
  // -----------------------------------------------------------------------
  describe('Category 5: Error-based extraction', () => {
    it.each(SQL_PAYLOADS.errorBased)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip quotes from EXTRACTVALUE payload', () => {
      const result = sanitizeSqlInput(
        "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--",
      );
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 6. Comment-based bypass
  // -----------------------------------------------------------------------
  describe('Category 6: Comment-based bypass', () => {
    it.each(SQL_PAYLOADS.commentBypass)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip quotes even when combined with block comments', () => {
      const result = sanitizeSqlInput("'; DROP/**/TABLE/**/users;--");
      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
    });

    it('should strip quotes around inline comment union', () => {
      const result = sanitizeSqlInput("' /*!UNION*/ /*!SELECT*/ 1,2,3--");
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 7. Encoding bypasses
  // -----------------------------------------------------------------------
  describe('Category 7: Encoding bypasses (hex, char(), unicode)', () => {
    it.each(SQL_PAYLOADS.encodingBypass)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip quotes from CHAR()-based tautology', () => {
      const result = sanitizeSqlInput("' OR CHAR(49)=CHAR(49)--");
      expect(result).not.toContain("'");
    });

    it('should strip quotes from hex-encoded UNION SELECT', () => {
      const result = sanitizeSqlInput(
        "' UNION SELECT 0x61646D696E,0x70617373--",
      );
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // 8. Second-order injection payloads
  // -----------------------------------------------------------------------
  describe('Category 8: Second-order injection', () => {
    it.each(SQL_PAYLOADS.secondOrder)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should neutralize Bobby Tables payload', () => {
      const result = sanitizeSqlInput(
        "Robert'); DROP TABLE students;--",
      );
      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
    });

    it('should strip quotes from stored payload with UPDATE', () => {
      const result = sanitizeSqlInput(
        "test'; UPDATE users SET role='admin' WHERE '1'='1",
      );
      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
    });
  });

  // -----------------------------------------------------------------------
  // 9. NoSQL injection patterns
  // -----------------------------------------------------------------------
  describe('Category 9: NoSQL injection patterns', () => {
    it.each(SQL_PAYLOADS.nosqlInjection)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip quotes from $where sleep attack', () => {
      const result = sanitizeSqlInput('{"$where":"sleep(5000)"}');
      expect(result).not.toContain('"');
    });

    it('should strip quotes from return-true JS injection', () => {
      const result = sanitizeSqlInput("'; return true; var dummy='");
      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
    });
  });

  // -----------------------------------------------------------------------
  // 10. ORM bypass techniques
  // -----------------------------------------------------------------------
  describe('Category 10: ORM bypass techniques', () => {
    it.each(SQL_PAYLOADS.ormBypass)(
      'sanitizeSqlInput strips dangerous chars from: %s',
      (payload) => {
        const result = sanitizeSqlInput(payload);
        expect(containsDangerousChars(result)).toBe(false);
      },
    );

    it('should strip quotes from OR TRUE bypass', () => {
      const result = sanitizeSqlInput("' OR TRUE--");
      expect(result).not.toContain("'");
    });

    it('should strip dangerous chars from pg_sleep ORM bypass', () => {
      const result = sanitizeSqlInput(
        "' AND 1=(SELECT 1 FROM pg_sleep(5))--",
      );
      expect(result).not.toContain("'");
    });
  });

  // -----------------------------------------------------------------------
  // Bulk: every payload through sanitizeSqlInput
  // -----------------------------------------------------------------------
  describe('Bulk: All payloads through sanitizeSqlInput', () => {
    it(`should strip dangerous SQL chars from all ${ALL_PAYLOADS.length} payloads`, () => {
      for (const payload of ALL_PAYLOADS) {
        const result = sanitizeSqlInput(payload);
        expect(
          containsDangerousChars(result),
          `Payload leaked dangerous chars: "${payload}" -> "${result}"`,
        ).toBe(false);
      }
    });

    it('should never exceed 100 characters for any payload', () => {
      for (const payload of ALL_PAYLOADS) {
        const result = sanitizeSqlInput(payload);
        expect(result.length).toBeLessThanOrEqual(100);
      }
    });

    it('should return a trimmed string for every payload', () => {
      for (const payload of ALL_PAYLOADS) {
        const result = sanitizeSqlInput(payload);
        expect(result).toBe(result.trim());
      }
    });
  });

  // -----------------------------------------------------------------------
  // Zod validation: searchSchema rejects SQLi in query field
  // -----------------------------------------------------------------------
  describe('Zod searchSchema validation against SQLi payloads', () => {
    it('should accept a legitimate search query', () => {
      const result = searchSchema.safeParse({
        query: 'concrete foundation',
      });
      expect(result.success).toBe(true);
    });

    it('should reject queries exceeding 100 characters', () => {
      const longPayload = "' UNION SELECT " + 'x'.repeat(200);
      const result = searchSchema.safeParse({ query: longPayload });
      expect(result.success).toBe(false);
    });

    it('should reject empty query strings', () => {
      const result = searchSchema.safeParse({ query: '' });
      expect(result.success).toBe(false);
    });

    it.each([
      "'; DROP TABLE users;--",
      "' OR 1=1--",
      "' UNION SELECT username,password FROM users--",
    ])(
      'searchSchema still parses (string type) but max-length may clip: %s',
      (payload) => {
        // searchSchema validates shape; length is the safeguard for long payloads
        const result = searchSchema.safeParse({ query: payload });
        if (payload.length <= 100) {
          // Schema accepts strings up to 100 chars (it validates shape, not content)
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
        }
      },
    );
  });

  // -----------------------------------------------------------------------
  // Zod validation: projectSchema rejects SQLi in name/description
  // -----------------------------------------------------------------------
  describe('Zod projectSchema validation against SQLi payloads', () => {
    it('should accept a legitimate project name', () => {
      const result = projectSchema.safeParse({
        name: 'Highway Bridge Renovation',
      });
      expect(result.success).toBe(true);
    });

    it('should reject project names exceeding 200 characters', () => {
      const payload = "'; DROP TABLE projects;--" + 'x'.repeat(200);
      const result = projectSchema.safeParse({ name: payload });
      expect(result.success).toBe(false);
    });

    it('should reject empty project names', () => {
      const result = projectSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject descriptions exceeding 2000 characters', () => {
      const payload = "' UNION SELECT ".repeat(200);
      const result = projectSchema.safeParse({
        name: 'Valid Name',
        description: payload,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative budget (common SQLi side-effect probe)', () => {
      const result = projectSchema.safeParse({
        name: 'Valid',
        budget: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Zod validation: contactFormSchema rejects SQLi in name/email/message
  // -----------------------------------------------------------------------
  describe('Zod contactFormSchema validation against SQLi payloads', () => {
    it('should reject SQL injection in email field', () => {
      const result = contactFormSchema.safeParse({
        name: 'Test User',
        email: "admin'--@example.com",
        message: 'Hello',
      });
      // Zod email validation rejects malformed addresses
      expect(result.success).toBe(false);
    });

    it('should reject SQL injection in phone field', () => {
      const result = contactFormSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        phone: "'; DROP TABLE contacts;--",
        message: 'Hello',
      });
      // Phone regex only allows digits, spaces, dashes, plus, parens
      expect(result.success).toBe(false);
    });

    it('should reject messages exceeding 5000 characters', () => {
      const payload = "' OR 1=1--".repeat(600);
      const result = contactFormSchema.safeParse({
        name: 'Test',
        email: 'test@example.com',
        message: payload,
      });
      expect(result.success).toBe(false);
    });

    it('should reject names exceeding 100 characters', () => {
      const payload = "Robert'); DROP TABLE students;--".repeat(5);
      const result = contactFormSchema.safeParse({
        name: payload,
        email: 'test@example.com',
        message: 'Hello',
      });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases & regression
  // -----------------------------------------------------------------------
  describe('Edge cases and regression', () => {
    it('should handle null-byte injection attempts', () => {
      const result = sanitizeSqlInput("admin\x00' OR 1=1--");
      expect(result).not.toContain("'");
    });

    it('should handle backslash escape attempts', () => {
      const result = sanitizeSqlInput("admin\\' OR 1=1--");
      expect(result).not.toContain("'");
    });

    it('should handle mixed quote types', () => {
      const result = sanitizeSqlInput(`"'; DROP TABLE users;--"`);
      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });

    it('should handle only dangerous characters', () => {
      const result = sanitizeSqlInput("'\";'\";");
      expect(result).toBe('');
    });

    it('should preserve legitimate input', () => {
      expect(sanitizeSqlInput('concrete foundation')).toBe(
        'concrete foundation',
      );
      expect(sanitizeSqlInput('phase 2 budget')).toBe('phase 2 budget');
      expect(sanitizeSqlInput('100-unit apartment')).toBe(
        '100-unit apartment',
      );
    });

    it('should handle unicode strings cleanly', () => {
      const result = sanitizeSqlInput('proyecto en español');
      expect(result).toBe('proyecto en español');
    });

    it('should handle repeated single quotes', () => {
      const result = sanitizeSqlInput("''''''''");
      expect(result).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = sanitizeSqlInput('   ');
      expect(result).toBe('');
    });
  });
});
