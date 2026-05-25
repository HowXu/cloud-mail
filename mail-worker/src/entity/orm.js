import { drizzle } from 'drizzle-orm/d1';

export default function orm(c) {
	return drizzle(c.env.db,{logger: c.env.orm_log})
}

export function ormStorage(c, storageKey) {
	const db = storageKey && c.env[storageKey];
	if (!db) return null;
	return drizzle(db);
}
