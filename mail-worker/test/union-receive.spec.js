import { describe, expect, it } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { emailConst } from '../src/const/entity-const';
import emailService from '../src/service/email-service';
import userService from '../src/service/user-service';

const c = {
	env: {
		domain: ['howxu.cn']
	}
};

describe('union receive settings', () => {
	it('normalizes aliases by trimming, removing blanks, and de-duping case-insensitively', () => {
		expect(userService.normalizeUnionReceive(c, [
			' Dev@howxu.cn ',
			'',
			'dev@howxu.cn',
			'ops@howxu.cn'
		])).toEqual(['Dev@howxu.cn', 'ops@howxu.cn']);
	});

	it('rejects email outside managed domains', () => {
		expect(() => userService.normalizeUnionReceive(c, ['dev@example.com'])).toThrow();
	});

	it('rejects invalid email', () => {
		expect(() => userService.normalizeUnionReceive(c, ['not-email'])).toThrow();
	});

	it('rejects string domain that is not JSON', () => {
		expect(() => userService.normalizeUnionReceive({ env: { domain: 'howxu.cn' } }, ['dev@howxu.cn'])).toThrow('环境变量domain必须是JSON类型');
	});

	it('builds receive scope with account or union aliases', () => {
		const dialect = new SQLiteSyncDialect();
		const query = dialect.sqlToQuery(emailService.receiveScope(3, 7, false, ['dev@howxu.cn'], emailConst.type.RECEIVE));

		expect(query.sql).toBe('(("email"."user_id" = ? and "email"."account_id" = ?) or "email"."to_email" in (?))');
		expect(query.params).toEqual([3, 7, 'dev@howxu.cn']);
	});

	it('does not include union aliases for sent scope', () => {
		const dialect = new SQLiteSyncDialect();
		const query = dialect.sqlToQuery(emailService.receiveScope(3, 7, false, ['dev@howxu.cn'], emailConst.type.SEND));

		expect(query.sql).toBe('("email"."user_id" = ? and "email"."account_id" = ?)');
		expect(query.params).toEqual([3, 7]);
	});
});
