
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = 'https://tvokbgxygoioqzsehlwc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2b2tiZ3h5Z29pb3F6c2VobHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYwNjY4ODIsImV4cCI6MTk5MTY0Mjg4Mn0.S1PxYa14SD2U8NiSmNWN2B6xeSRMtxoMTrE63q8U_4M';



export class BetfairHistoricService {
    private client: SupabaseClient;
    constructor() {
        // Create a single supabase client for interacting with your database
        this.client = createClient(url, key);
    }
    public async getNextRace(): Promise<any> {
        // Get a random record from the race table using supabase
        // id is from 27351 - 181960
        const id = Math.floor(Math.random() * 181960) + 27351;
        console.log(`Looking up race with id: ${id}`);
        const results = await this.client.from('race').select('*').eq('id', id);
        console.log(`Results: ${JSON.stringify(results)}`);``
        if (results.error) {
            console.log(`Error: ${results.error.message}`);
            throw new Error(results.error.message);
        }  
        const result = results.data[0]; 
        return result;
 
    }

}