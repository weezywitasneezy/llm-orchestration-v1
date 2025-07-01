/**
 * LLM Orchestration Application
 * Main server file
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const database = require('./config/database');
const blockRoutes = require('./routes/blocks');
const payloadRoutes = require('./routes/payloads');
const workflowRoutes = require('./routes/workflows');
const executeRoutes = require('./routes/execute');
const llmRoutes = require('./routes/llm');
const runRoutes = require('./routes/runs');
const databaseRoutes = require('./routes/database');
const net = require('net');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Function to check if port is in use
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

// Function to kill process using port
async function killProcessOnPort(port) {
    try {
        const { exec } = require('child_process');
        const platform = process.platform;
        let command;

        if (platform === 'win32') {
            command = `netstat -ano | findstr :${port}`;
            exec(command, (error, stdout) => {
                if (error) {
                    console.error('Error finding process:', error);
                    return;
                }
                const lines = stdout.split('\n');
                for (const line of lines) {
                    const match = line.match(/\s+(\d+)$/);
                    if (match) {
                        const pid = match[1];
                        exec(`taskkill /F /PID ${pid}`, (err) => {
                            if (err) {
                                console.error('Error killing process:', err);
                            } else {
                                console.log(`Killed process ${pid} using port ${port}`);
                            }
                        });
                    }
                }
            });
        } else {
            command = `lsof -i :${port} | grep LISTEN | awk '{print $2}'`;
            exec(command, (error, stdout) => {
                if (error) {
                    console.error('Error finding process:', error);
                    return;
                }
                const pid = stdout.trim();
                if (pid) {
                    exec(`kill -9 ${pid}`, (err) => {
                        if (err) {
                            console.error('Error killing process:', err);
                        } else {
                            console.log(`Killed process ${pid} using port ${port}`);
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error killing process:', error);
    }
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connections
const clients = new Set();

// WebSocket broadcast function
function broadcast(message) {
    if (!message) {
        console.warn('Broadcast called with empty message');
        return;
    }
    
    try {
        const messageStr = JSON.stringify(message);
        console.log(`Broadcasting message: ${messageStr}`);
        
        let clientCount = 0;
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
                clientCount++;
            }
        });
        
        console.log(`Message sent to ${clientCount} connected clients`);
    } catch (error) {
        console.error('Error broadcasting message:', error);
    }
}

// Configure WebSocket server
wss.on('connection', (ws) => {
    // Add client to set
    clients.add(ws);
    console.log('Client connected');

    // Handle client messages
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Received:', parsedMessage);
            
            // Handle message types if needed
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// Middleware
app.use(express.json());

// Set proper MIME types for JavaScript files
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set broadcast function for routes
blockRoutes.setBroadcast(broadcast);
payloadRoutes.setBroadcast(broadcast);
workflowRoutes.setBroadcast(broadcast);
executeRoutes.setBroadcast(broadcast);
llmRoutes.setBroadcast(broadcast);
console.log('Setting up broadcast function for runRoutes...');
runRoutes.setBroadcast(broadcast);
databaseRoutes.setBroadcast(broadcast);

// API routes
app.use('/api/blocks', blockRoutes);
app.use('/api/payloads', payloadRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/execute', executeRoutes.router);
app.use('/api/llm', llmRoutes);
app.use('/api/runs', runRoutes.router);
app.use('/api/database', databaseRoutes);

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'An unexpected error occurred',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
async function startServer() {
    try {
        // Check if port is in use
        const portInUse = await isPortInUse(port);
        
        if (portInUse) {
            console.log(`Port ${port} is in use. Attempting to kill existing process...`);
            await killProcessOnPort(port);
            // Wait a moment for the port to be released
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Initialize database
        await database.initialize();
        
        // Start HTTP server
        server.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
            console.log('Press Ctrl+C to stop');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    
    // Close all WebSocket connections
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    });
    clients.clear();
    console.log('WebSocket connections closed');
    
    // Close WebSocket server
    wss.close(() => {
        console.log('WebSocket server closed');
    });
    
    // Close database connection
    try {
        await database.close();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing database:', err);
    }
    
    // Close HTTP server
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    
    // Force exit after timeout
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 5000);
});

// Handle other termination signals
process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM signal');
    process.emit('SIGINT');
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.emit('SIGINT');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.emit('SIGINT');
});

// Start the server
startServer();