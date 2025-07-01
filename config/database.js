/**
 * LLM Orchestration Application
 * Database configuration and helper functions
 * 
 * AI-CONTEXT: This module implements a singleton database wrapper around SQLite.
 * It provides schema management, migration capabilities, and Promise-based query methods.
 * The singleton pattern ensures consistent database state across the application.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Database schema definition
 * 
 * AI-EXTENSION-POINT: To add a new table or modify an existing one, add or edit
 * the SQL definition here. Remember to update the checkAndMigrate method to handle
 * any needed data migrations when schema changes.
 */
const SCHEMA = {
    blocks: `
        CREATE TABLE IF NOT EXISTS blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            tags TEXT,
            folder_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    payloads: `
        CREATE TABLE IF NOT EXISTS payloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            temperature REAL DEFAULT 0.6,
            response_length INTEGER DEFAULT 1000,
            llm_port INTEGER DEFAULT 5001,
            model_format TEXT DEFAULT 'default',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    payload_blocks: `
        CREATE TABLE IF NOT EXISTS payload_blocks (
            payload_id INTEGER,
            block_id INTEGER,
            order_index INTEGER,
            FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE CASCADE,
            FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE CASCADE
        )
    `,
    workflows: `
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    workflow_payloads: `
        CREATE TABLE IF NOT EXISTS workflow_payloads (
            workflow_id INTEGER,
            payload_id INTEGER,
            order_index INTEGER,
            FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE,
            FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE CASCADE
        )
    `,
    runs: `
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER,
            status TEXT NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY (workflow_id) REFERENCES workflows (id) ON DELETE CASCADE
        )
    `,
    responses: `
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            payload_id INTEGER,
            content TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE,
            FOREIGN KEY (payload_id) REFERENCES payloads (id) ON DELETE SET NULL
        )
    `
};

/**
 * Database class for managing database connections and operations
 * 
 * AI-CONTEXT: This class wraps SQLite functionality with Promise-based methods
 * and adds additional features like transactions, migrations, and error handling.
 * It follows the singleton pattern, with a single instance created and exported.
 */
class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'data', 'llm_orchestration.db');
        this.transactionActive = false;
    }
    
    /**
     * Initialize the database
     * @returns {Promise} - Promise resolving when database is initialized
     * 
     * AI-CONTEXT: This method is called during server startup to ensure the
     * database is ready. It creates the database file if it doesn't exist,
     * sets up tables, and runs migrations as needed.
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err) {
                    return reject(err);
                }
                
                try {
                    await this.createTables();
                    console.log('Database initialized successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Create database tables
     * @returns {Promise} - Promise resolving when tables are created
     * 
     * AI-CONTEXT: This method creates tables based on the SCHEMA definitions.
     * It includes special handling for the runs table to ensure its structure
     * is correct before proceeding.
     */
    async createTables() {
        try {
            // Special handling for the runs table due to potential issues
            const runsTableExists = await this.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='runs'"
            );
            
            if (runsTableExists) {
                console.log('Runs table already exists, checking schema...');
                // Will be handled in checkAndMigrate
            } else {
                // Create the runs table first to ensure it has the right schema
                console.log('Creating runs table with proper schema...');
                await this.run(SCHEMA.runs);
                console.log('Runs table created successfully');
            }
            
            // Create other tables
            for (const [tableName, schema] of Object.entries(SCHEMA)) {
                if (tableName !== 'runs') { // Skip runs since we handled it above
                    await this.run(schema);
                    console.log(`Table '${tableName}' initialized`);
                }
            }
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
        
        // Check if we need to rename tables or migrate data
        await this.checkAndMigrate();
    }
    
    /**
     * Check for needed migrations and perform them
     * 
     * AI-CONTEXT: This method handles database schema migrations to ensure
     * backward compatibility when the schema changes. It checks for old table
     * structures and migrates data to new formats as needed.
     * 
     * AI-CAUTION: This method contains complex migration logic. When adding new
     * tables or modifying existing ones, you may need to add migration steps here.
     */
    async checkAndMigrate() {
        try {
            // Check if the old run_responses table exists
            const oldTable = await this.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='run_responses'"
            );
            
            if (oldTable) {
                console.log('Migrating data from run_responses to responses...');
                
                // Create the new table if it doesn't exist
                await this.run(SCHEMA.responses);
                
                // Copy data from old table to new table
                await this.run(`
                    INSERT INTO responses (run_id, payload_id, content, metadata, created_at)
                    SELECT run_id, payload_id, response_content, 
                           json_object('tokens_per_second', tokens_per_second, 'completion_time', completion_time),
                           created_at
                    FROM run_responses
                `);
                
                // Drop the old table
                await this.run('DROP TABLE run_responses');
                
                console.log('Migration completed successfully');
            }
            
            /* AI-EXTENSION-POINT: Add new migrations here when schema changes require
               moving data or altering table structures. Follow the pattern above of
               checking for old structures, migrating data, and updating schema. */
            
            // Check and fix runs table schema
            try {
                // First check if the runs table exists
                const runsTable = await this.get(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='runs'"
                );
                
                if (runsTable) {
                    console.log('Checking runs table schema...');
                    
                    // Check if started_at column exists before trying to add it
                    const columnInfo = await this.all(
                        "PRAGMA table_info(runs)"
                    );
                    
                    const startedAtExists = columnInfo.some(col => col.name === 'started_at');
                    
                    if (!startedAtExists) {
                        try {
                            await this.run(
                                "ALTER TABLE runs ADD COLUMN started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                            );
                            console.log('Added started_at column to runs table');
                        } catch (alterError) {
                            console.error('Error adding started_at column:', alterError.message);
                        }
                    } else {
                        console.log('Column started_at already exists in runs table');
                    }
                    
                    // Check if we need to test the table structure with an insert
                    let needsInsertTest = false;
                    
                    // Get existing columns from the runs table
                    const expectedColumns = ['id', 'workflow_id', 'status', 'started_at', 'completed_at', 'metadata'];
                    const missingColumns = expectedColumns.filter(column => 
                        !columnInfo.some(col => col.name === column)
                    );
                    
                    if (missingColumns.length > 0) {
                        console.log(`Possible schema issues with runs table. Missing columns: ${missingColumns.join(', ')}`);
                        needsInsertTest = true;
                    }
                    
                    // For more serious issues, recreate the entire table
                    if (needsInsertTest) {
                        try {
                            // Test if we can insert with the current schema
                            await this.run(
                                'INSERT INTO runs (workflow_id, status) VALUES (?, ?)',
                                [null, 'TEST']
                            );
                            
                            // If successful, delete the test record
                            await this.run('DELETE FROM runs WHERE status = ?', ['TEST']);
                            console.log('Runs table structure verified with test insert');
                        } catch (insertError) {
                            console.log('Detected serious issue with runs table, recreating...', insertError.message);
                            
                            // Backup existing data if possible
                            let existingRuns = [];
                            try {
                                existingRuns = await this.all('SELECT * FROM runs');
                            } catch (backupError) {
                                console.log('Could not backup existing runs data:', backupError.message);
                            }
                            
                            // Drop and recreate the table
                            await this.run('DROP TABLE IF EXISTS runs');
                            await this.run(SCHEMA.runs);
                            
                            // Try to restore data if we have backups
                            if (existingRuns.length > 0) {
                                for (const run of existingRuns) {
                                    try {
                                        await this.run(
                                            'INSERT INTO runs (id, workflow_id, status, completed_at, metadata) VALUES (?, ?, ?, ?, ?)',
                                            [run.id, run.workflow_id, run.status, run.completed_at, run.metadata]
                                        );
                                    } catch (restoreError) {
                                        console.log(`Could not restore run ID ${run.id}:`, restoreError.message);
                                    }
                                }
                            }
                            
                            console.log('Runs table recreated successfully');
                        }
                    }
                }
            } catch (runsError) {
                console.error('Error fixing runs table:', runsError);
            }
        } catch (error) {
            console.error('Error during migration:', error);
            // Continue anyway - this is not critical
        }
    }
    
    /**
     * Begin a transaction
     * @returns {Promise} - Promise resolving when transaction is started
     * 
     * AI-CONTEXT: This method begins an SQLite transaction. It's used for
     * operations that require multiple related database changes to be atomic.
     */
    async beginTransaction() {
        if (this.transactionActive) {
            throw new Error('Transaction already active');
        }
        await this.run('BEGIN TRANSACTION');
        this.transactionActive = true;
    }

    /**
     * Commit the current transaction
     * @returns {Promise} - Promise resolving when transaction is committed
     */
    async commitTransaction() {
        if (!this.transactionActive) {
            throw new Error('No active transaction to commit');
        }
        await this.run('COMMIT');
        this.transactionActive = false;
    }

    /**
     * Rollback the current transaction
     * @returns {Promise} - Promise resolving when transaction is rolled back
     */
    async rollbackTransaction() {
        if (!this.transactionActive) {
            throw new Error('No active transaction to rollback');
        }
        await this.run('ROLLBACK');
        this.transactionActive = false;
    }

    /**
     * Execute a SQL query with no results
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise resolving with the statement object
     * 
     * AI-CONTEXT: This method is used for INSERT, UPDATE, DELETE operations
     * where no result data is expected. It returns a statement object with
     * properties like lastID and changes.
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    return reject(err);
                }
                resolve(this);
            });
        });
    }
    
    /**
     * Execute a SQL query returning a single row
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise resolving with the row
     * 
     * AI-CONTEXT: This method is used for queries that should return a single
     * row, like SELECT with a unique ID. It returns null if no row is found.
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    return reject(err);
                }
                resolve(row);
            });
        });
    }
    
    /**
     * Execute a SQL query returning all rows
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise resolving with array of rows
     * 
     * AI-CONTEXT: This method is used for queries that return multiple rows,
     * like SELECT operations without a unique ID. It returns an empty array
     * if no rows are found.
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }
    
    /**
     * Close the database connection
     * @returns {Promise} - Promise resolving when connection is closed
     * 
     * AI-CONTEXT: This method is called during application shutdown to properly
     * close the database connection. It's important for preventing data corruption.
     */
    close() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

/* AI-CONTEXT: This creates and exports a singleton instance of the Database class.
   Throughout the application, this single instance is imported and used,
   ensuring consistent database state and preventing multiple connections. */
const database = new Database();
module.exports = database;