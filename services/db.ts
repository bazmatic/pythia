// services/db.ts

import fs from 'fs';
import path from 'path';

export type Session = {
  id: string;
  images: string[];
  strategy?: number;
  isReady: boolean;
};

class DBService {
  private sessions: Map<string, Session>;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data');
    this.sessions = new Map();
    this.loadData();
  }

  private loadData(): void {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    const sessionsPath = path.join(this.dbPath, 'sessions.json');
    if (fs.existsSync(sessionsPath)) {
      const data = fs.readFileSync(sessionsPath, 'utf-8');
      const sessions = JSON.parse(data);
      this.sessions = new Map(Object.entries(sessions));
    }
  }

  private saveData(): void {
    const sessionsObj = Object.fromEntries(this.sessions);
    const sessionsPath = path.join(this.dbPath, 'sessions.json');
    fs.writeFileSync(sessionsPath, JSON.stringify(sessionsObj, null, 2));
  }

  createSession(session: Session): void {
    this.sessions.set(session.id, session);
    this.saveData();
  }

  getSession(id: string): Session {
    const result = this.sessions.get(id);
    if (!result) {
        throw new Error('Session not found');
    }
    return result;
  }

  updateSession(id: string, updateData: Partial<Session>): void {
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, { ...session, ...updateData });
      this.saveData();
    }
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

// Create a single instance to be used across the application
const db = new DBService();

export default db;