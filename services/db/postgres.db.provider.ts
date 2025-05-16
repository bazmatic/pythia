import { Pool, QueryResult } from 'pg';
import { CollectionName, IDbService, Identifiable } from "@/types";
import { injectable } from "inversify";

interface DbRow {
    data: any;
    created_at: Date;
}

@injectable()
export class PostgresDbProvider implements IDbService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'pythia',
            password: process.env.DB_PASSWORD || 'pythia_password',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'pythia'
        });
    }

    private getTableName(collectionName: CollectionName): string {
        return collectionName.toLowerCase();
    }

    public async saveItem<T extends Identifiable>(
        collectionName: CollectionName,
        item: T
    ): Promise<void> {
        const tableName = this.getTableName(collectionName);
        const query = `
            INSERT INTO ${tableName} (id, data)
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE
            SET data = $2
        `;
        
        await this.pool.query(query, [item.id, item]);
    }

    public async getItem<T extends Identifiable>(
        collectionName: CollectionName,
        id: string
    ): Promise<T | null> {
        const tableName = this.getTableName(collectionName);
        const query = `
            SELECT data, created_at
            FROM ${tableName}
            WHERE id = $1
        `;
        
        const result = await this.pool.query<DbRow>(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            ...row.data,
            created_at: row.created_at ? new Date(row.created_at).getTime() : undefined
        } as T;
    }

    public async getAllItems<T extends Identifiable>(
        collectionName: CollectionName
    ): Promise<T[]> {
        const tableName = this.getTableName(collectionName);
        const query = `
            SELECT data, created_at
            FROM ${tableName}
        `;
        
        const result = await this.pool.query<DbRow>(query);
        
        return result.rows.map(row => ({
            ...row.data,
            created_at: row.created_at ? new Date(row.created_at).getTime() : undefined
        })) as T[];
    }

    public async query<T extends Identifiable>(
        collectionName: CollectionName,
        query: Partial<T>
    ): Promise<T[]> {
        const tableName = this.getTableName(collectionName);
        const conditions = Object.entries(query)
            .map((_, index) => `data->>'${Object.keys(query)[index]}' = $${index + 1}`)
            .join(' AND ');
        
        const sqlQuery = `
            SELECT data, created_at
            FROM ${tableName}
            WHERE ${conditions}
        `;
        
        const result = await this.pool.query<DbRow>(sqlQuery, Object.values(query));
        
        return result.rows.map(row => ({
            ...row.data,
            created_at: row.created_at ? new Date(row.created_at).getTime() : undefined
        })) as T[];
    }

    public async deleteItem(
        collectionName: CollectionName,
        id: string
    ): Promise<void> {
        const tableName = this.getTableName(collectionName);
        const query = `
            DELETE FROM ${tableName}
            WHERE id = $1
        `;
        
        await this.pool.query(query, [id]);
    }
}

// Create a single instance to be used across the application
const db = new PostgresDbProvider();

export default db; 