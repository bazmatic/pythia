import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CollectionName, IDbService, Identifiable } from "@/types";
import { injectable } from "inversify";

@injectable()
export class SupabaseDbProvider implements IDbService {
    private supabase: SupabaseClient;

    constructor() {
        // Initialize Supabase client
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    private getTableName(collectionName: CollectionName): string {
        return collectionName.toLowerCase();
    }

    public async saveItem<T extends Identifiable>(
        collectionName: CollectionName,
        item: T
    ): Promise<void> {
        const { error } = await this.supabase
            .from(this.getTableName(collectionName))
            .upsert({
                id: item.id,
                data: item
            });

        if (error) {
            throw new Error(`Failed to save item: ${error.message}`);
        }
    }

    public async getItem<T extends Identifiable>(
        collectionName: CollectionName,
        id: string
    ): Promise<T | null> {
        const { data, error } = await this.supabase
            .from(this.getTableName(collectionName))
            .select()
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get item: ${error.message}`);
        }

        return {
            ...data.data
        } as T;
    }

    public async getAllItems<T extends Identifiable>(
        collectionName: CollectionName
    ): Promise<T[]> {
        const { data, error } = await this.supabase
            .from(this.getTableName(collectionName))
            .select();

        if (error) {
            throw new Error(`Failed to get all items: ${error.message}`);
        }

        return data.map((item) => ({
            ...item.data
        })) as T[];
    }

    public async query<T extends Identifiable>(
        collectionName: CollectionName,
        query: Partial<T>
    ): Promise<T[]> {
        let supabaseQuery = this.supabase
            .from(this.getTableName(collectionName))
            .select();

        for (const [key, value] of Object.entries(query)) {
            supabaseQuery = supabaseQuery.eq(key, value);
        }

        const { data, error } = await supabaseQuery;

        if (error) {
            throw new Error(`Failed to query items: ${error.message}`);
        }

        return data.map((item) => ({
            id: item.id,
            ...item
        })) as T[];
    }

    public async deleteItem(
        collectionName: CollectionName,
        id: string
    ): Promise<void> {
        const { error } = await this.supabase
            .from(this.getTableName(collectionName))
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete item: ${error.message}`);
        }
    }
}

// Create a single instance to be used across the application
const db = new SupabaseDbProvider();

export default db;