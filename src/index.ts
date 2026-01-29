#!/usr/bin/env node

/**
 * PatternStack MCP Server
 *
 * Agent-optimized MCP server with semantic tool namespace:
 * - dependency.* - Package intelligence
 * - stack.* - Stack generation and validation
 * - migration.* - Migration planning
 * - architecture.* - Architecture evaluation
 * - signals.* - Reinforcement learning signals
 *
 * This server can run standalone or be called via the API.
 * Uses the same tool registry as the REST API.
 */

import * as dotenv from 'dotenv';
import { PatternStackServer } from './server.js';

dotenv.config({ quiet: true });

// Start server
const server = new PatternStackServer();
server.run().catch(console.error);
