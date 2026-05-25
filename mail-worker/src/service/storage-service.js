const STORAGE_MAX_BYTES = 498 * 1024 * 1024;
const STORAGE_KEYS = [
	'storage_0', 'storage_1', 'storage_2', 'storage_3', 'storage_4',
	'storage_5', 'storage_6', 'storage_7', 'storage_8', 'storage_9'
];
const encoder = new TextEncoder();

function byteLength(str) {
	return encoder.encode(str || '').length;
}

const storageService = {

	async getCurrent(env) {
		const row = await env.db.prepare(
			'SELECT id, storage_key, size_bytes, email_id_from, email_id_to FROM index_storage WHERE is_current = 1'
		).first();
		return row || null;
	},

	async ensureCapacity(env, incomingBytes) {
		const current = await this.getCurrent(env);

		if (!current) {
			this._initFirstStorage(env).catch(e =>
				console.error('初始化首个 storage 失败:', e)
			);
			return null;
		}

		const newSize = current.size_bytes + incomingBytes;

		if (newSize < STORAGE_MAX_BYTES) {
			return current.storage_key;
		}

		return await this.switchToNext(env);
	},

	async _initFirstStorage(env) {
		for (const key of STORAGE_KEYS) {
			if (!env[key]) continue;

			await env[key].prepare(
				'CREATE TABLE IF NOT EXISTS email_content (email_id INTEGER PRIMARY KEY, content TEXT, text TEXT)'
			).run();

			const existing = await env.db.prepare(
				'SELECT id FROM index_storage WHERE storage_key = ?'
			).bind(key).first();

			if (existing) {
				await env.db.prepare(
					'UPDATE index_storage SET is_current = 1 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM index_storage WHERE is_current = 1)'
				).bind(existing.id).run();
				return key;
			}

			try {
				await env.db.prepare(
					'INSERT INTO index_storage (storage_key, is_current, size_bytes, email_id_from, email_id_to) VALUES (?, 1, 0, 0, 0)'
				).bind(key).run();
				return key;
			} catch (e) {
				if (e.message?.includes('UNIQUE')) {
					const row = await env.db.prepare(
						'SELECT id FROM index_storage WHERE storage_key = ?'
					).bind(key).first();
					if (row) {
						await env.db.prepare(
							'UPDATE index_storage SET is_current = 1 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM index_storage WHERE is_current = 1)'
						).bind(row.id).run();
						return key;
					}
				}
			}
		}
		return null;
	},

	async switchToNext(env) {
		const current = await this.getCurrent(env);

		if (current) {
			await env.db.prepare(
				'UPDATE index_storage SET is_current = 0 WHERE id = ?'
			).bind(current.id).run();
		}

		for (const key of STORAGE_KEYS) {
			if (!env[key]) continue;

			const existing = await env.db.prepare(
				'SELECT id, size_bytes FROM index_storage WHERE storage_key = ?'
			).bind(key).first();

			if (existing) continue;

			await env[key].prepare(
				'CREATE TABLE IF NOT EXISTS email_content (email_id INTEGER PRIMARY KEY, content TEXT, text TEXT)'
			).run();

			await env.db.prepare(
				'INSERT INTO index_storage (storage_key, is_current, size_bytes, email_id_from, email_id_to) VALUES (?, 1, 0, 0, 0)'
			).bind(key).run();

			return key;
		}

		throw new Error('所有存储已满，无法接收新邮件 All storage databases are full');
	},

	async addContent(env, storageKey, emailId, content, text) {
		const db = env[storageKey];
		if (!db) return;

		const byteSize = byteLength(content) + byteLength(text);

		await db.prepare(
			'INSERT INTO email_content (email_id, content, text) VALUES (?, ?, ?)'
		).bind(emailId, content || '', text || '').run();

		await env.db.prepare(
			`UPDATE index_storage SET size_bytes = size_bytes + ?,
			 email_id_from = CASE WHEN email_id_from = 0 THEN ? ELSE email_id_from END,
			 email_id_to = MAX(email_id_to, ?)
			 WHERE storage_key = ? AND is_current = 1`
		).bind(byteSize, emailId, emailId, storageKey).run();
	},

	async clearMainDbContent(env, emailIds) {
		if (!emailIds || emailIds.length === 0) return;
		const placeholders = emailIds.map(() => '?').join(',');
		await env.db.prepare(
			`UPDATE email SET content = '', text = '' WHERE email_id IN (${placeholders})`
		).bind(...emailIds).run();
	},

	async fillContentList(env, emailList) {
		if (!emailList || emailList.length === 0) return;

		const result = await env.db.prepare(
			'SELECT storage_key, email_id_from, email_id_to FROM index_storage WHERE email_id_from > 0'
		).all();

		const storageRows = result?.results || [];
		if (storageRows.length === 0) return;

		const storageGroups = {};

		for (const email of emailList) {
			if (!email.emailId) continue;

			for (const row of storageRows) {
				if (email.emailId >= row.email_id_from && email.emailId <= row.email_id_to) {
					if (!storageGroups[row.storage_key]) {
						storageGroups[row.storage_key] = [];
					}
					storageGroups[row.storage_key].push(email.emailId);
					break;
				}
			}
		}

		for (const [storageKey, emailIds] of Object.entries(storageGroups)) {
			const db = env[storageKey];
			if (!db || emailIds.length === 0) continue;

			const placeholders = emailIds.map(() => '?').join(',');
			const contentResult = await db.prepare(
				`SELECT email_id, content, text FROM email_content WHERE email_id IN (${placeholders})`
			).bind(...emailIds).all();

			if (!contentResult?.results) continue;

			const map = new Map(contentResult.results.map(r => [r.email_id, r]));

			for (const email of emailList) {
				const c = map.get(email.emailId);
				if (c) {
					email.content = c.content || '';
					email.text = c.text || '';
				}
			}
		}
	},

	async fillSingleContent(env, emailRow) {
		if (!emailRow || !emailRow.emailId) return;

		const result = await env.db.prepare(
			'SELECT storage_key, email_id_from, email_id_to FROM index_storage WHERE email_id_from > 0'
		).all();

		const storageRows = result?.results || [];
		if (storageRows.length === 0) return;

		for (const row of storageRows) {
			if (emailRow.emailId >= row.email_id_from && emailRow.emailId <= row.email_id_to) {
				const db = env[row.storage_key];
				if (!db) continue;

				const contentRow = await db.prepare(
					'SELECT content, text FROM email_content WHERE email_id = ?'
				).bind(emailRow.emailId).first();

				if (contentRow) {
					emailRow.content = contentRow.content || '';
					emailRow.text = contentRow.text || '';
				}
				return;
			}
		}
	},

	async handleEmailStorage(env, emailRow) {
		const storageKey = await this.getCurrent(env);
		if (!storageKey) return;

		const incomingBytes = byteLength(emailRow.content) + byteLength(emailRow.text);

		let key;
		try {
			key = await this.ensureCapacity(env, incomingBytes);
		} catch (e) {
			console.error('存储容量检查失败，邮件内容保留在主库:', e);
			return;
		}

		if (!key) return;

		try {
			await this.addContent(env, key, emailRow.emailId, emailRow.content, emailRow.text);
			await this.clearMainDbContent(env, [emailRow.emailId]);
		} catch (e) {
			console.error('搬运邮件内容到 storage 失败，内容保留在主库:', e);
		}
	},

	async deleteContentByEmailIds(env, emailIds) {
		if (!emailIds || emailIds.length === 0) return;

		const result = await env.db.prepare(
			'SELECT storage_key, email_id_from, email_id_to FROM index_storage WHERE email_id_from > 0'
		).all();

		const storageRows = result?.results || [];
		if (storageRows.length === 0) return;

		for (const row of storageRows) {
			const db = env[row.storage_key];
			if (!db) continue;

			try {
				const placeholders = emailIds.map(() => '?').join(',');
				await db.prepare(
					`DELETE FROM email_content WHERE email_id IN (${placeholders})`
				).bind(...emailIds).run();
			} catch (e) {
				console.error(`删除 storage ${row.storage_key} 内容失败:`, e);
			}
		}
	}
};

export default storageService;
